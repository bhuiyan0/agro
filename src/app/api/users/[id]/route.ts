import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { UserUpdate } from "@/lib/schemas";
import { updateUser } from "@/server/users";

/** Owner only. Change name, password or role. */
export const PATCH = withAuth(async (request, user, ctx: RouteContext<"/api/users/[id]">) => {
  const body = await parseBody(request, UserUpdate);
  if (body.response) return body.response;
  const { id } = await ctx.params;
  return NextResponse.json({ user: await updateUser(user, id, body.data) });
});
