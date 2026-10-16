"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-shell";
import { MonthPicker, ProjectSelector } from "@/components/pickers";
import { countsInTotals, transactionsInMonth } from "@/client/queries";
import { useLiveQuery } from "@/client/use-live-query";
import { RowStatus } from "@/components/sync-status";
import { Chips, EmptyState, PageHeader } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { formatAmount, formatDate, sumAmounts } from "@/lib/format";
import { groupByDate } from "@/lib/group";

type TypeFilter = "ALL" | "EXPENSE" | "INCOME";

export default function AccountsPage() {
  const { me, selected } = useApp();
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [type, setType] = useState<TypeFilter>("ALL");

  const projectId = selected === "all" ? null : selected;
  const data = useLiveQuery(() => transactionsInMonth(month, projectId), [month, projectId]);
  const rows = (data ?? []).filter((t) => type === "ALL" || t.type === type);
  const projectName = new Map(me.projects.map((p) => [p.id, p.name]));

  const counted = rows.filter(countsInTotals);
  const expense = sumAmounts(counted.filter((t) => t.type === "EXPENSE").map((t) => t.amount));
  const income = sumAmounts(counted.filter((t) => t.type === "INCOME").map((t) => t.amount));

  return (
    <main className="flex flex-col">
      <PageHeader
        title="হিসাব"
        action={
          <Link
            href="/accounts/new"
            className="flex h-12 items-center rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            + নতুন
          </Link>
        }
      />
      <ProjectSelector />
      <div className="flex flex-col gap-3 px-4 pb-3">
        <Chips
          label="ধরন"
          options={[
            { value: "ALL", label: "সব" },
            { value: "EXPENSE", label: "খরচ" },
            { value: "INCOME", label: "আয়" },
          ]}
          value={type}
          onChange={setType}
        />
        <MonthPicker value={month} onChange={setMonth} />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border-2 border-border p-3">
            <span className="block text-sm text-muted">মোট খরচ</span>
            <span className="font-bold text-danger">{formatAmount(expense)}</span>
          </div>
          <div className="rounded-lg border-2 border-border p-3">
            <span className="block text-sm text-muted">মোট আয়</span>
            <span className="font-bold text-primary">{formatAmount(income)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {!data ? (
          <p className="text-muted">লোড হচ্ছে...</p>
        ) : rows.length === 0 ? (
          <EmptyState>এই মাসে কোনো হিসাব নেই।</EmptyState>
        ) : (
          groupByDate(rows).map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="font-semibold text-muted">{formatDate(date)}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/accounts/edit?id=${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-border px-4 py-3"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{t.category}</span>
                        <span className="truncate text-sm text-muted">
                          {[selected === "all" ? projectName.get(t.projectId) : null, t.note]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <RowStatus pending={t._pending} error={t._error} />
                      </span>
                      <span
                        className={`shrink-0 text-lg font-bold ${t.type === "EXPENSE" ? "text-danger" : "text-primary"}`}
                      >
                        {t.type === "EXPENSE" ? "−" : "+"} {formatAmount(t.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
