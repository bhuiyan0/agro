"use client";

import { useApp } from "@/components/app-shell";
import { Chips, EmptyState } from "@/components/ui";
import { previousDay, todayIso } from "@/lib/dates";
import { formatDate, formatMonth, shiftMonth } from "@/lib/format";

/** "সব প্রজেক্ট" plus every project the user can see. Changes the app-wide selection. */
export function ProjectSelector() {
  const { me, selected, setSelected } = useApp();
  const options = [
    { value: "all", label: "সব প্রজেক্ট" },
    ...me.projects.map((p) => ({ value: p.id, label: p.isActive ? p.name : `${p.name} (আর্কাইভ)` })),
  ];
  return (
    <div className="px-4 pb-3">
      <Chips label="প্রজেক্ট" options={options} value={selected} onChange={setSelected} />
    </div>
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="আগের মাস"
        onClick={() => onChange(shiftMonth(value, -1))}
        className="h-12 w-14 rounded-lg border-2 border-border text-2xl font-bold"
      >
        ‹
      </button>
      <span className="text-lg font-semibold">{formatMonth(value)}</span>
      <button
        type="button"
        aria-label="পরের মাস"
        onClick={() => onChange(shiftMonth(value, 1))}
        className="h-12 w-14 rounded-lg border-2 border-border text-2xl font-bold"
      >
        ›
      </button>
    </div>
  );
}

/** Date input with one-tap "today" and "yesterday" (Bangladesh time). */
export function DateField({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const today = todayIso();
  const yesterday = previousDay(today);
  return (
    <div className="flex flex-col gap-2">
      <Chips
        label="তারিখ"
        options={[
          { value: today, label: "আজ" },
          { value: yesterday, label: "গতকাল" },
        ]}
        value={value === today || value === yesterday ? value : null}
        onChange={onChange}
      />
      {/* The date reads in Bengali; the transparent date input laid over it
          opens the phone's own calendar on tap. */}
      <label className="relative flex h-14 w-full items-center justify-between rounded-lg border-2 border-border bg-background px-4 text-xl focus-within:border-primary">
        <span>{formatDate(value)}</span>
        <span aria-hidden className="text-base text-muted">
          বদলান
        </span>
        <input
          type="date"
          required
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {}
          }}
          aria-label="তারিখ বেছে নিন"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/**
 * Pick the project for an entry: active projects only, plus the entry's own
 * project if it has since been archived.
 */
export function ProjectField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { me } = useApp();
  const options = me.projects
    .filter((p) => p.isActive || p.id === value)
    .map((p) => ({ value: p.id, label: p.name }));
  return <Chips label="প্রজেক্ট" options={options} value={value} onChange={onChange} />;
}

/** The project a new entry starts with: the selected one, else the last used, else the first active. */
export function useDefaultProject(lastUsedKey: string): string {
  const { me, selected } = useApp();
  const active = me.projects.filter((p) => p.isActive);
  if (active.some((p) => p.id === selected)) return selected;
  const last = readLocal(lastUsedKey);
  if (last && active.some((p) => p.id === last)) return last;
  return active[0]?.id ?? "";
}

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Shown instead of a new-entry form when there is no active project to add to. */
export function NoActiveProject() {
  const { isOwner } = useApp();
  return (
    <div className="flex flex-col gap-3 px-4">
      <EmptyState>
        কোনো চালু প্রজেক্ট নেই, তাই নতুন এন্ট্রি যোগ করা যাবে না।{" "}
        {isOwner ? "সেটিংস থেকে একটি প্রজেক্ট তৈরি করুন।" : "মালিককে আপনাকে একটি প্রজেক্টে যোগ করতে বলুন।"}
      </EmptyState>
    </div>
  );
}

export function useHasActiveProject(): boolean {
  return useApp().me.projects.some((p) => p.isActive);
}
