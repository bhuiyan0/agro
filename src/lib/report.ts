// Report arithmetic, kept free of storage and UI so it can be tested on its
// own. Amounts are summed in paisa (integers) to avoid rounding drift.
//
// "All projects" must count each entry exactly once (CLAUDE.md section 7).
// Every entry belongs to exactly one project, so that is a plain sum over
// distinct entries; rows are de-duplicated by id anyway, so a row that
// reaches the report twice cannot be counted twice.

export type ReportRow = {
  id: string;
  projectId: string;
  type: "EXPENSE" | "INCOME";
  category: string;
  amount: string;
  date: string;
  deletedAt: string | null;
  _error?: string;
};

export type Totals = { expense: number; income: number; balance: number };
export type CategoryLine = { category: string; amount: number; share: number };
export type ProjectLine = { projectId: string } & Totals;
export type MonthLine = { month: string } & Totals;

const toPaisa = (amount: string) => Math.round(Number(amount) * 100);
const toTaka = (paisa: number) => paisa / 100;

/** Rows that count: not deleted, not refused by the server, each id once. */
export function countable<T extends ReportRow>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) if (!row.deletedAt && !row._error) byId.set(row.id, row);
  return [...byId.values()];
}

function totalsOf(rows: ReportRow[]): Totals {
  let expense = 0;
  let income = 0;
  for (const r of rows) {
    if (r.type === "EXPENSE") expense += toPaisa(r.amount);
    else income += toPaisa(r.amount);
  }
  return { expense: toTaka(expense), income: toTaka(income), balance: toTaka(income - expense) };
}

export function totals(rows: ReportRow[]): Totals {
  return totalsOf(countable(rows));
}

/** Amount per category for one type, largest first, with its share of the type's total (0-1). */
export function byCategory(rows: ReportRow[], type: ReportRow["type"]): CategoryLine[] {
  const sums = new Map<string, number>();
  let all = 0;
  for (const r of countable(rows)) {
    if (r.type !== type) continue;
    const p = toPaisa(r.amount);
    sums.set(r.category, (sums.get(r.category) ?? 0) + p);
    all += p;
  }
  return [...sums.entries()]
    .map(([category, p]) => ({ category, amount: toTaka(p), share: all ? p / all : 0 }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

/** Totals per project, in the order of `projectIds`; projects with no entries are included. */
export function byProject(rows: ReportRow[], projectIds: string[]): ProjectLine[] {
  const counted = countable(rows);
  return projectIds.map((projectId) => ({
    projectId,
    ...totalsOf(counted.filter((r) => r.projectId === projectId)),
  }));
}

/** Totals for each month in `months` ("YYYY-MM"), in that order. */
export function byMonth(rows: ReportRow[], months: string[]): MonthLine[] {
  const counted = countable(rows);
  return months.map((month) => ({
    month,
    ...totalsOf(counted.filter((r) => r.date.startsWith(`${month}-`))),
  }));
}
