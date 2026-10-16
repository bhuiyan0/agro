// Bengali text for API error codes. The API never returns UI text.
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_JSON: "অনুরোধটি ঠিক নেই। আবার চেষ্টা করুন।",
  VALIDATION_FAILED: "তথ্যগুলো ঠিকমতো পূরণ করুন।",
  INVALID_CREDENTIALS: "ফোন নম্বর বা পাসওয়ার্ড ভুল।",
  ACCOUNT_LOCKED: "বারবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।",
  UNAUTHENTICATED: "আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NOT_FOUND: "খুঁজে পাওয়া যায়নি।",
  NETWORK: "ইন্টারনেট সংযোগ নেই। সংযোগ পেলে আবার চেষ্টা করুন।",
  UNKNOWN: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
};

export function errorMessage(code: string | undefined): string {
  return ERROR_MESSAGES[code ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN;
}
