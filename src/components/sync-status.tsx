"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isDemo } from "@/client/demo";
import { getMeta, localDb } from "@/client/local-db";
import { dismissNotices } from "@/client/store";
import { getSyncState, subscribe, syncNow, type SyncState } from "@/client/sync-controller";
import { useLiveQuery } from "@/client/use-live-query";
import { formatNumber } from "@/lib/format";
import { errorMessage } from "@/lib/messages";

const SERVER_STATE: SyncState = { running: false, online: true, problem: null, nextRetryAt: null };

export function useSyncState() {
  return useSyncExternalStore(subscribe, getSyncState, () => SERVER_STATE);
}

/** Number of changes waiting to be sent. */
export function usePendingCount() {
  return useLiveQuery(() => localDb.outbox.count(), []) ?? 0;
}

function lastSyncLabel(iso: string | undefined) {
  if (!iso) return "এখনো সিঙ্ক হয়নি";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "এইমাত্র সিঙ্ক হয়েছে";
  if (minutes < 60) return `${formatNumber(minutes)} মিনিট আগে সিঙ্ক হয়েছে`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)} ঘণ্টা আগে সিঙ্ক হয়েছে`;
  return `${formatNumber(Math.floor(hours / 24))} দিন আগে সিঙ্ক হয়েছে`;
}

export function syncSummary(state: SyncState, pending: number, lastSync: string | undefined) {
  if (isDemo()) return { tone: "warn", text: "ডেমো মোড: সব কিছু শুধু এই ফোনে থাকে" };
  if (state.problem === "auth") return { tone: "danger", text: "আবার লগইন করুন। এন্ট্রিগুলো ফোনে রাখা আছে।" };
  if (state.running) return { tone: "muted", text: "সিঙ্ক হচ্ছে..." };
  const waiting = pending > 0 ? `${formatNumber(pending)}টি বদল পাঠানো বাকি` : null;
  if (!state.online) return { tone: "warn", text: ["ইন্টারনেট নেই", waiting].filter(Boolean).join(" · ") };
  if (state.problem === "network")
    return { tone: "warn", text: [waiting, "আবার চেষ্টা হবে"].filter(Boolean).join(" · ") };
  if (waiting) return { tone: "warn", text: waiting };
  return { tone: "ok", text: lastSyncLabel(lastSync) };
}

const TONES: Record<string, string> = {
  ok: "text-primary",
  muted: "text-muted",
  warn: "text-amber-800",
  danger: "text-danger",
};

/** A slim line at the top of every screen. Tap it to sync now. */
export function SyncBar() {
  const state = useSyncState();
  const pending = usePendingCount();
  const meta = useLiveQuery(
    async () => ({ lastSync: await getMeta("lastSync"), notices: await getMeta("notices") }),
    [],
  );
  const summary = syncSummary(state, pending, meta?.lastSync);
  const notices = meta?.notices ?? [];

  return (
    <div className="flex flex-col gap-2 px-4 pt-2">
      {state.problem === "auth" ? (
        <Link
          href="/login"
          className="rounded-lg border-2 border-danger px-4 py-3 text-center font-semibold text-danger"
        >
          {summary.text} লগইন করতে এখানে চাপুন।
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void syncNow()}
          aria-live="polite"
          className={`flex min-h-10 items-center gap-2 text-left text-sm font-semibold ${TONES[summary.tone]}`}
        >
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-current" />
          {summary.text}
        </button>
      )}
      {notices.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border-2 border-amber-700 px-4 py-3">
          {notices.map((n) => (
            <p key={`${n.id}-${n.at}`} className="font-semibold text-amber-900">
              {n.code === "ROW_DELETED"
                ? "একটি এন্ট্রি অন্য ফোনে মুছে ফেলা হয়েছে, তাই এই ফোনের বদলটি রাখা যায়নি।"
                : `একটি এন্ট্রি মোছা যায়নি: ${errorMessage(n.code)}`}
            </p>
          ))}
          <button
            type="button"
            onClick={() => void dismissNotices()}
            className="h-12 rounded-lg border-2 border-border font-semibold"
          >
            বুঝেছি
          </button>
        </div>
      )}
    </div>
  );
}

/** Marker for a row that has not reached the server, or that the server refused. */
export function RowStatus({ pending, error }: { pending: 0 | 1; error?: string }) {
  if (error)
    return <span className="text-sm font-semibold text-danger">সিঙ্ক হয়নি: {errorMessage(error)}</span>;
  if (pending) return <span className="text-sm font-semibold text-amber-800">পাঠানো বাকি</span>;
  return null;
}
