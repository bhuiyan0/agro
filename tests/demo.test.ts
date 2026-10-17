// Demo mode in the Android test APK: sample data on the phone, saves never
// queued, sync never contacts a server.
import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it, vi } from "vitest";

const fetchSpy = vi.fn();

beforeAll(() => {
  // The APK build flag is read when the modules load.
  process.env.NEXT_PUBLIC_APK = "1";
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
});

describe("demo mode", () => {
  it("loads sample data, keeps saves local and never syncs", async () => {
    const { startDemo, endDemo, isDemo } = await import("@/client/demo");
    const { localDb, getMeta } = await import("@/client/local-db");
    const { saveEntry } = await import("@/client/store");
    const { syncNow } = await import("@/client/sync-controller");

    await startDemo();
    expect(isDemo()).toBe(true);
    expect((await getMeta("me"))?.user.role).toBe("OWNER");
    expect(await localDb.transactions.count()).toBeGreaterThan(10);
    expect(await localDb.workLogs.count()).toBeGreaterThan(3);

    const id = crypto.randomUUID();
    await saveEntry(
      "transaction",
      id,
      {
        projectId: "00000000-0000-4000-8000-000000000001",
        type: "EXPENSE",
        category: "সার",
        amount: "500",
        note: null,
        plotId: null,
        date: "2026-10-17",
      },
      (await getMeta("me"))!.user.id,
    );
    expect(await localDb.outbox.count()).toBe(0);
    expect(await localDb.transactions.get(id)).toMatchObject({ _pending: 0, _synced: 1 });

    await syncNow();
    expect(fetchSpy).not.toHaveBeenCalled();

    await endDemo();
    expect(isDemo()).toBe(false);
    expect(await localDb.transactions.count()).toBe(0);
  });
});
