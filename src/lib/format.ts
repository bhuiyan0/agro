// Display formatting. Numbers use Bangladeshi grouping (১২,৩৪,৫৬৭) and the
// digits chosen in Settings (Bengali by default, see numerals.ts).
import { numeralLocale } from "@/lib/numerals";

type Formatters = {
  int: Intl.NumberFormat;
  dec: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
  month: Intl.DateTimeFormat;
};
const cache = new Map<string, Formatters>();

function formatters(): Formatters {
  const locale = numeralLocale();
  let f = cache.get(locale);
  if (!f) {
    f = {
      int: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
      dec: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      date: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    };
    cache.set(locale, f);
  }
  return f;
}

export function formatNumber(value: number | string): string {
  const n = Number(value);
  const f = formatters();
  return Number.isInteger(n) ? f.int.format(n) : f.dec.format(n);
}

/** "৳ ১,২৫০" or "৳ ১,২৫০.৫০". */
export function formatAmount(value: number | string): string {
  return `৳ ${formatNumber(value)}`;
}

/** "শুক্র, ১৬ অক্টোবর, ২০২৬" for "2026-10-16". */
export function formatDate(isoDate: string): string {
  return formatters().date.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "অক্টোবর ২০২৬" for "2026-10". */
export function formatMonth(isoMonth: string): string {
  return formatters().month.format(new Date(`${isoMonth}-01T00:00:00Z`));
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

/** Balance with an explicit sign: "+ ৳ ১,২০০" or "− ৳ ৩০০". */
export function formatBalance(value: number): string {
  if (value === 0) return formatAmount(0);
  return `${value > 0 ? "+" : "−"} ${formatAmount(Math.abs(value))}`;
}

/** A 0-1 share as a whole percentage: "৪২%". */
export function formatShare(share: number): string {
  return `${formatNumber(Math.round(share * 100))}%`;
}
