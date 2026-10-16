// Offline sync (CLAUDE.md section 6).
//
// Push: the device sends its outbox, oldest first. Each mutation runs in its
// own database transaction together with its ProcessedMutation record, so it
// is applied exactly once however often it is sent. A rejected mutation never
// blocks the ones after it.
//
// Pull: rows changed since the device's cursor, deleted ones included, for
// the projects the user belongs to. Ordered by (updatedAt, id).
import { createHash } from "node:crypto";
import { z } from "zod";
import { db, getDb, inTransaction } from "@/lib/db";
import { HttpError, type ErrorCode } from "@/lib/http";
import { TransactionFields, WorkLogFields } from "@/lib/schemas";
import type { SessionUser } from "@/lib/session";
import { memberProjectIds, requireMember } from "@/server/access";
import { listProjects } from "@/server/projects";
import * as txns from "@/server/transactions";
import * as logs from "@/server/work-logs";

export const MAX_PUSH = 200;
export const PULL_LIMIT = 500;
// Rows are only handed out once they are a few seconds old. A row written by
// a transaction that commits slowly can carry an updatedAt older than rows
// already pulled; waiting lets those commits land before the cursor passes
// them. The device's own writes come back in the push results, so this
// delay only applies to the other phone's changes.
export const SETTLE_MS = 5000;

export const Mutation = z.object({
  mutationId: z.uuid(),
  entity: z.enum(["transaction", "workLog"]),
  op: z.enum(["create", "update", "delete"]),
  id: z.uuid(),
  // Checked per mutation below, so one bad entry is rejected on its own.
  data: z.unknown().optional(),
});
export type Mutation = z.infer<typeof Mutation>;

export const PushBody = z.object({ mutations: z.array(Mutation).max(MAX_PUSH) });

export type MutationStatus = "applied" | "conflict" | "rejected";
export type MutationResult = {
  mutationId: string;
  status: MutationStatus;
  code?: ErrorCode;
  /** Set when the same mutation was already processed earlier. */
  duplicate?: true;
  /** The row as the server now has it, when the user can see it. */
  row?: Record<string, unknown> | null;
};

const services = {
  transaction: {
    fields: TransactionFields,
    create: txns.createTransaction,
    update: txns.updateTransaction,
    remove: txns.deleteTransaction,
    find: (id: string) => getDb().transaction.findUnique({ where: { id } }),
    serialize: txns.serializeTransaction,
  },
  workLog: {
    fields: WorkLogFields,
    create: logs.createWorkLog,
    update: logs.updateWorkLog,
    remove: logs.deleteWorkLog,
    find: (id: string) => getDb().workLog.findUnique({ where: { id } }),
    serialize: logs.serializeWorkLog,
  },
} as const;

/** The current server row, or null when it does not exist or the user may not see it. */
async function visibleRow(user: SessionUser, m: Mutation) {
  const s = services[m.entity];
  const row = await s.find(m.id);
  if (!row) return null;
  try {
    await requireMember(user, row.projectId);
  } catch {
    return null;
  }
  // Both serializers accept their own row type; the union is safe here.
  return (s.serialize as (r: typeof row) => Record<string, unknown>)(row);
}

async function apply(user: SessionUser, m: Mutation): Promise<Record<string, unknown>> {
  const s = services[m.entity];
  if (m.op === "delete") return s.remove(user, m.id);
  const parsed = s.fields.safeParse(m.data);
  if (!parsed.success) throw new HttpError("VALIDATION_FAILED", 400);
  if (m.op === "create") {
    // @ts-expect-error parsed.data matches the entity's own input type.
    return (await s.create(user, m.id, parsed.data)).row;
  }
  // @ts-expect-error parsed.data matches the entity's own input type.
  return s.update(user, m.id, parsed.data);
}

