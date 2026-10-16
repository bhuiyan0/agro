import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";
import type { SessionUser } from "@/lib/session";
import { requireOwner } from "@/server/access";

type Role = "OWNER" | "MANAGER";

const USER_FIELDS = { id: true, name: true, phone: true, role: true, createdAt: true } as const;

export async function listUsers(user: SessionUser) {
  requireOwner(user);
  const users = await db.user.findMany({ select: USER_FIELDS, orderBy: { name: "asc" } });
  return users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
}

/** Owners are members of every project; make that true for this user. */
async function addToAllProjects(userId: string) {
  const projects = await db.project.findMany({ where: { deletedAt: null }, select: { id: true } });
  await db.$transaction([
    db.projectMember.updateMany({ where: { userId }, data: { role: "OWNER" } }),
    db.projectMember.createMany({
      data: projects.map((p) => ({ projectId: p.id, userId, role: "OWNER" as const })),
      skipDuplicates: true,
    }),
  ]);
}

export async function createUser(
  user: SessionUser,
  input: { name: string; phone: string; password: string; role: Role; projectIds: string[] },
) {
  requireOwner(user);
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError("VALIDATION_FAILED", 400);
  if (await db.user.findUnique({ where: { phone } })) throw new HttpError("PHONE_TAKEN", 409);

  const projectIds = [...new Set(input.projectIds)];
  if (input.role === "MANAGER" && projectIds.length > 0) {
    const found = await db.project.count({ where: { id: { in: projectIds }, deletedAt: null } });
    if (found !== projectIds.length) throw new HttpError("VALIDATION_FAILED", 400);
  }

  const created = await db.user.create({
    data: {
      name: input.name,
      phone,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      memberships:
        input.role === "MANAGER"
          ? { create: projectIds.map((projectId) => ({ projectId, role: "MANAGER" as const })) }
          : undefined,
    },
    select: USER_FIELDS,
  });
  if (input.role === "OWNER") await addToAllProjects(created.id);
  return { ...created, createdAt: created.createdAt.toISOString() };
}

/**
 * Change a user's name, password or role. A new password logs the user out
 * on all phones. The last owner cannot be made a manager.
 */
export async function updateUser(
  user: SessionUser,
  id: string,
  input: { name?: string; password?: string; role?: Role },
) {
  requireOwner(user);
  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new HttpError("NOT_FOUND", 404);

  if (input.role === "MANAGER" && target.role === "OWNER") {
    const owners = await db.user.count({ where: { role: "OWNER" } });
    if (owners <= 1) throw new HttpError("LAST_OWNER", 409);
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      name: input.name,
      role: input.role,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
    },
    select: USER_FIELDS,
  });

  if (input.password && id !== user.id) await db.session.deleteMany({ where: { userId: id } });
  if (input.role === "OWNER" && target.role !== "OWNER") await addToAllProjects(id);
  // A demoted owner keeps their memberships as a manager; the owner can then
  // remove them per project.
  if (input.role === "MANAGER" && target.role === "OWNER") {
    await db.projectMember.updateMany({ where: { userId: id }, data: { role: "MANAGER" } });
  }
  return { ...updated, createdAt: updated.createdAt.toISOString() };
}
