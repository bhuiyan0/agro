import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { push, PushBody } from "@/server/sync";

/** Apply the device's outbox in order and return one result per mutation. */
export const POST = withAuth(async (request, user) => {
  const body = await parseBody(request, PushBody);
  if (body.response) return body.response;
  return NextResponse.json({ results: await push(user, body.data.mutations) });
});
