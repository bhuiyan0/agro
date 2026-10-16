"use client";

// Home: project selector, today's numbers and the two main buttons. The
// fuller dashboard and monthly reports come in milestone 4.

import Link from "next/link";
import { useApp } from "@/components/app-shell";
import { ProjectSelector } from "@/components/pickers";
import { ErrorBox } from "@/components/ui";
import type { Transaction, WorkLog } from "@/lib/api-client";
import { todayIso } from "@/lib/dates";
import { formatAmount, formatDate, formatNumber, sumAmounts } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

export default function HomePage() {
  const { me, selected } = useApp();
  const today = todayIso();
  const filter = `month=${today.slice(0, 7)}${selected === "all" ? "" : `&projectId=${selected}`}`;
  const txns = useFetch<{ transactions: Transaction[] }>(`/api/transactions?${filter}`);
  const logs = useFetch<{ workLogs: WorkLog[] }>(`/api/work-logs?${filter}`);

  const todays = txns.data?.transactions.filter((t) => t.date === today) ?? [];
  const expense = sumAmounts(todays.filter((t) => t.type === "EXPENSE").map((t) => t.amount));
  const income = sumAmounts(todays.filter((t) => t.type === "INCOME").map((t) => t.amount));
  const workCount = logs.data?.workLogs.filter((w) => w.date === today).length ?? 0;
  const loading = txns.loading || logs.loading;

  return (
    <main className="flex flex-col gap-2">
      <header className="px-4 pt-5 pb-2">
        <p className="text-muted">{formatDate(today)}</p>
        <h1 className="text-2xl font-bold">স্বাগতম, {me.user.name}</h1>
      </header>
      <ProjectSelector />

      <section aria-label="আজকের সারসংক্ষেপ" className="grid grid-cols-3 gap-2 px-4">
        <Stat label="আজ খরচ" value={loading ? "..." : formatAmount(expense)} tone="text-danger" />
        <Stat label="আজ আয়" value={loading ? "..." : formatAmount(income)} tone="text-primary" />
        <Stat label="কাজের রিপোর্ট" value={loading ? "..." : formatNumber(workCount)} />
      </section>
      <div className="px-4">
        <ErrorBox message={txns.error ?? logs.error} />
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">
        <Link
          href="/accounts/new"
          className="flex h-20 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground"
        >
          নতুন হিসাব
        </Link>
        <Link
          href="/work/new"
          className="flex h-20 items-center justify-center rounded-xl border-4 border-primary text-2xl font-bold text-primary"
        >
          নতুন কাজের রিপোর্ট
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border-2 border-border p-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-lg font-bold break-words ${tone}`}>{value}</span>
    </div>
  );
}
