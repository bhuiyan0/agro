import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { WorkLogFields } from "@/lib/schemas";
import { deleteWorkLog, getWorkLog, updateWorkLog } from "@/server/work-logs";

type Ctx = RouteContext<"/api/work-logs/[id]">;

export const GET = withAuth(async (_request, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ workLog: await getWorkLog(user, id) });
});

/** Replace all editable fields. */
export const PUT = withAuth(async (request, user, ctx: Ctx) => {
  const body = await parseBody(request, WorkLogFields);
  if (body.response) return body.response;
  const { id } = await ctx.params;
  return NextResponse.json({ workLog: await updateWorkLog(user, id, body.data) });
});

/** Soft delete. */
export const DELETE = withAuth(async (_request, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ workLog: await deleteWorkLog(user, id) });
});
