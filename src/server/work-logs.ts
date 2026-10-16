import type { WorkLog } from "@/generated/prisma/client";
import { fromDbDate, monthRange, toDbDate } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { WorkLogInput } from "@/lib/schemas";
import type { SessionUser } from "@/lib/session";
import { memberProjectIds, requireMember, requirePlotInProject } from "@/server/access";
import { LIST_LIMIT } from "@/server/transactions";

// Same rules as transactions: device-generated ids, idempotent create, soft
// delete, archived projects read-only.

export function serializeWorkLog(t: WorkLog) {
  return {
    id: t.id,
    projectId: t.projectId,
    workType: t.workType,
    workers: t.workers,
    hours: t.hours?.toFixed(2) ?? null,
    note: t.note,
    plotId: t.plotId,
    date: fromDbDate(t.date),
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    updatedAt: t.updatedAt.toISOString(),
    deletedAt: t.deletedAt?.toISOString() ?? null,
  };
}

function toData(input: WorkLogInput) {
  return {
    projectId: input.projectId,
    workType: input.workType,
    workers: input.workers,
    hours: input.hours,
    note: input.note,
    plotId: input.plotId,
    date: toDbDate(input.date),
  };
}

export async function listWorkLogs(
  user: SessionUser,
  filter: { projectId?: string; workType?: string; month?: string },
) {
  const projectIds = filter.projectId
    ? [(await requireMember(user, filter.projectId)).id]
    : await memberProjectIds(user);
  const rows = await getDb().workLog.findMany({
    where: {
      projectId: { in: projectIds },
      deletedAt: null,
      workType: filter.workType,
      date: filter.month
        ? { gte: monthRange(filter.month).from, lt: monthRange(filter.month).to }
        : undefined,
    },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: LIST_LIMIT,
  });
  return rows.map(serializeWorkLog);
}

async function findVisible(user: SessionUser, id: string) {
  const row = await getDb().workLog.findUnique({ where: { id } });
  if (!row) throw new HttpError("NOT_FOUND", 404);
  await requireMember(user, row.projectId);
  return row;
}

export async function getWorkLog(user: SessionUser, id: string) {
  const row = await findVisible(user, id);
  if (row.deletedAt) throw new HttpError("NOT_FOUND", 404);
  return serializeWorkLog(row);
}

/**
 * Create with the id the device generated. Sending the same create twice
 * returns the existing row instead of failing, so a retry after a lost
 * response is safe.
 */
export async function createWorkLog(user: SessionUser, id: string, input: WorkLogInput) {
  const existing = await getDb().workLog.findUnique({ where: { id } });
  if (existing) {
    if (existing.projectId !== input.projectId) throw new HttpError("ID_CONFLICT", 409);
    await requireMember(user, existing.projectId);
    return { created: false, row: serializeWorkLog(existing) };
  }
  await requireMember(user, input.projectId, { write: true });
  await requirePlotInProject(input.plotId, input.projectId);
  const row = await getDb().workLog.create({
    data: { id, ...toData(input), createdBy: user.id, updatedBy: user.id },
  });
  return { created: true, row: serializeWorkLog(row) };
}

export async function updateWorkLog(user: SessionUser, id: string, input: WorkLogInput) {
  const existing = await findVisible(user, id);
  if (existing.deletedAt) throw new HttpError("ROW_DELETED", 409);
  await requireMember(user, existing.projectId, { write: true });
  if (input.projectId !== existing.projectId) await requireMember(user, input.projectId, { write: true });
  await requirePlotInProject(input.plotId, input.projectId);
  const row = await getDb().workLog.update({ where: { id }, data: { ...toData(input), updatedBy: user.id } });
  return serializeWorkLog(row);
}

/** Soft delete. Deleting an already deleted row succeeds and changes nothing. */
export async function deleteWorkLog(user: SessionUser, id: string) {
  const existing = await findVisible(user, id);
  if (existing.deletedAt) return serializeWorkLog(existing);
  await requireMember(user, existing.projectId, { write: true });
  const row = await getDb().workLog.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: user.id },
  });
  return serializeWorkLog(row);
}
