"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-shell";
import { MonthPicker, ProjectSelector } from "@/components/pickers";
import { Chips, EmptyState, ErrorBox, PageHeader } from "@/components/ui";
import type { WorkLog } from "@/lib/api-client";
import { WORK_TYPES } from "@/lib/categories";
import { todayIso } from "@/lib/dates";
import { formatDate, formatNumber } from "@/lib/format";
import { groupByDate } from "@/lib/group";
import { useFetch } from "@/lib/use-fetch";

export default function WorkLogsPage() {
  const { me, selected } = useApp();
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [workType, setWorkType] = useState("ALL");

  const params = new URLSearchParams({ month });
  if (selected !== "all") params.set("projectId", selected);
  if (workType !== "ALL") params.set("workType", workType);
  const { data, error, loading } = useFetch<{ workLogs: WorkLog[] }>(`/api/work-logs?${params}`);
  const rows = data?.workLogs ?? [];
  const projectName = new Map(me.projects.map((p) => [p.id, p.name]));

  return (
    <main className="flex flex-col">
      <PageHeader
        title="কাজের রিপোর্ট"
        action={
          <Link
            href="/work/new"
            className="flex h-12 items-center rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            + নতুন
          </Link>
        }
      />
      <ProjectSelector />
      <div className="flex flex-col gap-3 px-4 pb-3">
        <Chips
          label="কাজের ধরন"
          options={[{ value: "ALL", label: "সব" }, ...WORK_TYPES.map((w) => ({ value: w, label: w }))]}
          value={workType}
          onChange={setWorkType}
        />
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="flex flex-col gap-4 px-4">
        <ErrorBox message={error} />
        {loading && !data ? (
          <p className="text-muted">লোড হচ্ছে...</p>
        ) : rows.length === 0 ? (
          <EmptyState>এই মাসে কোনো কাজের রিপোর্ট নেই।</EmptyState>
        ) : (
          groupByDate(rows).map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="font-semibold text-muted">{formatDate(date)}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/work/edit?id=${w.id}`}
                      className="flex flex-col rounded-lg border-2 border-border px-4 py-3"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{w.workType}</span>
                        <span className="text-muted">
                          {[
                            w.workers !== null ? `${formatNumber(w.workers)} জন` : null,
                            w.hours !== null ? `${formatNumber(w.hours)} ঘণ্টা` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {(selected === "all" || w.note) && (
                        <span className="truncate text-sm text-muted">
                          {[selected === "all" ? projectName.get(w.projectId) : null, w.note]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
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
