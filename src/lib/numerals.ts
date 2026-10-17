// Numeral style for display: Bengali digits (১২৩, the default) or English
// digits (123). A per-phone choice, stored in localStorage so it works
// offline. Stored values are always plain numbers; this only affects display.

export type NumeralStyle = "bengali" | "english";

const KEY = "gh.numerals";
const listeners = new Set<() => void>();
let current: NumeralStyle | null = null;

export function getNumeralStyle(): NumeralStyle {
  if (current) return current;
  try {
    current = localStorage.getItem(KEY) === "english" ? "english" : "bengali";
  } catch {
    current = "bengali";
  }
  return current;
}

export function setNumeralStyle(style: NumeralStyle) {
  current = style;
  try {
    localStorage.setItem(KEY, style);
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeNumerals(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The locale for Intl: Bengali words and grouping, with the chosen digits. */
export function numeralLocale(style = getNumeralStyle()): string {
  return style === "english" ? "bn-BD-u-nu-latn" : "bn-BD";
}

/**
 * Show every digit in `text` in the chosen style: fixed text ("১৫ মিনিট"),
 * phone numbers, and stored numbers put back into a form field.
 */
export function withDigits(text: string, style = getNumeralStyle()): string {
  return style === "bengali"
    ? text.replace(/[0-9]/g, (d) => String.fromCharCode(0x09e6 + Number(d)))
    : text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}
