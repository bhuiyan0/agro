import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as pullRoute from "@/app/api/sync/pull/route";
import * as pushRoute from "@/app/api/sync/push/route";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/session";
import { pull, push, type Mutation } from "@/server/sync";
import { getRequest, request, resetDb, setupTeam } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const asSession = (u: {
  id: string;
  name: string;
  phone: string;
  role: "OWNER" | "MANAGER";
}): SessionUser => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  role: u.role,
});

function txnData(projectId: string, overrides: Record<string, unknown> = {}) {
  return { projectId, type: "EXPENSE", category: "মজুরি", amount: "500", date: "2026-10-16", ...overrides };
}

function mutation(
  op: Mutation["op"],
  id: string,
  data?: unknown,
  entity: Mutation["entity"] = "transaction",
): Mutation {
  return { mutationId: randomUUID(), entity, op, id, data };
}

describe("push", () => {
  it("applies a duplicate push only once and returns the same result", async () => {
    const { shared, manager } = await setupTeam();
    const id = randomUUID();
    const batch = [mutation("create", id, txnData(shared.id))];

    const first = await push(asSession(manager), batch);
    const second = await push(asSession(manager), batch);
    expect(first[0]).toMatchObject({ status: "applied" });
    expect(second[0]).toMatchObject({ status: "applied", duplicate: true });
    expect(await db.transaction.count()).toBe(1);

    // An update sent twice is not applied twice either: the other phone's
    // later change survives a re-sent old update.
    const update = mutation("update", id, txnData(shared.id, { amount: "600" }));
    await push(asSession(manager), [update]);
    await db.transaction.update({ where: { id }, data: { amount: "700" } });
    await push(asSession(manager), [update]);
    expect((await db.transaction.findUnique({ where: { id } }))?.amount.toFixed(0)).toBe("700");
  });

  it("handles create, then edit, then delete made offline before the first sync", async () => {
    const { shared, manager } = await setupTeam();
    const id = randomUUID();
    const results = await push(asSession(manager), [
      mutation("create", id, txnData(shared.id)),
      mutation("update", id, txnData(shared.id, { amount: "750", note: "বদল" })),
      mutation("delete", id),
    ]);
    expect(results.map((r) => r.status)).toEqual(["applied", "applied", "applied"]);
    const row = await db.transaction.findUnique({ where: { id } });
    expect(row?.amount.toFixed(0)).toBe("750");
    expect(row?.deletedAt).not.toBeNull();
    expect(results[2].row).toMatchObject({ id, deletedAt: expect.any(String) });
  });

  it("two devices editing the same row: the later push wins; an edit after a delete is a conflict", async () => {
    const { shared, owner, manager } = await setupTeam();
    const id = randomUUID();
    await push(asSession(owner), [mutation("create", id, txnData(shared.id))]);

    // Both phones edit offline; the manager's phone reaches the server last.
    await push(asSession(owner), [mutation("update", id, txnData(shared.id, { amount: "111" }))]);
    await push(asSession(manager), [mutation("update", id, txnData(shared.id, { amount: "222" }))]);
    const row = await db.transaction.findUnique({ where: { id } });
    expect(row?.amount.toFixed(0)).toBe("222");
    expect(row?.updatedBy).toBe(manager.id);

    // The owner deletes; the manager's offline edit arrives afterwards.
    await push(asSession(owner), [mutation("delete", id)]);
    const [late] = await push(asSession(manager), [
      mutation("update", id, txnData(shared.id, { amount: "333" })),
    ]);
    expect(late).toMatchObject({ status: "conflict", code: "ROW_DELETED" });
    expect(late.row).toMatchObject({ deletedAt: expect.any(String), amount: "222.00" });
    expect((await db.transaction.findUnique({ where: { id } }))?.deletedAt).not.toBeNull();
  });

  it("rejects one bad mutation without blocking the rest of the batch", async () => {
    const { shared, ownerOnly, manager } = await setupTeam();
    const results = await push(asSession(manager), [
      mutation("create", randomUUID(), txnData(shared.id, { amount: "-1" })),
      mutation("create", randomUUID(), txnData(ownerOnly.id)), // not a member
      mutation("create", randomUUID(), txnData(shared.id)),
    ]);
    expect(results.map((r) => [r.status, r.code])).toEqual([
      ["rejected", "VALIDATION_FAILED"],
      ["rejected", "FORBIDDEN"],
      ["applied", undefined],
    ]);
    expect(results[1].row).toBeNull();
    expect(await db.transaction.count()).toBe(1);
  });

  it("refuses a mutation id first sent by another user", async () => {
    const { shared, owner, manager } = await setupTeam();
    const m = mutation("create", randomUUID(), txnData(shared.id));
    await push(asSession(owner), [m]);
    const [result] = await push(asSession(manager), [m]);
    expect(result).toMatchObject({ status: "rejected", code: "FORBIDDEN" });
  });

  it("syncs work logs too", async () => {
    const { shared, manager } = await setupTeam();
    const [result] = await push(asSession(manager), [
      mutation(
        "create",
        randomUUID(),
        { projectId: shared.id, workType: "সেচ", date: "2026-10-16" },
        "workLog",
      ),
    ]);
    expect(result).toMatchObject({ status: "applied", row: { workType: "সেচ" } });
  });

  it("works through the route and needs a session", async () => {
    const { shared, managerToken } = await setupTeam();
    const body = { mutations: [mutation("create", randomUUID(), txnData(shared.id))] };
    const res = await pushRoute.POST(request("POST", "/api/sync/push", managerToken, body), {});
    expect(res.status).toBe(200);
    expect((await res.json()).results[0].status).toBe("applied");

    const anon = await pushRoute.POST(request("POST", "/api/sync/push", "nope", body), {});
    expect(anon.status).toBe(401);
  });
});

