import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "Session", "ProjectMember", "Plot", "Transaction", "WorkLog", "Project", "User" CASCADE',
  );
}

export async function createUser(phone = "01711111111", password = "secret-pass", name = "Test") {
  return db.user.create({ data: { name, phone, passwordHash: await hashPassword(password) } });
}

export function jsonRequest(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function getRequest(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {},
  });
}

export function request(method: string, path: string, token: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Cookie: `${SESSION_COOKIE}=${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Route context with the given dynamic params, as Next.js passes it. */
export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

/**
 * An owner, a manager and two projects: the manager is a member of
 * `shared` only. Returns session tokens for both users.
 */
export async function setupTeam() {
  const owner = await db.user.create({
    data: {
      name: "Owner",
      phone: "01711111111",
      role: "OWNER",
      passwordHash: await hashPassword("owner-pass"),
    },
  });
  const manager = await db.user.create({
    data: { name: "Manager", phone: "01722222222", passwordHash: await hashPassword("manager-pass") },
  });
  const shared = await db.project.create({ data: { name: "বাগানের ফল" } });
  const ownerOnly = await db.project.create({ data: { name: "খামার" } });
  await db.projectMember.createMany({
    data: [
      { projectId: shared.id, userId: owner.id, role: "OWNER" },
      { projectId: ownerOnly.id, userId: owner.id, role: "OWNER" },
      { projectId: shared.id, userId: manager.id, role: "MANAGER" },
    ],
  });
  return {
    owner,
    manager,
    shared,
    ownerOnly,
    ownerToken: (await createSession(owner.id)).token,
    managerToken: (await createSession(manager.id)).token,
  };
}
