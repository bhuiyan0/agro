import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { login, MAX_FAILED_LOGINS } from "@/lib/auth";
import { db } from "@/lib/db";
import { authenticate, createSession, hashToken, SESSION_COOKIE } from "@/lib/session";
import { createUser, getRequest, jsonRequest, resetDb } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("POST /api/auth/login", () => {
  it("logs in with a valid phone and password and sets an httpOnly cookie", async () => {
    await createUser("01711111111", "secret-pass", "Mamun");
    const res = await loginRoute(
      jsonRequest("/api/auth/login", { phone: "+880 1711-111111", password: "secret-pass" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ name: "Mamun", phone: "01711111111" });

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    // Only the hash of the token is stored.
    expect(await db.session.count({ where: { tokenHash: hashToken(cookie!.value) } })).toBe(1);
    expect(await db.session.count({ where: { tokenHash: cookie!.value } })).toBe(0);
  });

  it("returns the same error for a wrong password and an unknown phone", async () => {
    await createUser();
    const wrong = await loginRoute(
      jsonRequest("/api/auth/login", { phone: "01711111111", password: "nope" }),
    );
    const unknown = await loginRoute(
      jsonRequest("/api/auth/login", { phone: "01999999999", password: "nope" }),
    );
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("rejects a malformed body", async () => {
    expect((await loginRoute(jsonRequest("/api/auth/login", "{not json"))).status).toBe(400);
    const res = await loginRoute(jsonRequest("/api/auth/login", { phone: "01711111111" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_FAILED");
  });

  it("locks the account after repeated wrong passwords, then unlocks", async () => {
    await createUser();
    const now = new Date();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      expect((await login("01711111111", "wrong", now)).ok).toBe(false);
    }
    const locked = await login("01711111111", "secret-pass", now);
    expect(locked).toMatchObject({ ok: false, reason: "ACCOUNT_LOCKED" });

    const later = new Date(now.getTime() + 16 * 60 * 1000);
    expect((await login("01711111111", "secret-pass", later)).ok).toBe(true);
  });

  it("returns 429 with Retry-After while locked", async () => {
    const user = await createUser();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 60_000) } });
    const res = await loginRoute(
      jsonRequest("/api/auth/login", { phone: "01711111111", password: "secret-pass" }),
    );
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/me", () => {
  it("rejects a request without a session", async () => {
    expect((await meRoute(getRequest("/api/auth/me"), {})).status).toBe(401);
    expect((await meRoute(getRequest("/api/auth/me", "made-up-token"), {})).status).toBe(401);
  });

  it("returns the user and only their non-deleted projects with roles", async () => {
    const user = await createUser();
    const other = await createUser("01722222222");
    const mine = await db.project.create({ data: { name: "বাগানের ফল" } });
    const deleted = await db.project.create({ data: { name: "পুরনো", deletedAt: new Date() } });
    const notMine = await db.project.create({ data: { name: "অন্য" } });
    await db.projectMember.createMany({
      data: [
        { projectId: mine.id, userId: user.id, role: "OWNER" },
        { projectId: deleted.id, userId: user.id, role: "OWNER" },
        { projectId: notMine.id, userId: other.id, role: "OWNER" },
      ],
    });
    const { token } = await createSession(user.id);

    const res = await meRoute(getRequest("/api/auth/me", token), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(user.id);
    expect(body.projects).toEqual([{ id: mine.id, name: "বাগানের ফল", isActive: true, role: "OWNER" }]);
    expect(body.user.passwordHash).toBeUndefined();
  });
});

describe("sessions", () => {
  it("rejects and removes an expired session", async () => {
    const user = await createUser();
    const now = new Date();
    const { token } = await createSession(user.id, now);
    expect(await authenticate(token, new Date(now.getTime() + 91 * DAY))).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it("extends a session that is past its renewal point", async () => {
    const user = await createUser();
    const now = new Date();
    const { token, expiresAt } = await createSession(user.id, now);

    const early = await authenticate(token, new Date(now.getTime() + 10 * DAY));
    expect(early?.renewed).toBeUndefined();

    const later = new Date(now.getTime() + 40 * DAY);
    const renewed = await authenticate(token, later);
    expect(renewed?.renewed?.expiresAt.getTime()).toBe(later.getTime() + 90 * DAY);
    expect(renewed!.renewed!.expiresAt > expiresAt).toBe(true);
  });

  it("logout deletes the session and clears the cookie", async () => {
    const user = await createUser();
    const { token } = await createSession(user.id);
    const res = await logoutRoute(jsonRequest("/api/auth/logout", {}, token));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBe("");
    expect(await authenticate(token)).toBeNull();
  });
});
