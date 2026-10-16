import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "gh_session";

// Sessions last 90 days and slide: once fewer than 60 days remain, any
// authenticated request extends it to 90 days again. A phone that is used
// at least once a month therefore stays logged in indefinitely, and the
// offline client never needs the server to confirm the login.
const SESSION_DAYS = 90;
const RENEW_BELOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export type SessionUser = { id: string; name: string; phone: string };

/**
 * Resolve the session token to a user. Returns null for a missing, unknown or
 * expired token. `renewed` is set when the expiry was extended and the cookie
 * should be re-sent.
 */
export async function authenticate(
  token: string | undefined,
  now = new Date(),
): Promise<{ user: SessionUser; renewed?: { token: string; expiresAt: Date } } | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.expiresAt.getTime() - now.getTime() < RENEW_BELOW_DAYS * DAY_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
    await db.session.update({ where: { id: session.id }, data: { expiresAt } });
    return { user: session.user, renewed: { token, expiresAt } };
  }
  return { user: session.user };
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function getSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
