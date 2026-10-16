import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { SessionUser } from "@/lib/session";

// Access rules (CLAUDE.md section 8):
// - A user sees and changes a project's data only if they are a member.
// - Users with the app-wide OWNER role are members of every project, so the
//   owner always sees everything.
// - Only OWNER may create or archive projects and manage users and members.

export function requireOwner(user: SessionUser) {
  if (user.role !== "OWNER") throw new HttpError("FORBIDDEN", 403);
}

/**
 * Check that the user is a member of the project and return it. With
 * `write`, the project must also be active: archived projects are read-only.
 */
export async function requireMember(user: SessionUser, projectId: string, opts: { write?: boolean } = {}) {
  const member = await getDb().projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    include: { project: true },
  });
  if (!member || member.project.deletedAt) throw new HttpError("FORBIDDEN", 403);
  if (opts.write && !member.project.isActive) throw new HttpError("PROJECT_ARCHIVED", 409);
  return member.project;
}

/** Ids of the non-deleted projects the user is a member of. */
export async function memberProjectIds(user: SessionUser): Promise<string[]> {
  const rows = await getDb().projectMember.findMany({
    where: { userId: user.id, project: { deletedAt: null } },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

/** Check that a plot exists in the given project. */
export async function requirePlotInProject(plotId: string | null, projectId: string) {
  if (!plotId) return;
  const plot = await getDb().plot.findFirst({ where: { id: plotId, projectId, deletedAt: null } });
  if (!plot) throw new HttpError("VALIDATION_FAILED", 400);
}
