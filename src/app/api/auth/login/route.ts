import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { login } from "@/lib/auth";
import { apiError, parseBody } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";

const LoginBody = z.object({
  phone: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const body = await parseBody(request, LoginBody);
  if (body.response) return body.response;

  const result = await login(body.data.phone, body.data.password);
  if (!result.ok) {
    if (result.reason === "ACCOUNT_LOCKED") {
      const retryAfter = Math.ceil((result.lockedUntil.getTime() - Date.now()) / 1000);
      return apiError(
        "ACCOUNT_LOCKED",
        429,
        { lockedUntil: result.lockedUntil.toISOString() },
        { "Retry-After": String(Math.max(retryAfter, 1)) },
      );
    }
    return apiError("INVALID_CREDENTIALS", 401);
  }

  const response = NextResponse.json({ user: result.user });
  setSessionCookie(response, result.token, result.expiresAt);
  return response;
}
