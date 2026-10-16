// Push the outbox, then pull changes. Used by the app and by the service
// worker (Background Sync), so this file must not touch React or `window`.
//
// Rules from CLAUDE.md section 6:
// - Never lose a local entry: an outbox entry is removed only after the
//   server has answered for it.
// - A network or server failure leaves the outbox as it was; the caller
//   retries later.
// - A permanent rejection is kept on the row (`_error`) so the user can fix it.
import {
  getMeta,
  localDb,
  setMeta,
  tableFor,
  type LocalFlags,
  type Notice,
  type OutboxEntry,
} from "@/client/local-db";
import type { Me } from "@/lib/api-client";

const PUSH_BATCH = 100;

/** The session is gone; the user must log in again. The outbox is kept. */
export class AuthError extends Error {}
/** No network or the server failed. Safe to retry. */
export class TransientError extends Error {}

type ServerRow = Record<string, unknown> & { id: string };
type PushResult = {
  mutationId: string;
  status: "applied" | "conflict" | "rejected";
  code?: string;
  row?: ServerRow | null;
};
type PullPage = {
  reset: boolean;
  hasMore: boolean;
  settledAt: string;
  cursor: string;
  transactions: ServerRow[];
  workLogs: ServerRow[];
  projects: Me["projects"];
};

const synced = (row: ServerRow) =>
  ({ ...row, _pending: 0, _synced: 1, _error: undefined }) as ServerRow & LocalFlags;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new TransientError("network");
  }
  if (res.status === 401) throw new AuthError("unauthenticated");
  if (!res.ok) throw new TransientError(`http ${res.status}`);
  return res.json() as Promise<T>;
}

async function addNotice(notice: Notice) {
  const notices = (await getMeta("notices")) ?? [];
  await setMeta("notices", [...notices.slice(-19), notice]);
}

async function applyResult(entry: OutboxEntry, result: PushResult) {
  const table = tableFor(entry.entity);
  await localDb.transaction(
    "rw",
    [localDb.transactions, localDb.workLogs, localDb.outbox, localDb.meta],
    async () => {
      await localDb.outbox.delete(entry.seq!);
      const laterChanges = await localDb.outbox.where("id").equals(entry.id).count();
      const local = await table.get(entry.id);

      if (result.status === "applied") {
        // Later local edits win over this server copy until they are pushed too.
        if (laterChanges === 0 && result.row) await table.put(synced(result.row) as never);
        else if (local) await table.update(entry.id, { _synced: 1 });
        return;
      }

      if (result.status === "conflict") {
        // Edited here, deleted on the other phone: the delete stands.
        if (result.row) await table.put(synced(result.row) as never);
        await addNotice({
          id: entry.id,
          entity: entry.entity,
          code: result.code ?? "ROW_DELETED",
          at: new Date().toISOString(),
        });
        return;
      }

      // Rejected. A refused delete means the row still exists on the server,
      // so show it again; a refused create or edit stays as typed, marked, so
      // the user can correct it or discard it.
      if (entry.op === "delete" && result.row) {
        await table.put(synced(result.row) as never);
        await addNotice({
          id: entry.id,
          entity: entry.entity,
          code: result.code ?? "UNKNOWN",
          at: new Date().toISOString(),
        });
      } else if (local) {
        await table.update(entry.id, {
          _error: result.code ?? "UNKNOWN",
          _pending: laterChanges > 0 ? 1 : 0,
        });
      }
    },
  );
}

/** Send the outbox, oldest first, until it is empty. */
export async function pushAll() {
  for (;;) {
    const batch = await localDb.outbox.orderBy("seq").limit(PUSH_BATCH).toArray();
    if (batch.length === 0) return;
    const { results } = await request<{ results: PushResult[] }>("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mutations: batch.map(({ mutationId, entity, op, id, data }) => ({
          mutationId,
          entity,
          op,
          id,
          data,
        })),
      }),
    });
    const byId = new Map(results.map((r) => [r.mutationId, r]));
    for (const entry of batch) {
      const result = byId.get(entry.mutationId);
      // The server answers every mutation; a missing answer is retried next time.
      if (!result) throw new TransientError("missing result");
      await applyResult(entry, result);
    }
  }
}

/**
 * Fetch changes since the stored cursor, all pages.
 *
 * When the server starts over (`reset`), the local copy is replaced: after
 * the last page, synced rows the server did not send are removed. Rows
 * changed after the server's settle cutoff are kept, since they were not
 * due in this pull (a row this phone just pushed is one). The new cursor is
 * stored only when the whole restart has arrived, so an interrupted restart
 * begins again instead of leaving stale rows behind.
 */
export async function pullAll() {
  let cursor = await getMeta("cursor");
  let restart: { seen: Set<string>; settledAt: string } | null = null;
  for (;;) {
    const page = await request<PullPage>(
      `/api/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    if (page.reset) restart = { seen: new Set(), settledAt: page.settledAt };
    const last = !page.hasMore;
    await localDb.transaction(
      "rw",
      [localDb.transactions, localDb.workLogs, localDb.outbox, localDb.meta],
      async () => {
        const waiting = new Set((await localDb.outbox.toArray()).map((e) => e.id));
        for (const [table, rows] of [
          [localDb.transactions, page.transactions],
          [localDb.workLogs, page.workLogs],
        ] as const) {
          for (const row of rows) {
            restart?.seen.add(row.id);
            if (waiting.has(row.id)) continue;
            const local = await table.get(row.id);
            if (local?._error) continue;
            await table.put(synced(row) as never);
          }
          if (restart && last) {
            const { seen, settledAt } = restart;
            await table
              .filter(
                (r) =>
                  !seen.has(r.id) &&
                  r._pending === 0 &&
                  !r._error &&
                  !waiting.has(r.id) &&
                  r.updatedAt <= settledAt,
              )
              .delete();
          }
        }
        if (!restart || last) await setMeta("cursor", page.cursor);
        const me = await getMeta("me");
        if (me) await setMeta("me", { ...me, projects: page.projects });
      },
    );
    cursor = page.cursor;
    if (last) break;
  }
  await setMeta("lastSync", new Date().toISOString());
}

/**
 * One full sync. Only one runs at a time across the app's tabs and the
 * service worker, where the browser supports Web Locks; elsewhere the server's
 * idempotent push makes an overlap harmless.
 */
export async function syncOnce(): Promise<void> {
  const run = async () => {
    await pushAll();
    await pullAll();
  };
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (!locks) return run();
  await locks.request("green-hill-sync", run);
}
