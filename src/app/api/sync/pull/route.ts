import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { pull } from "@/server/sync";

/** Changes since `?cursor=` (omit for everything). Repeat with the returned cursor while `hasMore`. */
export const GET = withAuth(async (request, user) => {
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  return NextResponse.json(await pull(user, cursor));
});
