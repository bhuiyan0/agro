// Demo mode, for trying the screens on a phone without a server. Only built
// into the Android test APK (NEXT_PUBLIC_APK=1); the deployed web app never
// shows it. In demo mode nothing is sent anywhere: saves stay on the phone,
// sync is off, and the owner-only settings that need the server are hidden.
import {
  clearLocalData,
  localDb,
  setMeta,
  type LocalTransaction,
  type LocalWorkLog,
} from "@/client/local-db";
import type { Me } from "@/lib/api-client";
import { categoriesFor, WORK_TYPES } from "@/lib/categories";
import { previousDay, todayIso } from "@/lib/dates";

export const DEMO_AVAILABLE = process.env.NEXT_PUBLIC_APK === "1";
const KEY = "gh.demo";

export function isDemo(): boolean {
  if (!DEMO_AVAILABLE) return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const OWNER_ID = "00000000-0000-4000-8000-0000000000aa";
const GARDEN = "00000000-0000-4000-8000-000000000001";
const FARM = "00000000-0000-4000-8000-000000000002";

const ME: Me = {
  user: { id: OWNER_ID, name: "ডেমো", phone: "01700000000", role: "OWNER" },
  projects: [
    { id: GARDEN, name: "বাগানের ফল", isActive: true, role: "OWNER" },
    { id: FARM, name: "খামার", isActive: true, role: "OWNER" },
  ],
};

/** A day `n` days before today, as YYYY-MM-DD. */
function daysAgo(n: number): string {
  let d = todayIso();
  for (let i = 0; i < n; i++) d = previousDay(d);
  return d;
}

// A small, believable ledger for the last three months. Fixed numbers, so
// the screens look the same every time.
function sampleRows(): { txns: LocalTransaction[]; logs: LocalWorkLog[] } {
  const base = {
    createdBy: OWNER_ID,
    updatedBy: OWNER_ID,
    plotId: null,
    deletedAt: null,
    _pending: 0,
    _synced: 1,
  } as const;
  const expense = categoriesFor("EXPENSE");
  const plan: [number, string, "EXPENSE" | "INCOME", string, number, string | null][] = [
    [0, GARDEN, "EXPENSE", expense[0], 1200, "৪ জন শ্রমিক"],
    [0, FARM, "INCOME", "বিক্রি", 3500, "ডিম বিক্রি"],
    [1, GARDEN, "EXPENSE", expense[1], 2400, "ইউরিয়া ২ বস্তা"],
    [3, GARDEN, "EXPENSE", expense[2], 850, null],
    [5, FARM, "EXPENSE", expense[3], 1800, "চারা"],
    [8, GARDEN, "INCOME", "বিক্রি", 14000, "কাঁঠাল বিক্রি"],
    [12, GARDEN, "EXPENSE", expense[4], 600, "ভ্যান ভাড়া"],
    [15, FARM, "EXPENSE", expense[0], 900, null],
    [20, GARDEN, "EXPENSE", expense[5], 1500, "পাম্পের তেল"],
    [33, GARDEN, "EXPENSE", expense[0], 6000, null],
    [36, GARDEN, "INCOME", "বিক্রি", 22000, "লেবু বিক্রি"],
    [40, FARM, "EXPENSE", expense[6], 4500, "স্প্রে মেশিন"],
    [48, FARM, "INCOME", "বিক্রি", 5200, null],
    [64, GARDEN, "EXPENSE", expense[1], 3200, null],
    [70, GARDEN, "INCOME", "বিক্রি", 9000, null],
  ];
  const txns = plan.map(([ago, projectId, type, category, amount, note], i) => ({
    ...base,
    id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, "0")}`,
    projectId,
    type,
    category,
    amount: amount.toFixed(2),
    note,
    date: daysAgo(ago),
    updatedAt: new Date().toISOString(),
  }));
  const work: [number, string, string, number | null, number | null, string | null][] = [
    [0, GARDEN, WORK_TYPES[1], 4, 6, "উত্তর দিকের সারি"],
    [1, GARDEN, WORK_TYPES[0], 2, 3, null],
    [2, FARM, WORK_TYPES[4], 3, 4, "ডিম সংগ্রহ"],
    [6, GARDEN, WORK_TYPES[3], 2, 5, null],
    [10, GARDEN, WORK_TYPES[2], 3, 4, null],
    [35, GARDEN, WORK_TYPES[5], 5, 7, "লেবু গাছ"],
  ];
  const logs = work.map(([ago, projectId, workType, workers, hours, note], i) => ({
    ...base,
    id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
    projectId,
    workType,
    workers,
    hours: hours === null ? null : hours.toFixed(2),
    note,
    date: daysAgo(ago),
    updatedAt: new Date().toISOString(),
  }));
  return { txns, logs };
}

/** Replace whatever is on the phone with the demo user and sample data. */
export async function startDemo() {
  await clearLocalData();
  const { txns, logs } = sampleRows();
  await localDb.transaction("rw", localDb.tables, async () => {
    await setMeta("me", ME);
    await localDb.transactions.bulkPut(txns);
    await localDb.workLogs.bulkPut(logs);
  });
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

export async function endDemo() {
  await clearLocalData();
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
