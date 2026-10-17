import { describe, expect, it } from "vitest";
import { byCategory, byMonth, byProject, totals, type ReportRow } from "@/lib/report";

let n = 0;
function row(overrides: Partial<ReportRow>): ReportRow {
  return {
    id: `r${n++}`,
    projectId: "garden",
    type: "EXPENSE",
    category: "মজুরি",
    amount: "100.00",
    date: "2026-10-05",
    deletedAt: null,
    ...overrides,
  };
}

describe("reports", () => {
  const rows = [
    row({ amount: "500.50" }),
    row({ category: "সার", amount: "1200" }),
    row({ projectId: "farm", amount: "300" }),
    row({ projectId: "farm", type: "INCOME", category: "বিক্রি", amount: "5000" }),
    row({ amount: "999", deletedAt: "2026-10-06T00:00:00Z" }), // deleted
    row({ amount: "777", _error: "PROJECT_ARCHIVED" }), // refused by the server
    row({ date: "2026-09-30", amount: "50" }),
  ];

  it("totals leave out deleted and refused entries", () => {
    expect(totals(rows)).toEqual({ expense: 2050.5, income: 5000, balance: 2949.5 });
  });

  it("all projects equals the sum of each project, with every entry counted once", () => {
    const october = rows.filter((r) => r.date.startsWith("2026-10"));
    const all = totals(october);
    const perProject = byProject(october, ["garden", "farm", "empty"]);
    expect(perProject.map((p) => p.projectId)).toEqual(["garden", "farm", "empty"]);
    expect(perProject[2]).toEqual({ projectId: "empty", expense: 0, income: 0, balance: 0 });
    const sum = perProject.reduce(
      (acc, p) => ({ expense: acc.expense + p.expense, income: acc.income + p.income }),
      {
        expense: 0,
        income: 0,
      },
    );
    expect(sum).toEqual({ expense: all.expense, income: all.income });
  });

  it("a row that arrives twice is still counted once", () => {
    const one = row({ amount: "250" });
    expect(totals([one, { ...one }]).expense).toBe(250);
  });

  it("splits by category, largest first, with shares", () => {
    const lines = byCategory(rows, "EXPENSE");
    expect(lines.map((l) => [l.category, l.amount])).toEqual([
      ["সার", 1200],
      ["মজুরি", 850.5],
    ]);
    expect(lines[0].share + lines[1].share).toBeCloseTo(1);
    expect(byCategory([], "INCOME")).toEqual([]);
  });

  it("groups by month, including months without entries", () => {
    expect(byMonth(rows, ["2026-08", "2026-09", "2026-10"])).toEqual([
      { month: "2026-08", expense: 0, income: 0, balance: 0 },
      { month: "2026-09", expense: 50, income: 0, balance: -50 },
      { month: "2026-10", expense: 2000.5, income: 5000, balance: 2999.5 },
    ]);
  });

  it("adds paisa without floating-point drift", () => {
    const many = Array.from({ length: 10 }, () => row({ amount: "0.10" }));
    expect(totals(many).expense).toBe(1);
  });
});
