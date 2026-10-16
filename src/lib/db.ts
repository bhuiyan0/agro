import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

// One client per process. In development, Next.js reloads modules on every
// change, so the client is kept on globalThis to avoid opening a new pool
// each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

type Client = PrismaClient | Prisma.TransactionClient;
const currentTx = new AsyncLocalStorage<Prisma.TransactionClient>();

/**
 * The client to use in service code: the open transaction when called inside
 * `inTransaction`, otherwise the shared client. This lets the sync push run
 * the same service functions as the REST endpoints, atomically.
 */
export function getDb(): Client {
  return currentTx.getStore() ?? db;
}

export function inTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return db.$transaction((tx) => currentTx.run(tx, fn));
}
