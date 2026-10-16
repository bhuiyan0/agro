// Entries carry a calendar date only ("YYYY-MM-DD"), with no time of day.
// In the database it is a DATE column; Prisma hands it over as a Date at
// 00:00 UTC, so all conversions here work in UTC to avoid shifting the day.

export const TIME_ZONE = "Asia/Dhaka";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isIsoMonth(value: string): boolean {
  return ISO_MONTH.test(value) && isIsoDate(`${value}-01`);
}

export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** First day of the month and first day of the next month, for a [from, to) range. */
export function monthRange(isoMonth: string): { from: Date; to: Date } {
  const [y, m] = isoMonth.split("-").map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

/** Today's date in Bangladesh, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** The calendar day before "YYYY-MM-DD". */
export function previousDay(isoDate: string): string {
  const d = toDbDate(isoDate);
  d.setUTCDate(d.getUTCDate() - 1);
  return fromDbDate(d);
}
