import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { WORK_TYPES } from "@/lib/categories";
import { isIsoMonth } from "@/lib/dates";
import { parseBody, parseQuery } from "@/lib/http";
import { WorkLogCreate } from "@/lib/schemas";
import { createWorkLog, listWorkLogs } from "@/server/work-logs";

const ListQuery = z.object({
  projectId: z.uuid().optional(),
  workType: z.enum(WORK_TYPES).optional(),
  month: z.string().refine(isIsoMonth, "Expected YYYY-MM").optional(),
});

/** Non-deleted work reports in the user's projects, newest date first. */
export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request, ListQuery);
  if (query.response) return query.response;
  return NextResponse.json({ workLogs: await listWorkLogs(user, query.data) });
});

/** Create with a device-generated `id`. Repeating the same create returns 200 with the existing row. */
export const POST = withAuth(async (request, user) => {
  const body = await parseBody(request, WorkLogCreate);
  if (body.response) return body.response;
  const { id, ...input } = body.data;
  const result = await createWorkLog(user, id, input);
  return NextResponse.json({ workLog: result.row }, { status: result.created ? 201 : 200 });
});
