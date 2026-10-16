// The phone side of sync: local saves, the outbox, push, pull and the
// failure paths. IndexedDB is provided by fake-indexeddb; `fetch` is wired
// straight to the real route handlers and the test database, so these tests
// cover the phone and the server together.
import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as pullRoute from "@/app/api/sync/pull/route";
import * as pushRoute from "@/app/api/sync/push/route";
import { clearLocalData, getMeta, localDb } from "@/client/local-db";
import { deleteEntry, discardLocal, saveEntry } from "@/client/store";
import { AuthError, syncOnce, TransientError } from "@/client/sync-engine";
import { db } from "@/lib/db";
import { getRequest, request, resetDb, setupTeam } from "./helpers";

type Network = "online" | "offline" | "server-error";
let network: Network = "online";
let token = "";

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (network === "offline") throw new TypeError("Failed to fetch");
  if (network === "server-error") return new Response("{}", { status: 503 });
  const url = new URL(String(input), "http://localhost");
  const ctx = {} as never;
  if (url.pathname === "/api/sync/push") {
    return pushRoute.POST(request("POST", url.pathname, token, JSON.parse(String(init?.body))), ctx);
  }
  if (url.pathname === "/api/sync/pull")
    return pullRoute.GET(getRequest(url.pathname + url.search, token), ctx);
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;

/** Make every server row old enough for the pull's settle window. */
const settle = () =>
  Promise.all([
    db.$executeRaw`UPDATE "Transaction" SET "updatedAt" = "updatedAt" - interval '1 minute'`,
    db.$executeRaw`UPDATE "WorkLog" SET "updatedAt" = "updatedAt" - interval '1 minute'`,
  ]);

const expense = (projectId: string, amount = "500") => ({
  projectId,
  type: "EXPENSE" as const,
  category: "মজুরি",
  amount,
  note: null,
  plotId: null,
  date: "2026-10-16",
});

let team: Awaited<ReturnType<typeof setupTeam>>;

beforeEach(async () => {
  await resetDb();
  await clearLocalData();
  network = "online";
  team = await setupTeam();
  token = team.managerToken;
});
afterAll(() => db.$disconnect());

