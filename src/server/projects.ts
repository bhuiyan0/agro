import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { SessionUser } from "@/lib/session";
import { requireMember, requireOwner } from "@/server/access";

/** Projects the user is a member of, archived ones included, with the user's role in each. */
export async function listProjects(user: SessionUser) {
  const memberships = await db.projectMember.findMany({
    where: { userId: user.id, project: { deletedAt: null } },
    select: { role: true, project: { select: { id: true, name: true, isActive: true } } },
    orderBy: { project: { name: "asc" } },
  });
  return memberships.map((m) => ({ ...m.project, role: m.role }));
}

/** Check that every id is a MANAGER user. Owners are added to every project automatically. */
async function requireManagers(ids: string[]) {
  if (ids.length === 0) return;
  const count = await db.user.count({ where: { id: { in: ids }, role: "MANAGER" } });
  if (count !== new Set(ids).size) throw new HttpError("VALIDATION_FAILED", 400);
}

export async function createProject(user: SessionUser, input: { name: string; memberIds: string[] }) {
  requireOwner(user);
  await requireManagers(input.memberIds);
  const owners = await db.user.findMany({ where: { role: "OWNER" }, select: { id: true } });
  const project = await db.project.create({
    data: {
      name: input.name,
      members: {
        create: [
          ...owners.map((o) => ({ userId: o.id, role: "OWNER" as const })),
          ...[...new Set(input.memberIds)].map((userId) => ({ userId, role: "MANAGER" as const })),
        ],
      },
    },
  });
  return { id: project.id, name: project.name, isActive: project.isActive, role: "OWNER" as const };
}

/** Rename, archive (isActive false) or restore a project. */
export async function updateProject(
  user: SessionUser,
  id: string,
  input: { name?: string; isActive?: boolean },
) {
  requireOwner(user);
  const project = await requireMember(user, id);
  const updated = await db.project.update({
    where: { id: project.id },
    data: { name: input.name, isActive: input.isActive },
  });
  return { id: updated.id, name: updated.name, isActive: updated.isActive, role: "OWNER" as const };
}

export async function listMembers(user: SessionUser, projectId: string) {
  requireOwner(user);
  await requireMember(user, projectId);
  const members = await db.projectMember.findMany({
    where: { projectId },
    select: { role: true, user: { select: { id: true, name: true, phone: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => ({ ...m.user, role: m.role }));
}

/**
 * Set which managers belong to the project. Owners always stay members, so
 * `userIds` lists managers only.
 */
export async function setMembers(user: SessionUser, projectId: string, userIds: string[]) {
  requireOwner(user);
  await requireMember(user, projectId);
  await requireManagers(userIds);
  const ids = [...new Set(userIds)];
  await db.$transaction([
    db.projectMember.deleteMany({ where: { projectId, role: "MANAGER", userId: { notIn: ids } } }),
    db.projectMember.createMany({
      data: ids.map((userId) => ({ projectId, userId, role: "MANAGER" as const })),
      skipDuplicates: true,
    }),
  ]);
  return listMembers(user, projectId);
}
