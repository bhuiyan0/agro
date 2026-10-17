import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, deleteSession, getSessionToken } from "@/lib/session";

// Logout works even with an expired or unknown session, so it does not use
// withAuth: the goal is only to make sure the cookie and session are gone.
export async function POST(request: NextRequest) {
  await deleteSession(getSessionToken(request));
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
