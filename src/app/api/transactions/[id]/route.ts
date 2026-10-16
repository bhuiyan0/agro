import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { TransactionFields } from "@/lib/schemas";
import { deleteTransaction, getTransaction, updateTransaction } from "@/server/transactions";

type Ctx = RouteContext<"/api/transactions/[id]">;

export const GET = withAuth(async (_request, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ transaction: await getTransaction(user, id) });
});

/** Replace all editable fields. */
export const PUT = withAuth(async (request, user, ctx: Ctx) => {
  const body = await parseBody(request, TransactionFields);
  if (body.response) return body.response;
  const { id } = await ctx.params;
  return NextResponse.json({ transaction: await updateTransaction(user, id, body.data) });
});

/** Soft delete. */
export const DELETE = withAuth(async (_request, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ transaction: await deleteTransaction(user, id) });
});
