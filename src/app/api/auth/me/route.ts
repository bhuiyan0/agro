import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/** The logged-in user and the projects they are a member of, with their role in each. */
export const GET = withAuth(async (_request, user) => {
  const memberships = await db.projectMember.findMany({
    where: { userId: user.id, project: { deletedAt: null } },
    select: { role: true, project: { select: { id: true, name: true, isActive: true } } },
    orderBy: { project: { name: "asc" } },
  });
  return NextResponse.json({
    user,
    projects: memberships.map((m) => ({ ...m.project, role: m.role })),
  });
});
