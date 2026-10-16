import { describe, expect, it } from "vitest";
import { isIsoDate, isIsoMonth, monthRange, previousDay, todayIso } from "@/lib/dates";
import { formatAmount, formatMonth, shiftMonth, sumAmounts } from "@/lib/format";
import { groupByDate } from "@/lib/group";

describe("dates", () => {
  it("uses the Bangladesh date, not UTC", () => {
    // 20:00 UTC on 16 October is 02:00 on 17 October in Dhaka (UTC+6).
    expect(todayIso(new Date("2026-10-16T20:00:00Z"))).toBe("2026-10-17");
  });

  it("validates dates and months", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("16-10-2026")).toBe(false);
    expect(isIsoMonth("2026-12")).toBe(true);
    expect(isIsoMonth("2026-13")).toBe(false);
  });

  it("computes month ranges and previous days across boundaries", () => {
    expect(monthRange("2026-12").to.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("format", () => {
  it("formats amounts in Bengali digits with Bangladeshi grouping", () => {
    expect(formatAmount("1234567.50")).toBe("৳ ১২,৩৪,৫৬৭.৫০");
    expect(formatAmount("1250.00")).toBe("৳ ১,২৫০");
    expect(formatMonth("2026-10")).toBe("অক্টোবর ২০২৬");
  });

  it("sums amounts without floating-point drift", () => {
    expect(sumAmounts(["0.10", "0.20"])).toBe(0.3);
    expect(sumAmounts([])).toBe(0);
  });

  it("groups rows by date in arrival order", () => {
    const groups = groupByDate([
      { id: 1, date: "2026-10-16" },
      { id: 2, date: "2026-10-15" },
      { id: 3, date: "2026-10-16" },
    ]);
    expect(groups.map(([d, rows]) => [d, rows.map((r) => r.id)])).toEqual([
      ["2026-10-16", [1, 3]],
      ["2026-10-15", [2]],
    ]);
  });
});
