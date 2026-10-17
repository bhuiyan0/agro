import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { UserCreate } from "@/lib/schemas";
import { createUser, listUsers } from "@/server/users";

/** Owner only. */
export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ users: await listUsers(user) });
});

/** Owner only. */
export const POST = withAuth(async (request, user) => {
  const body = await parseBody(request, UserCreate);
  if (body.response) return body.response;
  return NextResponse.json({ user: await createUser(user, body.data) }, { status: 201 });
});
