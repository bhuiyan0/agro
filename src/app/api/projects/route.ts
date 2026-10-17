import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { ProjectCreate } from "@/lib/schemas";
import { createProject, listProjects } from "@/server/projects";

export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ projects: await listProjects(user) });
});

/** Owner only. */
export const POST = withAuth(async (request, user) => {
  const body = await parseBody(request, ProjectCreate);
  if (body.response) return body.response;
  return NextResponse.json({ project: await createProject(user, body.data) }, { status: 201 });
});
