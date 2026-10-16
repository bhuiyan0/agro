import { NextResponse } from "next/server";
import type { z } from "zod";

// The API returns machine-readable error codes, never UI text. The client
// maps codes to Bengali messages, which keeps the API usable by the future
// web back office.
export type ErrorCode =
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND";

export function apiError(
  code: ErrorCode,
  status: number,
  extra?: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error: { code, ...extra } }, { status, headers });
}

/** Parse and validate a JSON request body. Returns either data or an error response. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T>; response?: never } | { data?: never; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: apiError("INVALID_JSON", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      response: apiError("VALIDATION_FAILED", 400, {
        issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
    };
  }
  return { data: result.data };
}
