import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { ProjectUpdate } from "@/lib/schemas";
import { updateProject } from "@/server/projects";

/** Owner only. Rename, archive (`isActive: false`) or restore. */
export const PATCH = withAuth(async (request, user, ctx: RouteContext<"/api/projects/[id]">) => {
  const body = await parseBody(request, ProjectUpdate);
  if (body.response) return body.response;
  const { id } = await ctx.params;
  return NextResponse.json({ project: await updateProject(user, id, body.data) });
});
