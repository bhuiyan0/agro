"use client";

import { useState, type FormEvent } from "react";
import { useApp } from "@/components/app-shell";
import { ErrorBox, Field, inputClass, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { api, type Member, type Project, type User } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";
import { useFetch } from "@/lib/use-fetch";

/** Owner only: create, rename and archive projects, and choose which managers belong to each. */
export default function ProjectsSettingsPage() {
  const { me, isOwner, reload } = useApp();
  const users = useFetch<{ users: User[] }>(isOwner ? "/api/users" : null);
  const managers = users.data?.users.filter((u) => u.role === "MANAGER") ?? [];

  if (!isOwner) {
    return (
      <main>
        <PageHeader title="প্রজেক্ট" />
        <div className="px-4">
          <ErrorBox message={errorMessage("FORBIDDEN")} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 pb-6">
      <PageHeader title="প্রজেক্ট" />
      <NewProject managers={managers} onCreated={reload} />
      <ul className="flex flex-col gap-3 px-4">
        {me.projects.map((p) => (
          <ProjectCard key={p.id} project={p} managers={managers} onChanged={reload} />
        ))}
      </ul>
    </main>
  );
}

function ManagerChecklist({
  managers,
  checked,
  onToggle,
}: {
  managers: User[];
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (managers.length === 0) return <p className="text-muted">কোনো ম্যানেজার নেই।</p>;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 font-semibold">ম্যানেজার</legend>
      {managers.map((m) => (
        <label key={m.id} className="flex min-h-12 items-center gap-3 rounded-lg border-2 border-border px-4">
          <input
            type="checkbox"
            checked={checked.has(m.id)}
            onChange={() => onToggle(m.id)}
            className="h-6 w-6 accent-primary"
          />
          <span>{m.name}</span>
        </label>
      ))}
    </fieldset>
  );
}

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function NewProject({ managers, onCreated }: { managers: User[]; onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // New projects include every manager unless unticked.
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checked = new Set(managers.map((m) => m.id).filter((id) => !unticked.has(id)));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await api("/api/projects", { method: "POST", body: { name, memberIds: [...checked] } });
    setBusy(false);
    if (!result.ok) return setError(errorMessage(result.code));
    setName("");
    setOpen(false);
    setError(null);
    await onCreated();
  }

  if (!open) {
    return (
      <div className="px-4">
        <PrimaryButton type="button" onClick={() => setOpen(true)}>
          + নতুন প্রজেক্ট
        </PrimaryButton>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mx-4 flex flex-col gap-4 rounded-lg border-2 border-primary p-4">
      <Field label="প্রজেক্টের নাম">
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>
      <ManagerChecklist
        managers={managers}
        checked={checked}
        onToggle={(id) => setUnticked(toggle(unticked, id))}
      />
      <ErrorBox message={error} />
      <PrimaryButton disabled={busy}>তৈরি করুন</PrimaryButton>
      <SecondaryButton onClick={() => setOpen(false)}>বাতিল</SecondaryButton>
    </form>
  );
}

function ProjectCard({
  project,
  managers,
  onChanged,
}: {
  project: Project;
  managers: User[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const members = useFetch<{ members: Member[] }>(open ? `/api/projects/${project.id}/members` : null);
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const memberSet =
    checked ?? new Set(members.data?.members.filter((m) => m.role === "MANAGER").map((m) => m.id) ?? []);

  async function run(call: () => Promise<{ ok: boolean; code?: string }>) {
    setBusy(true);
    setSaved(false);
    const result = await call();
    setBusy(false);
    if (!result.ok) return setError(errorMessage(result.code));
    setError(null);
    setSaved(true);
    await onChanged();
  }

  const save = () =>
    run(async () => {
      const r = await api(`/api/projects/${project.id}`, { method: "PATCH", body: { name } });
      if (!r.ok) return r;
      return api(`/api/projects/${project.id}/members`, { method: "PUT", body: { userIds: [...memberSet] } });
    });

  const setActive = (isActive: boolean) =>
    run(() => api(`/api/projects/${project.id}`, { method: "PATCH", body: { isActive } }));

  return (
    <li className="rounded-lg border-2 border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between px-4 text-left"
      >
        <span className="font-semibold">{project.name}</span>
        <span className="text-muted">{project.isActive ? "চালু" : "আর্কাইভ"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t-2 border-border p-4">
          <Field label="নাম">
            <input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          {members.loading && !members.data ? (
            <p className="text-muted">লোড হচ্ছে...</p>
          ) : (
            <ManagerChecklist
              managers={managers}
              checked={memberSet}
              onToggle={(id) => setChecked(toggle(memberSet, id))}
            />
          )}
          <ErrorBox message={error ?? members.error} />
          {saved && <p className="font-semibold text-primary">সংরক্ষণ হয়েছে।</p>}
          <PrimaryButton type="button" onClick={save} disabled={busy || !name.trim()}>
            সংরক্ষণ করুন
          </PrimaryButton>
          {project.isActive ? (
            <SecondaryButton
              danger
              disabled={busy}
              onClick={() =>
                confirm("প্রজেক্টটি আর্কাইভ করবেন? পুরনো হিসাব দেখা যাবে, নতুন কিছু যোগ করা যাবে না।") &&
                setActive(false)
              }
            >
              আর্কাইভ করুন
            </SecondaryButton>
          ) : (
            <SecondaryButton disabled={busy} onClick={() => setActive(true)}>
              আবার চালু করুন
            </SecondaryButton>
          )}
        </div>
      )}
    </li>
  );
}
