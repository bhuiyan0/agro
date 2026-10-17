const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Replace Bengali digits (০-৯) with ASCII digits. Other characters are kept. */
export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

/**
 * Normalize a Bangladeshi mobile number to the 11-digit local form
 * (01XXXXXXXXX). Accepts Bengali digits, spaces, dashes and the +880 / 880
 * prefix. Returns null when the input is not a valid mobile number.
 */
export function normalizePhone(input: string): string | null {
  let digits = toAsciiDigits(input).replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("880")) digits = digits.slice(2);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}
