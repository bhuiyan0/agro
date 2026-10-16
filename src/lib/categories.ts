// Preset lists for fast picking, confirmed by the owner on 2026-10-16.
// A constants file for now; they can move to a table later. Entries keep the
// stored text, so renaming an item here does not change old entries.

export const EXPENSE_CATEGORIES = [
  "মজুরি",
  "সার",
  "ওষুধ/স্প্রে",
  "বীজ/চারা",
  "পরিবহন",
  "সেচ",
  "যন্ত্রপাতি",
  "অন্যান্য",
] as const;

export const INCOME_CATEGORIES = ["বিক্রি", "অন্যান্য"] as const;

export const WORK_TYPES = [
  "সেচ",
  "আগাছা পরিষ্কার",
  "সার দেওয়া",
  "স্প্রে",
  "সংগ্রহ",
  "ছাঁটাই",
  "অন্যান্য",
] as const;

export type TxnTypeName = "EXPENSE" | "INCOME";

export function categoriesFor(type: TxnTypeName): readonly string[] {
  return type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}