async function pushOne(user: SessionUser, m: Mutation): Promise<MutationResult> {
  const done = await db.processedMutation.findUnique({ where: { mutationId: m.mutationId } });
  if (done) {
    // A mutation id belongs to the user who first sent it.
    if (done.userId !== user.id) return { mutationId: m.mutationId, status: "rejected", code: "FORBIDDEN" };
    return {
      mutationId: m.mutationId,
      status: done.status as MutationStatus,
      code: (done.code as ErrorCode | null) ?? undefined,
      duplicate: true,
      row: await visibleRow(user, m),
    };
  }

  try {
    const row = await inTransaction(async () => {
      const result = await apply(user, m);
      await getDb().processedMutation.create({
        data: { mutationId: m.mutationId, userId: user.id, status: "applied" },
      });
      return result;
    });
    return { mutationId: m.mutationId, status: "applied", row };
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    // An update to a row that was deleted (on this or the other phone) keeps
    // it deleted. That is a conflict, reported with the deleted row.
    const status: MutationStatus = err.code === "ROW_DELETED" ? "conflict" : "rejected";
    await db.processedMutation.create({
      data: { mutationId: m.mutationId, userId: user.id, status, code: err.code },
    });
    return { mutationId: m.mutationId, status, code: err.code, row: await visibleRow(user, m) };
  }
}

/**
 * Apply mutations in the order sent. Validation and permission problems are
 * returned per mutation. Any other error (database down) aborts the request;
 * the device retries the whole batch, and mutations already applied come
 * back as duplicates.
 */
export async function push(user: SessionUser, mutations: Mutation[]): Promise<MutationResult[]> {
  const results: MutationResult[] = [];
  for (const m of mutations) results.push(await pushOne(user, m));
  return results;
}

// --- Pull ---------------------------------------------------------------

type Position = [updatedAt: string, id: string] | null;
type Cursor = { v: 1; scope: string; t: Position; w: Position };

const CursorSchema = z.object({
  v: z.literal(1),
  scope: z.string(),
  t: z.tuple([z.iso.datetime(), z.uuid()]).nullable(),
  w: z.tuple([z.iso.datetime(), z.uuid()]).nullable(),
});

/** A short fingerprint of the user's project set. */
function scopeOf(projectIds: string[]): string {
  return createHash("sha256")
    .update([...projectIds].sort().join(","))
    .digest("base64url")
    .slice(0, 16);
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = CursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function afterPosition(position: Position) {
  if (!position) return {};
  const at = new Date(position[0]);
  return { OR: [{ updatedAt: { gt: at } }, { updatedAt: at, id: { gt: position[1] } }] };
}

/**
 * One page of changes since `cursorValue`. When the user's set of projects
 * has changed since the cursor was issued (added to or removed from a
 * project), the pull starts over from the beginning and `reset` is true: the
 * device must then replace its local copy instead of merging.
 */
export async function pull(
  user: SessionUser,
  cursorValue: string | undefined,
  opts: { limit?: number; settleMs?: number } = {},
) {
  const limit = opts.limit ?? PULL_LIMIT;
  const settleMs = opts.settleMs ?? SETTLE_MS;
  const projectIds = await memberProjectIds(user);
  const scope = scopeOf(projectIds);
  const given = decodeCursor(cursorValue);
  const reset = !given || given.scope !== scope;
  const cursor: Cursor = reset ? { v: 1, scope, t: null, w: null } : given;

  // The database clock decides what has settled, not this server's clock.
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
  const settled = new Date(now.getTime() - settleMs);

  const page = async <R extends { updatedAt: Date; id: string }>(
    find: (args: object) => Promise<R[]>,
    position: Position,
  ) => {
    const rows = await find({
      where: { projectId: { in: projectIds }, updatedAt: { lte: settled }, ...afterPosition(position) },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: limit + 1,
    });
    const more = rows.length > limit;
    const kept = rows.slice(0, limit);
    const last = kept.at(-1);
    return {
      rows: kept,
      more,
      position: last ? ([last.updatedAt.toISOString(), last.id] as Position) : position,
    };
  };

  const t = await page((args) => db.transaction.findMany(args), cursor.t);
  const w = await page((args) => db.workLog.findMany(args), cursor.w);

  return {
    reset,
    hasMore: t.more || w.more,
    // Rows changed after this moment are not in this pull yet.
    settledAt: settled.toISOString(),
    cursor: encodeCursor({ v: 1, scope, t: t.position, w: w.position }),
    transactions: t.rows.map(txns.serializeTransaction),
    workLogs: w.rows.map(logs.serializeWorkLog),
    // Small, so always sent in full: names, archive state and roles.
    projects: await listProjects(user),
  };
}
