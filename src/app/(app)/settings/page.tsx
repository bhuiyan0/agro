"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { getInstallState, promptInstall, subscribeInstall } from "@/client/install";
import { endDemo, isDemo } from "@/client/demo";
import { clearLocalData, getMeta, localDb } from "@/client/local-db";
import { syncNow } from "@/client/sync-controller";
import { useLiveQuery } from "@/client/use-live-query";
import { useApp } from "@/components/app-shell";
import { syncSummary, usePendingCount, useSyncState } from "@/components/sync-status";
import { Chips, ErrorBox, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import {
  getNumeralStyle,
  setNumeralStyle,
  subscribeNumerals,
  withDigits,
  type NumeralStyle,
} from "@/lib/numerals";

export default function SettingsPage() {
  const router = useRouter();
  const { me, isOwner } = useApp();
  const state = useSyncState();
  const pending = usePendingCount();
  const lastSync = useLiveQuery(async () => ({ at: await getMeta("lastSync") }), []);
  const [error, setError] = useState<string | null>(null);
  const summary = syncSummary(state, pending, lastSync?.at);
  const numerals = useSyncExternalStore(subscribeNumerals, getNumeralStyle, () => "bengali" as const);
  const install = useSyncExternalStore(subscribeInstall, getInstallState, () => "unavailable" as const);

  async function logout() {
    if (isDemo()) {
      await endDemo();
      return router.replace("/login");
    }
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
          {withDigits(me.user.phone)} · {isOwner ? "মালিক" : "ম্যানেজার"}
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

      <section className="mx-4 flex flex-col gap-3 rounded-lg border-2 border-border p-4">
        <h2 className="text-lg font-bold">সংখ্যা দেখানো</h2>
        <Chips<NumeralStyle>
          label="সংখ্যা দেখানো"
          options={[
            { value: "bengali", label: "বাংলা ১২৩" },
            { value: "english", label: "ইংরেজি 123" },
          ]}
          value={numerals}
          onChange={setNumeralStyle}
        />
      </section>

      {install === "available" && (
        <div className="px-4">
          <PrimaryButton type="button" onClick={() => void promptInstall()}>
            অ্যাপ ইনস্টল করুন
          </PrimaryButton>
        </div>
      )}

      {isOwner && !isDemo() && (
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
