// The phone's own copy of the ledger (IndexedDB via Dexie). Screens read
// only from here, so they work the same with or without a connection.
import Dexie, { type EntityTable } from "dexie";
import type { Me, Transaction, WorkLog } from "@/lib/api-client";

/** Sync bookkeeping kept on every local row. */
export type LocalFlags = {
  /** 1 while a change to this row is waiting in the outbox. */
  _pending: 0 | 1;
  /** 1 once the server is known to have the row. */
  _synced: 0 | 1;
  /** Error code when the server permanently refused the last change. */
  _error?: string;
};

export type LocalTransaction = Transaction & { deletedAt: string | null } & LocalFlags;
export type LocalWorkLog = WorkLog & { deletedAt: string | null } & LocalFlags;

export type Entity = "transaction" | "workLog";

export type OutboxEntry = {
  seq?: number;
  mutationId: string;
  entity: Entity;
  op: "create" | "update" | "delete";
  id: string;
  data?: unknown;
  createdAtLocal: string;
};

export type Notice = { id: string; entity: Entity; code: string; at: string };

type Meta =
  | { key: "me"; value: Me }
  | { key: "cursor"; value: string }
  | { key: "lastSync"; value: string }
  | { key: "notices"; value: Notice[] };

export type MetaKey = Meta["key"];
export type MetaValue<K extends MetaKey> = Extract<Meta, { key: K }>["value"];

class LocalDb extends Dexie {
  transactions!: EntityTable<LocalTransaction, "id">;
  workLogs!: EntityTable<LocalWorkLog, "id">;
  outbox!: EntityTable<OutboxEntry, "seq">;
  meta!: EntityTable<Meta, "key">;

  constructor() {
    super("green-hill");
    this.version(1).stores({
      transactions: "id, date, projectId",
      workLogs: "id, date, projectId",
      outbox: "++seq, id",
      meta: "key",
    });
  }
}

export const localDb = new LocalDb();

export const tableFor = (entity: Entity) =>
  entity === "transaction" ? localDb.transactions : localDb.workLogs;

export async function getMeta<K extends MetaKey>(key: K): Promise<MetaValue<K> | undefined> {
  const row = await localDb.meta.get(key);
  return row?.value as MetaValue<K> | undefined;
}

export function setMeta<K extends MetaKey>(key: K, value: MetaValue<K>) {
  return localDb.meta.put({ key, value } as Meta);
}

/** Forget everything on this phone: used on logout and when another user logs in. */
export async function clearLocalData() {
  await localDb.transaction("rw", localDb.tables, async () => {
    await Promise.all(localDb.tables.map((t) => t.clear()));
  });
}
