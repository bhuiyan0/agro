import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { listProjects } from "@/server/projects";

/** The logged-in user (with app-wide role) and the projects they are a member of. */
export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ user, projects: await listProjects(user) });
});
