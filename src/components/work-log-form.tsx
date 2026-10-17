"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DateField, ProjectField, readLocal, useDefaultProject, writeLocal } from "@/components/pickers";
import { Chips, ErrorBox, Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/ui";
import type { LocalWorkLog } from "@/client/local-db";
import { deleteEntry, discardLocal, saveEntry } from "@/client/store";
import { useApp } from "@/components/app-shell";
import { WORK_TYPES } from "@/lib/categories";
import { todayIso } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { withDigits } from "@/lib/numerals";
import { toAsciiDigits } from "@/lib/phone";
import { WorkLogFields } from "@/lib/schemas";

const LAST_PROJECT = "gh.lastProject";
const LAST_WORK_TYPE = "gh.lastWorkType";

function defaultWorkType(): string {
  const last = readLocal(LAST_WORK_TYPE);
  return last && (WORK_TYPES as readonly string[]).includes(last) ? last : WORK_TYPES[0];
}

/** New or edit form for one work report. */
export function WorkLogForm({ existing }: { existing?: LocalWorkLog }) {
  const router = useRouter();
  const { me } = useApp();
  const defaultProject = useDefaultProject(LAST_PROJECT);
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const [workType, setWorkType] = useState(() => existing?.workType ?? defaultWorkType());
  const [workers, setWorkers] = useState(
    existing?.workers != null ? withDigits(String(existing.workers)) : "",
  );
  const [hours, setHours] = useState(existing?.hours ? withDigits(String(Number(existing.hours))) : "");
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [projectId, setProjectId] = useState(existing?.projectId ?? defaultProject);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const workersText = toAsciiDigits(workers).trim();
    const parsed = WorkLogFields.safeParse({
      projectId,
      workType,
      workers: workersText === "" ? null : Number(workersText),
      hours: toAsciiDigits(hours).trim(),
      note,
      date,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(
        field === "workers"
          ? "শ্রমিকের সংখ্যা ঠিক নেই।"
          : field === "hours"
            ? "ঘণ্টা ঠিক নেই।"
            : field === "projectId"
              ? "একটি প্রজেক্ট বেছে নিন।"
              : errorMessage("VALIDATION_FAILED"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    // Saved on the phone at once; it reaches the server on the next sync.
    await saveEntry("workLog", id, parsed.data, me.user.id);
    setBusy(false);
    writeLocal(LAST_WORK_TYPE, workType);
    writeLocal(LAST_PROJECT, projectId);
    router.push("/work");
  }

  async function onDelete() {
    if (!confirm("এই কাজের রিপোর্টটি মুছে ফেলবেন?")) return;
    setBusy(true);
    await deleteEntry("workLog", id, me.user.id);
    router.push("/work");
  }

  async function onDiscard() {
    if (!confirm("এই বদলটি বাতিল করবেন? সার্ভারে যা আছে সেটিই থাকবে।")) return;
    await discardLocal("workLog", id);
    router.push("/work");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 px-4 pb-6">
      <div className="flex flex-col gap-2">
        <span className="font-semibold">কাজের ধরন</span>
        <Chips
          label="কাজের ধরন"
          options={WORK_TYPES.map((w) => ({ value: w, label: w }))}
          value={workType}
          onChange={setWorkType}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="শ্রমিক (জন)">
          <input
            inputMode="numeric"
            autoComplete="off"
            value={workers}
            onChange={(e) => setWorkers(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ঘণ্টা">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-semibold">তারিখ</span>
        <DateField value={date} onChange={setDate} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-semibold">প্রজেক্ট</span>
        <ProjectField value={projectId} onChange={setProjectId} />
      </div>

      <Field label="নোট (ইচ্ছা হলে)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-xl focus:border-primary focus:outline-none"
        />
      </Field>

      {existing?._error && (
        <ErrorBox
          message={`সার্ভার এই এন্ট্রিটি নেয়নি: ${errorMessage(existing._error)} ঠিক করে আবার সংরক্ষণ করুন, অথবা বাতিল করুন।`}
        />
      )}
      <ErrorBox message={error} />
      <PrimaryButton disabled={busy}>{busy ? "অপেক্ষা করুন..." : "সংরক্ষণ করুন"}</PrimaryButton>
      {existing && (
        <SecondaryButton danger onClick={onDelete} disabled={busy}>
          মুছে ফেলুন
        </SecondaryButton>
      )}
      {existing?._error && (
        <SecondaryButton onClick={onDiscard} disabled={busy}>
          বদল বাতিল করুন
        </SecondaryButton>
      )}
    </form>
  );
}
