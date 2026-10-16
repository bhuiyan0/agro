"use client";

import { useApp } from "@/components/app-shell";
import { Chips, inputClass } from "@/components/ui";
import { previousDay, todayIso } from "@/lib/dates";
import { formatMonth, shiftMonth } from "@/lib/format";

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
      <input
        type="date"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        aria-label="তারিখ"
      />
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
