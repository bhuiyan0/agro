/** Group rows by their `date`, keeping the order they arrive in (newest first from the API). */
export function groupByDate<T extends { date: string }>(rows: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.date);
    if (list) list.push(row);
    else groups.set(row.date, [row]);
  }
  return [...groups.entries()];
}
