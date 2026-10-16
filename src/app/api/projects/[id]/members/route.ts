import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { MembersUpdate } from "@/lib/schemas";
import { listMembers, setMembers } from "@/server/projects";

type Ctx = RouteContext<"/api/projects/[id]/members">;

/** Owner only. */
export const GET = withAuth(async (_request, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ members: await listMembers(user, id) });
});

/** Owner only. `userIds` is the full list of managers; owners always stay members. */
export const PUT = withAuth(async (request, user, ctx: Ctx) => {
  const body = await parseBody(request, MembersUpdate);
  if (body.response) return body.response;
  const { id } = await ctx.params;
  return NextResponse.json({ members: await setMembers(user, id, body.data.userIds) });
});
