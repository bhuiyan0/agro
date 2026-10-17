import { NextResponse, type NextRequest } from "next/server";
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
  | "NOT_FOUND"
  | "ID_CONFLICT"
  | "ROW_DELETED"
  | "PROJECT_ARCHIVED"
  | "PHONE_TAKEN"
  | "LAST_OWNER";

/**
 * Thrown by service functions to end a request with an error code. Route
 * handlers wrapped in withAuth turn it into a JSON error response; the sync
 * push (milestone 3) will turn it into a per-mutation result instead.
 */
export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}

export function apiError(
  code: ErrorCode,
  status: number,
  extra?: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error: { code, ...extra } }, { status, headers });
}

export function validationError(issues: z.core.$ZodIssue[]) {
  return apiError("VALIDATION_FAILED", 400, {
    issues: issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
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
    return { response: validationError(result.error.issues) };
  }
  return { data: result.data };
}

/** Validate URL query parameters. Empty values count as missing. */
export function parseQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): { data: z.infer<T>; response?: never } | { data?: never; response: NextResponse } {
  const params = Object.fromEntries([...request.nextUrl.searchParams.entries()].filter(([, v]) => v !== ""));
  const result = schema.safeParse(params);
  return result.success ? { data: result.data } : { response: validationError(result.error.issues) };
}