describe("pull", () => {
  async function seed(projectId: string, userId: string, count: number) {
    for (let i = 0; i < count; i++) {
      await db.transaction.create({
        data: {
          id: randomUUID(),
          projectId,
          type: "EXPENSE",
          category: "সার",
          amount: String(i + 1),
          date: new Date("2026-10-16T00:00:00Z"),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
  }

  it("pages through every row exactly once, deleted rows included", async () => {
    const { shared, owner } = await setupTeam();
    await seed(shared.id, owner.id, 7);
    // Several rows with the same updatedAt must still page correctly.
    await db.$executeRaw`UPDATE "Transaction" SET "updatedAt" = now() - interval '1 minute'`;
    await db.$executeRaw`UPDATE "Transaction" SET "deletedAt" = now() WHERE amount = 3`;

    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    for (;;) {
      const page = await pull(asSession(owner), cursor, { limit: 3, settleMs: 0 });
      seen.push(...page.transactions.map((t) => t.id));
      cursor = page.cursor;
      pages++;
      if (!page.hasMore) break;
    }
    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(7);
    expect(seen).toHaveLength(7);

    // Nothing new: an empty page with the same position.
    const again = await pull(asSession(owner), cursor, { limit: 3, settleMs: 0 });
    expect(again.transactions).toHaveLength(0);
    expect(again.reset).toBe(false);

    // A change after the cursor comes through on the next pull.
    const first = seen[0];
    await db.transaction.update({ where: { id: first }, data: { note: "নতুন" } });
    const changed = await pull(asSession(owner), cursor, { limit: 3, settleMs: 0 });
    expect(changed.transactions.map((t) => t.id)).toEqual([first]);
  });

  it("holds back rows that have not settled yet", async () => {
    const { shared, owner } = await setupTeam();
    await seed(shared.id, owner.id, 1);
    const page = await pull(asSession(owner), undefined);
    expect(page.transactions).toHaveLength(0);
  });

  it("returns only rows from the user's projects", async () => {
    const { shared, ownerOnly, owner, manager, managerToken } = await setupTeam();
    await seed(shared.id, owner.id, 2);
    await seed(ownerOnly.id, owner.id, 3);
    const page = await pull(asSession(manager), undefined, { settleMs: 0 });
    expect(page.transactions).toHaveLength(2);
    expect(page.transactions.every((t) => t.projectId === shared.id)).toBe(true);
    expect(page.projects.map((p) => p.id)).toEqual([shared.id]);

    const res = await pullRoute.GET(getRequest("/api/sync/pull", managerToken), {});
    expect(res.status).toBe(200);
    expect((await pullRoute.GET(getRequest("/api/sync/pull"), {})).status).toBe(401);
  });

  it("starts over when the user's projects change", async () => {
    const { ownerOnly, owner, manager } = await setupTeam();
    await seed(ownerOnly.id, owner.id, 2);
    const first = await pull(asSession(manager), undefined, { settleMs: 0 });
    expect(first.reset).toBe(true);
    const steady = await pull(asSession(manager), first.cursor, { settleMs: 0 });
    expect(steady.reset).toBe(false);

    // Added to the farm project: its older rows must arrive too.
    await db.projectMember.create({ data: { projectId: ownerOnly.id, userId: manager.id } });
    const after = await pull(asSession(manager), first.cursor, { settleMs: 0 });
    expect(after.reset).toBe(true);
    expect(after.transactions).toHaveLength(2);
  });

  it("treats a garbled cursor as a fresh start", async () => {
    const { owner } = await setupTeam();
    const page = await pull(asSession(owner), "not-a-cursor", { settleMs: 0 });
    expect(page.reset).toBe(true);
  });
});
