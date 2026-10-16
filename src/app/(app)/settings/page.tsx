"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearLocalData, getMeta, localDb } from "@/client/local-db";
import { syncNow } from "@/client/sync-controller";
import { useLiveQuery } from "@/client/use-live-query";
import { useApp } from "@/components/app-shell";
import { syncSummary, usePendingCount, useSyncState } from "@/components/sync-status";
import { ErrorBox, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";

// The numeral-style setting is added here in milestone 5.
export default function SettingsPage() {
  const router = useRouter();
  const { me, isOwner } = useApp();
  const state = useSyncState();
  const pending = usePendingCount();
  const lastSync = useLiveQuery(async () => ({ at: await getMeta("lastSync") }), []);
  const [error, setError] = useState<string | null>(null);
  const summary = syncSummary(state, pending, lastSync?.at);

  async function logout() {
    const waiting = await localDb.outbox.count();
    if (
      waiting > 0 &&
      !confirm(
        `${formatNumber(waiting)}টি বদল এখনো সার্ভারে পৌঁছায়নি। লগআউট করলে সেগুলো হারিয়ে যাবে। তবুও লগআউট করবেন?`,
      )
    ) {
      return;
    }
    const result = await api("/api/auth/logout", { method: "POST", body: {} });
    // Without a connection the session cannot be ended on the server, and
    // wiping the phone first would leave it logged in with no data.
    if (!result.ok && result.code === "NETWORK") return setError("লগআউট করতে ইন্টারনেট লাগবে।");
    await clearLocalData();
    router.replace("/login");
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="সেটিংস" />
      <section className="mx-4 rounded-lg border-2 border-border p-4">
        <p className="text-xl font-bold">{me.user.name}</p>
        <p className="text-muted">
          {me.user.phone} · {isOwner ? "মালিক" : "ম্যানেজার"}
        </p>
      </section>

      <section className="mx-4 flex flex-col gap-3 rounded-lg border-2 border-border p-4">
        <h2 className="text-lg font-bold">সিঙ্ক</h2>
        <p className="font-semibold">{summary.text}</p>
        {pending > 0 && <p className="text-muted">{formatNumber(pending)}টি বদল ফোনে রাখা আছে।</p>}
        <PrimaryButton type="button" onClick={() => void syncNow()} disabled={state.running}>
          {state.running ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন"}
        </PrimaryButton>
      </section>

      {isOwner && (
        <nav className="flex flex-col gap-2 px-4">
          <SettingsLink href="/settings/projects">প্রজেক্ট</SettingsLink>
          <SettingsLink href="/settings/users">ব্যবহারকারী</SettingsLink>
        </nav>
      )}

      <div className="flex flex-col gap-3 px-4 pt-4">
        <ErrorBox message={error} />
        <SecondaryButton onClick={logout}>লগআউট</SecondaryButton>
      </div>
    </main>
  );
}

function SettingsLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="flex h-14 items-center justify-between rounded-lg border-2 border-border px-4 text-lg font-semibold"
    >
      {children}
      <span aria-hidden>›</span>
    </Link>
  );
}
