"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DateField, ProjectField, readLocal, useDefaultProject, writeLocal } from "@/components/pickers";
import { Chips, ErrorBox, Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/ui";
import type { LocalTransaction } from "@/client/local-db";
import { deleteEntry, discardLocal, saveEntry } from "@/client/store";
import { useApp } from "@/components/app-shell";
import { categoriesFor, type TxnTypeName } from "@/lib/categories";
import { todayIso } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { toAsciiDigits } from "@/lib/phone";
import { TransactionFields } from "@/lib/schemas";

const LAST_PROJECT = "gh.lastProject";
const lastCategoryKey = (type: TxnTypeName) => `gh.lastCategory.${type}`;

function defaultCategory(type: TxnTypeName): string {
  const last = readLocal(lastCategoryKey(type));
  return last && categoriesFor(type).includes(last) ? last : categoriesFor(type)[0];
}

/** New or edit form for one account entry. */
export function TransactionForm({ existing }: { existing?: LocalTransaction }) {
  const router = useRouter();
  const { me } = useApp();
  const defaultProject = useDefaultProject(LAST_PROJECT);
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const [type, setType] = useState<TxnTypeName>(existing?.type ?? "EXPENSE");
  const [category, setCategory] = useState(() => existing?.category ?? defaultCategory("EXPENSE"));
  const [amount, setAmount] = useState(existing ? String(Number(existing.amount)) : "");
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [projectId, setProjectId] = useState(existing?.projectId ?? defaultProject);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function changeType(next: TxnTypeName) {
    setType(next);
    if (!categoriesFor(next).includes(category)) setCategory(defaultCategory(next));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = TransactionFields.safeParse({
      projectId,
      type,
      category,
      amount: toAsciiDigits(amount).replace(/,/g, ""),
      note,
      date,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(
        field === "amount"
          ? "টাকার পরিমাণ ঠিক নেই।"
          : field === "projectId"
            ? "একটি প্রজেক্ট বেছে নিন।"
            : errorMessage("VALIDATION_FAILED"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    // Saved on the phone at once; it reaches the server on the next sync.
    await saveEntry("transaction", id, parsed.data, me.user.id);
    setBusy(false);
    writeLocal(lastCategoryKey(type), category);
    writeLocal(LAST_PROJECT, projectId);
    router.push("/accounts");
  }

  async function onDelete() {
    if (!confirm("এই হিসাবটি মুছে ফেলবেন?")) return;
    setBusy(true);
    await deleteEntry("transaction", id, me.user.id);
    router.push("/accounts");
  }

  async function onDiscard() {
    if (!confirm("এই বদলটি বাতিল করবেন? সার্ভারে যা আছে সেটিই থাকবে।")) return;
    await discardLocal("transaction", id);
    router.push("/accounts");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 px-4 pb-6">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ধরন">
        {(
          [
            ["EXPENSE", "খরচ"],
            ["INCOME", "আয়"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => changeType(value)}
            className={`h-14 rounded-lg border-2 text-xl font-bold ${
              type === value
                ? value === "EXPENSE"
                  ? "border-danger bg-danger text-white"
                  : "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="টাকার পরিমাণ (৳)">
        <input
          inputMode="decimal"
          autoComplete="off"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="০"
          className={`${inputClass} text-2xl font-bold`}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-semibold">খাত</span>
        <Chips
          label="খাত"
          options={categoriesFor(type).map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={setCategory}
        />
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
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className={inputClass}
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
