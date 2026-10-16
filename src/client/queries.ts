// Read helpers for the screens. Deleted rows stay in the local tables (so
// sync knows about them) and are filtered out here.
import { localDb, type LocalTransaction, type LocalWorkLog } from "@/client/local-db";
import { shiftMonth } from "@/lib/format";

function byNewest<T extends { date: string; updatedAt: string }>(a: T, b: T) {
  return a.date === b.date ? b.updatedAt.localeCompare(a.updatedAt) : b.date.localeCompare(a.date);
}

/** Entries dated within "YYYY-MM", optionally for one project. */
export async function transactionsInMonth(
  month: string,
  projectId: string | null,
): Promise<LocalTransaction[]> {
  const rows = await localDb.transactions
    .where("date")
    .between(`${month}-01`, `${shiftMonth(month, 1)}-01`, true, false)
    .filter((t) => !t.deletedAt && (!projectId || t.projectId === projectId))
    .toArray();
  return rows.sort(byNewest);
}

export async function workLogsInMonth(month: string, projectId: string | null): Promise<LocalWorkLog[]> {
  const rows = await localDb.workLogs
    .where("date")
    .between(`${month}-01`, `${shiftMonth(month, 1)}-01`, true, false)
    .filter((w) => !w.deletedAt && (!projectId || w.projectId === projectId))
    .toArray();
  return rows.sort(byNewest);
}
