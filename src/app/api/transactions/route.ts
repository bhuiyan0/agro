import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { isIsoMonth } from "@/lib/dates";
import { parseBody, parseQuery } from "@/lib/http";
import { TransactionCreate } from "@/lib/schemas";
import { createTransaction, listTransactions } from "@/server/transactions";

const ListQuery = z.object({
  projectId: z.uuid().optional(),
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
  month: z.string().refine(isIsoMonth, "Expected YYYY-MM").optional(),
});

/** Non-deleted entries in the user's projects, newest date first. */
export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request, ListQuery);
  if (query.response) return query.response;
  return NextResponse.json({ transactions: await listTransactions(user, query.data) });
});

/** Create with a device-generated `id`. Repeating the same create returns 200 with the existing row. */
export const POST = withAuth(async (request, user) => {
  const body = await parseBody(request, TransactionCreate);
  if (body.response) return body.response;
  const { id, ...input } = body.data;
  const result = await createTransaction(user, id, input);
  return NextResponse.json({ transaction: result.row }, { status: result.created ? 201 : 200 });
});
