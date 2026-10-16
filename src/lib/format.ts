// Display formatting. Numbers are shown in Bengali digits with Bangladeshi
// grouping (১২,৩৪,৫৬৭). The numeral-style setting arrives in milestone 5;
// it will switch the locale used here.
const LOCALE = "bn-BD";

const intFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });

export function formatNumber(value: number | string): string {
  const n = Number(value);
  return Number.isInteger(n) ? intFormat.format(n) : decFormat.format(n);
}

/** "৳ ১,২৫০" or "৳ ১,২৫০.৫০". */
export function formatAmount(value: number | string): string {
  return `৳ ${formatNumber(value)}`;
}

/** "শুক্র, ১৬ অক্টোবর, ২০২৬" for "2026-10-16". */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "অক্টোবর ২০২৬" for "2026-10". */
export function formatMonth(isoMonth: string): string {
  return monthFormat.format(new Date(`${isoMonth}-01T00:00:00Z`));
}

/** Add months to "YYYY-MM". */
export function shiftMonth(isoMonth: string, delta: number): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Sum amount strings in paisa to avoid floating-point drift, returned in taka. */
export function sumAmounts(amounts: string[]): number {
  const paisa = amounts.reduce((acc, a) => acc + Math.round(Number(a) * 100), 0);
  return paisa / 100;
}
