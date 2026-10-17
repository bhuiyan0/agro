// Every change goes to the local table and the outbox in one IndexedDB
// transaction, so an entry is never saved without also being queued for the
// server. The screen updates at once; the sync controller sends it later.
import {
  localDb,
  setMeta,
  tableFor,
  type Entity,
  type LocalTransaction,
  type LocalWorkLog,
} from "@/client/local-db";
import { isDemo } from "@/client/demo";
import { requestSync } from "@/client/sync-controller";
import type { TransactionInput, WorkLogInput } from "@/lib/schemas";

type Input = { transaction: TransactionInput; workLog: WorkLogInput };
type Row = { transaction: LocalTransaction; workLog: LocalWorkLog };

/** Create or edit. `id` is generated on the phone for new entries. */
export async function saveEntry<E extends Entity>(entity: E, id: string, input: Input[E], userId: string) {
  const table = tableFor(entity);
  const demo = isDemo();
  await localDb.transaction("rw", [table, localDb.outbox], async () => {
    const prev = (await table.get(id)) as Row[E] | undefined;
    const queued = await localDb.outbox.where("id").equals(id).count();
    // Create again when the server never got the row (its create was refused).
    const op = !prev || (!prev._synced && queued === 0) ? "create" : "update";
    const now = new Date().toISOString();
    await table.put({
      ...input,
      id,
      createdBy: prev?.createdBy ?? userId,
      updatedBy: userId,
      updatedAt: now,
      deletedAt: null,
      // Demo mode never sends anything, so nothing is waiting.
      _pending: demo ? 0 : 1,
      _synced: demo ? 1 : (prev?._synced ?? 0),
      _error: undefined,
    } as never);
    if (demo) return;
    await localDb.outbox.add({
      mutationId: crypto.randomUUID(),
      entity,
      op,
      id,
      data: input,
      createdAtLocal: now,
    });
  });
  requestSync();
}

export async function deleteEntry(entity: Entity, id: string, userId: string) {
  const table = tableFor(entity);
  const demo = isDemo();
  await localDb.transaction("rw", [table, localDb.outbox], async () => {
    const prev = await table.get(id);
    if (!prev) return;
    const queued = await localDb.outbox.where("id").equals(id).count();
    if (demo || (!prev._synced && queued === 0)) {
      // The server never had it (or this is the demo): nothing to tell the server.
      await table.delete(id);
      return;
    }
    const now = new Date().toISOString();
    await table.update(id, {
      deletedAt: now,
      updatedAt: now,
      updatedBy: userId,
      _pending: 1,
      _error: undefined,
    });
    await localDb.outbox.add({
      mutationId: crypto.randomUUID(),
      entity,
      op: "delete",
      id,
      createdAtLocal: now,
    });
  });
  requestSync();
}

/**
 * Throw away a change the server refused: drop the local copy and fetch
 * everything again, which brings back the server's version if there is one.
 */
export async function discardLocal(entity: Entity, id: string) {
  const table = tableFor(entity);
  await localDb.transaction("rw", [table, localDb.outbox, localDb.meta], async () => {
    await localDb.outbox.where("id").equals(id).delete();
    await table.delete(id);
    await localDb.meta.delete("cursor");
  });
  requestSync();
}

export async function dismissNotices() {
  await setMeta("notices", []);
}
