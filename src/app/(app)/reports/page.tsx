"use client";

// Monthly report (CLAUDE.md section 7, screen 5): expense vs income, by
// category, per project, and a six-month trend. Computed on the phone from
// the local copy, so it works offline. Entries the server refused are left
// out, entries still waiting to be sent are counted.

import { useState } from "react";
import { transactionsInRange } from "@/client/queries";
import { useLiveQuery } from "@/client/use-live-query";
import { useApp } from "@/components/app-shell";
import { MonthPicker, ProjectSelector } from "@/components/pickers";
import { EmptyState, PageHeader } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { formatAmount, formatBalance, formatMonth, formatShare, shiftMonth } from "@/lib/format";
import { byCategory, byMonth, byProject, countable, totals, type CategoryLine } from "@/lib/report";

const TREND_MONTHS = 6;

export default function ReportsPage() {
  const { me, selected } = useApp();
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const projectId = selected === "all" ? null : selected;
  const firstMonth = shiftMonth(month, -(TREND_MONTHS - 1));
  const rows = useLiveQuery(
    () => transactionsInRange(firstMonth, shiftMonth(month, 1), projectId),
    [firstMonth, month, projectId],
  );

  const monthRows = (rows ?? []).filter((r) => r.date.startsWith(`${month}-`));
  const sum = totals(monthRows);
  const months = Array.from({ length: TREND_MONTHS }, (_, i) => shiftMonth(month, i - (TREND_MONTHS - 1)));
  const trend = byMonth(rows ?? [], months).reverse();
  const trendMax = Math.max(1, ...trend.flatMap((m) => [m.expense, m.income]));
  const projectLines = byProject(
    monthRows,
    me.projects.map((p) => p.id),
  ).filter((p) => p.expense || p.income);
  const projectName = new Map(me.projects.map((p) => [p.id, p.name]));
  const empty = countable(monthRows).length === 0;

  return (
    <main className="flex flex-col gap-4 pb-6">
      <PageHeader title="রিপোর্ট" />
      <ProjectSelector />
      <div className="px-4">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {!rows ? (
        <p className="px-4 text-muted">লোড হচ্ছে...</p>
      ) : (
        <>
          <section
            aria-label="মাসের মোট"
            className="mx-4 flex flex-col gap-3 rounded-lg border-2 border-border p-4"
          >
            <Bar
              label="খরচ"
              value={sum.expense}
              max={Math.max(sum.expense, sum.income, 1)}
              tone="bg-danger"
            />
            <Bar
              label="আয়"
              value={sum.income}
              max={Math.max(sum.expense, sum.income, 1)}
              tone="bg-primary"
            />
            <div className="flex items-center justify-between border-t-2 border-border pt-3">
              <span className="font-semibold">{sum.balance >= 0 ? "লাভ" : "ক্ষতি"}</span>
              <span className={`text-xl font-bold ${sum.balance >= 0 ? "text-primary" : "text-danger"}`}>
                {formatBalance(sum.balance)}
              </span>
            </div>
          </section>

          {empty ? (
            <div className="px-4">
              <EmptyState>{formatMonth(month)} মাসে কোনো হিসাব নেই।</EmptyState>
            </div>
          ) : (
            <>
              <Categories title="খরচের খাত" lines={byCategory(monthRows, "EXPENSE")} tone="bg-danger" />
              <Categories title="আয়ের খাত" lines={byCategory(monthRows, "INCOME")} tone="bg-primary" />

              {selected === "all" && projectLines.length > 0 && (
                <section className="mx-4 flex flex-col gap-2">
                  <h2 className="text-lg font-bold">প্রজেক্ট অনুযায়ী</h2>
                  <ul className="flex flex-col gap-2">
                    {projectLines.map((p) => (
                      <li key={p.projectId} className="rounded-lg border-2 border-border px-4 py-3">
                        <p className="font-semibold">{projectName.get(p.projectId)}</p>
                        <p className="flex flex-wrap justify-between gap-x-4 text-sm">
                          <span className="text-danger">খরচ {formatAmount(p.expense)}</span>
                          <span className="text-primary">আয় {formatAmount(p.income)}</span>
                          <span className="font-semibold">{formatBalance(p.balance)}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          <section className="mx-4 flex flex-col gap-2">
            <h2 className="text-lg font-bold">গত ছয় মাস</h2>
            <ul className="flex flex-col gap-3">
              {trend.map((m) => (
                <li key={m.month} className="flex flex-col gap-1 rounded-lg border-2 border-border px-4 py-3">
                  <span className="flex justify-between font-semibold">
                    <span>{formatMonth(m.month)}</span>
                    <span className={m.balance >= 0 ? "text-primary" : "text-danger"}>
                      {formatBalance(m.balance)}
                    </span>
                  </span>
                  <MiniBar
                    value={m.expense}
                    max={trendMax}
                    tone="bg-danger"
                    label={`খরচ ${formatAmount(m.expense)}`}
                  />
                  <MiniBar
                    value={m.income}
                    max={trendMax}
                    tone="bg-primary"
                    label={`আয় ${formatAmount(m.income)}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex justify-between">
        <span className="font-semibold">{label}</span>
        <span className="font-bold">{formatAmount(value)}</span>
      </span>
      <span className="h-4 w-full rounded-full bg-zinc-200" aria-hidden>
        <span className={`block h-4 rounded-full ${tone}`} style={{ width: `${(value / max) * 100}%` }} />
      </span>
    </div>
  );
}

function MiniBar({ value, max, tone, label }: { value: number; max: number; tone: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="h-2.5 flex-1 rounded-full bg-zinc-200" aria-hidden>
        <span className={`block h-2.5 rounded-full ${tone}`} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-36 shrink-0 text-right">{label}</span>
    </span>
  );
}

function Categories({ title, lines, tone }: { title: string; lines: CategoryLine[]; tone: string }) {
  if (lines.length === 0) return null;
  return (
    <section className="mx-4 flex flex-col gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="flex flex-col gap-3 rounded-lg border-2 border-border p-4">
        {lines.map((l) => (
          <li key={l.category} className="flex flex-col gap-1">
            <span className="flex justify-between gap-3">
              <span className="font-semibold">{l.category}</span>
              <span>
                <span className="font-bold">{formatAmount(l.amount)}</span>
                <span className="text-muted"> · {formatShare(l.share)}</span>
              </span>
            </span>
            <span className="h-3 w-full rounded-full bg-zinc-200" aria-hidden>
              <span className={`block h-3 rounded-full ${tone}`} style={{ width: `${l.share * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
