import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIE } from "@/lib/session";

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
