import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as txns from "@/app/api/transactions/route";
import * as txn from "@/app/api/transactions/[id]/route";
import * as logs from "@/app/api/work-logs/route";
import * as log from "@/app/api/work-logs/[id]/route";
import { db } from "@/lib/db";
import { getRequest, params, request, resetDb, setupTeam } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

function txnBody(projectId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    projectId,
    type: "EXPENSE",
    category: "সার",
    amount: "1250.50",
    note: "ইউরিয়া",
    date: "2026-10-16",
    ...overrides,
  };
}

describe("transactions", () => {
  it("creates an entry with the device id and the creator recorded", async () => {
    const { shared, manager, managerToken } = await setupTeam();
    const body = txnBody(shared.id);
    const res = await txns.POST(request("POST", "/api/transactions", managerToken, body), {});
    expect(res.status).toBe(201);
    const { transaction } = await res.json();
    expect(transaction).toMatchObject({
      id: body.id,
      amount: "1250.50",
      date: "2026-10-16",
      createdBy: manager.id,
      updatedBy: manager.id,
      deletedAt: null,
    });
  });

  it("returns the existing row when the same create is sent twice", async () => {
    const { shared, managerToken } = await setupTeam();
    const body = txnBody(shared.id);
    await txns.POST(request("POST", "/api/transactions", managerToken, body), {});
    const again = await txns.POST(request("POST", "/api/transactions", managerToken, body), {});
    expect(again.status).toBe(200);
    expect(await db.transaction.count()).toBe(1);
  });

  it("rejects a reused id in another project", async () => {
    const { shared, ownerOnly, ownerToken } = await setupTeam();
    const body = txnBody(shared.id);
    await txns.POST(request("POST", "/api/transactions", ownerToken, body), {});
    const res = await txns.POST(
      request("POST", "/api/transactions", ownerToken, { ...body, projectId: ownerOnly.id }),
      {},
    );
    expect(res.status).toBe(409);
  });

  it("forbids writing to or reading a project the user is not a member of", async () => {
    const { ownerOnly, ownerToken, managerToken } = await setupTeam();
    const res = await txns.POST(
      request("POST", "/api/transactions", managerToken, txnBody(ownerOnly.id)),
      {},
    );
    expect(res.status).toBe(403);

    const body = txnBody(ownerOnly.id);
    await txns.POST(request("POST", "/api/transactions", ownerToken, body), {});
    const read = await txn.GET(
      getRequest(`/api/transactions/${body.id}`, managerToken),
      params({ id: body.id }),
    );
    expect(read.status).toBe(403);
    const list = await txns.GET(getRequest(`/api/transactions?projectId=${ownerOnly.id}`, managerToken), {});
    expect(list.status).toBe(403);
  });

  it("validates amount, category and date", async () => {
    const { shared, managerToken } = await setupTeam();
    for (const bad of [
      { amount: "0" },
      { amount: "-5" },
      { amount: "12.345" },
      { category: "বিক্রি" }, // income category on an expense
      { date: "2026-02-30" },
    ]) {
      const res = await txns.POST(
        request("POST", "/api/transactions", managerToken, txnBody(shared.id, bad)),
        {},
      );
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("lists only the user's projects, filtered by type and month", async () => {
    const { shared, ownerOnly, ownerToken, managerToken } = await setupTeam();
    const entries = [
      txnBody(shared.id, { date: "2026-10-01" }),
      txnBody(shared.id, { type: "INCOME", category: "বিক্রি", date: "2026-10-31" }),
      txnBody(shared.id, { date: "2026-09-30" }),
      txnBody(ownerOnly.id, { date: "2026-10-05" }),
    ];
    for (const e of entries) await txns.POST(request("POST", "/api/transactions", ownerToken, e), {});

    const mine = await (await txns.GET(getRequest("/api/transactions", managerToken), {})).json();
    expect(mine.transactions).toHaveLength(3);

    const october = await (
      await txns.GET(getRequest("/api/transactions?month=2026-10&type=EXPENSE", ownerToken), {})
    ).json();
    expect(october.transactions.map((t: { id: string }) => t.id).sort()).toEqual(
      [entries[0].id, entries[3].id].sort(),
    );
  });

  it("updates, then soft deletes; a deleted entry cannot be edited", async () => {
    const { shared, owner, ownerToken, managerToken } = await setupTeam();
    const { id, ...fields } = txnBody(shared.id);
    await txns.POST(request("POST", "/api/transactions", managerToken, { id, ...fields }), {});

    const put = await txn.PUT(
      request("PUT", `/api/transactions/${id}`, ownerToken, { ...fields, amount: 99, note: "" }),
      params({ id }),
    );
    expect(put.status).toBe(200);
    expect((await put.json()).transaction).toMatchObject({
      amount: "99.00",
      note: null,
      updatedBy: owner.id,
    });

    const del = await txn.DELETE(request("DELETE", `/api/transactions/${id}`, ownerToken), params({ id }));
    expect(del.status).toBe(200);
    expect((await db.transaction.findUnique({ where: { id } }))?.deletedAt).not.toBeNull();

    const list = await (await txns.GET(getRequest("/api/transactions", ownerToken), {})).json();
    expect(list.transactions).toHaveLength(0);

    const again = await txn.PUT(
      request("PUT", `/api/transactions/${id}`, ownerToken, fields),
      params({ id }),
    );
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("ROW_DELETED");
  });

  it("keeps archived projects read-only", async () => {
    const { shared, ownerToken } = await setupTeam();
    const body = txnBody(shared.id);
    await txns.POST(request("POST", "/api/transactions", ownerToken, body), {});
    await db.project.update({ where: { id: shared.id }, data: { isActive: false } });

    const create = await txns.POST(request("POST", "/api/transactions", ownerToken, txnBody(shared.id)), {});
    expect(create.status).toBe(409);
    const read = await txn.GET(
      getRequest(`/api/transactions/${body.id}`, ownerToken),
      params({ id: body.id }),
    );
    expect(read.status).toBe(200);
  });

  it("rejects requests without a session", async () => {
    const res = await txns.GET(getRequest("/api/transactions"), {});
    expect(res.status).toBe(401);
  });
});

describe("work logs", () => {
  it("creates, lists, updates and deletes a work report", async () => {
    const { shared, managerToken } = await setupTeam();
    const id = randomUUID();
    const fields = {
      projectId: shared.id,
      workType: "আগাছা পরিষ্কার",
      workers: 4,
      hours: "6.5",
      note: null,
      date: "2026-10-16",
    };
    const created = await logs.POST(request("POST", "/api/work-logs", managerToken, { id, ...fields }), {});
    expect(created.status).toBe(201);
    expect((await created.json()).workLog).toMatchObject({ workers: 4, hours: "6.50" });

    const list = await (await logs.GET(getRequest("/api/work-logs?month=2026-10", managerToken), {})).json();
    expect(list.workLogs).toHaveLength(1);

    const put = await log.PUT(
      request("PUT", `/api/work-logs/${id}`, managerToken, { ...fields, workers: null, hours: "" }),
      params({ id }),
    );
    expect((await put.json()).workLog).toMatchObject({ workers: null, hours: null });

    await log.DELETE(request("DELETE", `/api/work-logs/${id}`, managerToken), params({ id }));
    const after = await (await logs.GET(getRequest("/api/work-logs", managerToken), {})).json();
    expect(after.workLogs).toHaveLength(0);
  });

  it("rejects an unknown work type", async () => {
    const { shared, managerToken } = await setupTeam();
    const res = await logs.POST(
      request("POST", "/api/work-logs", managerToken, {
        id: randomUUID(),
        projectId: shared.id,
        workType: "নাচ",
        date: "2026-10-16",
      }),
      {},
    );
    expect(res.status).toBe(400);
  });
});
