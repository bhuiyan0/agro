import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizePhone, toAsciiDigits } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["01712345678", "01712345678"],
    ["+8801712345678", "01712345678"],
    ["8801712345678", "01712345678"],
    ["017-1234 5678", "01712345678"],
    ["০১৭১২৩৪৫৬৭৮", "01712345678"],
  ])("accepts %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "0171234567", "017123456789", "02712345678", "01212345678", "abc"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("toAsciiDigits", () => {
  it("converts Bengali digits and keeps other text", () => {
    expect(toAsciiDigits("৳ ১২৩৪.৫০")).toBe("৳ 1234.50");
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("গোপন-pass");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("গোপন-pass", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});