describe("phone sync", () => {
  it("keeps an offline entry in the outbox and sends it when back online", async () => {
    const id = randomUUID();
    network = "offline";
    await saveEntry("transaction", id, expense(team.shared.id), team.manager.id);
    expect(await localDb.transactions.get(id)).toMatchObject({ _pending: 1, _synced: 0 });

    await expect(syncOnce()).rejects.toBeInstanceOf(TransientError);
    expect(await localDb.outbox.count()).toBe(1);

    network = "online";
    await syncOnce();
    expect(await localDb.outbox.count()).toBe(0);
    expect(await localDb.transactions.get(id)).toMatchObject({ _pending: 0, _synced: 1, amount: "500.00" });
    expect(await db.transaction.count()).toBe(1);
    expect(await getMeta("lastSync")).toBeTruthy();
  });

  it("keeps the outbox when the server fails, and sends it once later", async () => {
    await saveEntry("transaction", randomUUID(), expense(team.shared.id), team.manager.id);
    network = "server-error";
    await expect(syncOnce()).rejects.toBeInstanceOf(TransientError);
    expect(await localDb.outbox.count()).toBe(1);
    network = "online";
    await syncOnce();
    await syncOnce();
    expect(await db.transaction.count()).toBe(1);
  });

  it("sends create, edit and delete made before the first sync", async () => {
    const id = randomUUID();
    network = "offline";
    await saveEntry("transaction", id, expense(team.shared.id), team.manager.id);
    await saveEntry("transaction", id, expense(team.shared.id, "750"), team.manager.id);
    await deleteEntry("transaction", id, team.manager.id);
    expect(await localDb.outbox.count()).toBe(3);

    network = "online";
    await syncOnce();
    const row = await db.transaction.findUnique({ where: { id } });
    expect(row?.amount.toFixed(0)).toBe("750");
    expect(row?.deletedAt).not.toBeNull();
    expect((await localDb.transactions.get(id))?.deletedAt).toBeTruthy();
  });

  it("drops a never-sent entry locally when its create was refused and it is deleted", async () => {
    const id = randomUUID();
    await saveEntry("transaction", id, expense(team.ownerOnly.id), team.manager.id); // not a member
    await syncOnce();
    expect(await localDb.transactions.get(id)).toMatchObject({ _error: "FORBIDDEN", _pending: 0 });
    await deleteEntry("transaction", id, team.manager.id);
    expect(await localDb.transactions.get(id)).toBeUndefined();
    expect(await localDb.outbox.count()).toBe(0);
  });

  it("marks a refused entry; saving it again sends a fresh create", async () => {
    const id = randomUUID();
    await db.project.update({ where: { id: team.shared.id }, data: { isActive: false } });
    await saveEntry("transaction", id, expense(team.shared.id), team.manager.id);
    await syncOnce();
    expect(await localDb.transactions.get(id)).toMatchObject({ _error: "PROJECT_ARCHIVED" });

    await db.project.update({ where: { id: team.shared.id }, data: { isActive: true } });
    await saveEntry("transaction", id, expense(team.shared.id, "600"), team.manager.id);
    expect((await localDb.outbox.toArray())[0].op).toBe("create");
    await syncOnce();
    expect(await localDb.transactions.get(id)).toMatchObject({ _error: undefined, _synced: 1 });
    expect((await db.transaction.findUnique({ where: { id } }))?.amount.toFixed(0)).toBe("600");
  });

  it("discarding a refused edit brings back the server's version", async () => {
    const id = randomUUID();
    await saveEntry("transaction", id, expense(team.shared.id), team.manager.id);
    await syncOnce();
    await db.project.update({ where: { id: team.shared.id }, data: { isActive: false } });
    await saveEntry("transaction", id, expense(team.shared.id, "999"), team.manager.id);
    await syncOnce();
    expect(await localDb.transactions.get(id)).toMatchObject({ amount: "999", _error: "PROJECT_ARCHIVED" });

    await settle();
    await discardLocal("transaction", id);
    await syncOnce();
    expect(await localDb.transactions.get(id)).toMatchObject({ amount: "500.00", _synced: 1 });
    expect((await localDb.transactions.get(id))?._error).toBeUndefined();
  });

  it("an edit to a row deleted on the other phone: the delete stands and a notice is stored", async () => {
    const id = randomUUID();
    await saveEntry("transaction", id, expense(team.shared.id), team.manager.id);
    await syncOnce();

    // The owner's phone deletes it.
    await db.transaction.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: team.owner.id } });
    await saveEntry("transaction", id, expense(team.shared.id, "800"), team.manager.id);
    await syncOnce();

    expect((await localDb.transactions.get(id))?.deletedAt).toBeTruthy();
    expect(await getMeta("notices")).toEqual([expect.objectContaining({ id, code: "ROW_DELETED" })]);
    expect((await db.transaction.findUnique({ where: { id } }))?.amount.toFixed(0)).toBe("500");
  });

  it("pulls the other phone's entries, and does not overwrite a local edit still waiting", async () => {
    const theirs = randomUUID();
    const shared = randomUUID();
    for (const id of [theirs, shared]) {
      await db.transaction.create({
        data: {
          id,
          ...expense(team.shared.id, "100"),
          date: new Date("2026-10-16T00:00:00Z"),
          createdBy: team.owner.id,
          updatedBy: team.owner.id,
        },
      });
    }
    await settle();
    await syncOnce();
    expect(await localDb.transactions.count()).toBe(2);

    // Edit offline here, while the owner also changes it on the server.
    network = "offline";
    await saveEntry("transaction", shared, expense(team.shared.id, "300"), team.manager.id);
    await db.transaction.update({ where: { id: shared }, data: { amount: "200" } });
    await settle();
    network = "online";
    // Pull alone must not replace the waiting local edit.
    const { pullAll } = await import("@/client/sync-engine");
    await pullAll();
    expect((await localDb.transactions.get(shared))?.amount).toBe("300");
    // The full sync sends it; the later write wins.
    await syncOnce();
    expect((await localDb.transactions.get(shared))?.amount).toBe("300.00");
  });

  it("starts over when added to a project, keeping changes not yet sent", async () => {
    const farmEntry = randomUUID();
    await db.transaction.create({
      data: {
        id: farmEntry,
        ...expense(team.ownerOnly.id),
        date: new Date("2026-10-16T00:00:00Z"),
        createdBy: team.owner.id,
        updatedBy: team.owner.id,
      },
    });
    await settle();
    await syncOnce();
    expect(await localDb.transactions.get(farmEntry)).toBeUndefined();

    network = "offline";
    const mine = randomUUID();
    await saveEntry("transaction", mine, expense(team.shared.id), team.manager.id);
    await db.projectMember.create({ data: { projectId: team.ownerOnly.id, userId: team.manager.id } });
    network = "online";
    const { pullAll } = await import("@/client/sync-engine");
    await pullAll();
    expect(await localDb.transactions.get(farmEntry)).toBeTruthy();
    expect(await localDb.transactions.get(mine)).toMatchObject({ _pending: 1 });
  });

  it("stops with AuthError when the session has ended, keeping the outbox", async () => {
    await saveEntry("transaction", randomUUID(), expense(team.shared.id), team.manager.id);
    token = "expired";
    await expect(syncOnce()).rejects.toBeInstanceOf(AuthError);
    expect(await localDb.outbox.count()).toBe(1);
  });
});
