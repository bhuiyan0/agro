import type { Transaction } from "@/generated/prisma/client";
import { fromDbDate, monthRange, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { TransactionInput } from "@/lib/schemas";
import type { SessionUser } from "@/lib/session";
import { memberProjectIds, requireMember, requirePlotInProject } from "@/server/access";

// Lists are capped so a phone never receives an unbounded response. With the
// month filter the app uses, a month of entries stays well below it.
export const LIST_LIMIT = 1000;

export function serializeTransaction(t: Transaction) {
  return {
    id: t.id,
    projectId: t.projectId,
    type: t.type,
    category: t.category,
    amount: t.amount.toFixed(2),
    note: t.note,
    plotId: t.plotId,
    date: fromDbDate(t.date),
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    updatedAt: t.updatedAt.toISOString(),
    deletedAt: t.deletedAt?.toISOString() ?? null,
  };
}

function toData(input: TransactionInput) {
  return {
    projectId: input.projectId,
    type: input.type,
    category: input.category,
    amount: input.amount,
    note: input.note,
    plotId: input.plotId,
    date: toDbDate(input.date),
  };
}

export async function listTransactions(
  user: SessionUser,
  filter: { projectId?: string; type?: "EXPENSE" | "INCOME"; month?: string },
) {
  const projectIds = filter.projectId
    ? [(await requireMember(user, filter.projectId)).id]
    : await memberProjectIds(user);
  const rows = await db.transaction.findMany({
    where: {
      projectId: { in: projectIds },
      deletedAt: null,
      type: filter.type,
      date: filter.month
        ? { gte: monthRange(filter.month).from, lt: monthRange(filter.month).to }
        : undefined,
    },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: LIST_LIMIT,
  });
  return rows.map(serializeTransaction);
}

async function findVisible(user: SessionUser, id: string) {
  const row = await db.transaction.findUnique({ where: { id } });
  if (!row) throw new HttpError("NOT_FOUND", 404);
  await requireMember(user, row.projectId);
  return row;
}

export async function getTransaction(user: SessionUser, id: string) {
  const row = await findVisible(user, id);
  if (row.deletedAt) throw new HttpError("NOT_FOUND", 404);
  return serializeTransaction(row);
}

/**
 * Create with the id the device generated. Sending the same create twice
 * returns the existing row instead of failing, so a retry after a lost
 * response is safe.
 */
export async function createTransaction(user: SessionUser, id: string, input: TransactionInput) {
  const existing = await db.transaction.findUnique({ where: { id } });
  if (existing) {
    if (existing.projectId !== input.projectId) throw new HttpError("ID_CONFLICT", 409);
    await requireMember(user, existing.projectId);
    return { created: false, row: serializeTransaction(existing) };
  }
  await requireMember(user, input.projectId, { write: true });
  await requirePlotInProject(input.plotId, input.projectId);
  const row = await db.transaction.create({
    data: { id, ...toData(input), createdBy: user.id, updatedBy: user.id },
  });
  return { created: true, row: serializeTransaction(row) };
}

export async function updateTransaction(user: SessionUser, id: string, input: TransactionInput) {
  const existing = await findVisible(user, id);
  if (existing.deletedAt) throw new HttpError("ROW_DELETED", 409);
  await requireMember(user, existing.projectId, { write: true });
  if (input.projectId !== existing.projectId) await requireMember(user, input.projectId, { write: true });
  await requirePlotInProject(input.plotId, input.projectId);
  const row = await db.transaction.update({ where: { id }, data: { ...toData(input), updatedBy: user.id } });
  return serializeTransaction(row);
}

/** Soft delete. Deleting an already deleted row succeeds and changes nothing. */
export async function deleteTransaction(user: SessionUser, id: string) {
  const existing = await findVisible(user, id);
  if (existing.deletedAt) return serializeTransaction(existing);
  await requireMember(user, existing.projectId, { write: true });
  const row = await db.transaction.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: user.id },
  });
  return serializeTransaction(row);
}
