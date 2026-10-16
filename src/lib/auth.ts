import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, HttpError } from "@/lib/http";
import { getDummyHash, verifyPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";
import {
  authenticate,
  createSession,
  getSessionToken,
  setSessionCookie,
  type SessionUser,
} from "@/lib/session";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export type LoginResult =
  | { ok: true; user: SessionUser; token: string; expiresAt: Date }
  | { ok: false; reason: "INVALID_CREDENTIALS" }
  | { ok: false; reason: "ACCOUNT_LOCKED"; lockedUntil: Date };

/**
 * Check a phone number and password. After MAX_FAILED_LOGINS wrong passwords
 * in a row the account is locked for LOCKOUT_MINUTES.
 */
export async function login(phoneInput: string, password: string, now = new Date()): Promise<LoginResult> {
  const phone = normalizePhone(phoneInput);
  const user = phone ? await db.user.findUnique({ where: { phone } }) : null;

  if (!user) {
    // Spend the same time as a real check so unknown numbers are not revealed.
    await verifyPassword(password, await getDummyHash());
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, reason: "ACCOUNT_LOCKED", lockedUntil: user.lockedUntil };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } }),
    db.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } }),
  ]);
  const { token, expiresAt } = await createSession(user.id, now);
  return {
    ok: true,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    token,
    expiresAt,
  };
}

/**
 * Wrap a route handler so it only runs for a logged-in user. Every API
 * endpoint except login must go through this; the UI hiding things is never
 * the access check.
 */
export function withAuth<Ctx>(
  handler: (request: NextRequest, user: SessionUser, ctx: Ctx) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    const auth = await authenticate(getSessionToken(request));
    if (!auth) return apiError("UNAUTHENTICATED", 401);
    let response: NextResponse;
    try {
      response = await handler(request, auth.user, ctx);
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      response = apiError(err.code, err.status);
    }
    if (auth.renewed) setSessionCookie(response, auth.renewed.token, auth.renewed.expiresAt);
    return response;
  };
}
