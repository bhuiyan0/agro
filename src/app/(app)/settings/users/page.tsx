"use client";

import { useState, type FormEvent } from "react";
import { useApp } from "@/components/app-shell";
import {
  Chips,
  ErrorBox,
  Field,
  inputClass,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { api, type Role, type User } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";
import { withDigits } from "@/lib/numerals";
import { useFetch } from "@/lib/use-fetch";

const ROLE_OPTIONS = [
  { value: "MANAGER", label: "ম্যানেজার" },
  { value: "OWNER", label: "মালিক" },
] as const;

/** Owner only: add users, rename them, change their role and set a new password. */
export default function UsersSettingsPage() {
  const { isOwner, reload: reloadApp } = useApp();
  const users = useFetch<{ users: User[] }>(isOwner ? "/api/users" : null);

  if (!isOwner) {
    return (
      <main>
        <PageHeader title="ব্যবহারকারী" />
        <div className="px-4">
          <ErrorBox message={errorMessage("FORBIDDEN")} />
        </div>
      </main>
    );
  }

  const refresh = async () => {
    users.reload();
    await reloadApp();
  };

  return (
    <main className="flex flex-col gap-4 pb-6">
      <PageHeader title="ব্যবহারকারী" />
      <NewUser onCreated={refresh} />
      <ErrorBox message={users.error} />
      <ul className="flex flex-col gap-3 px-4">
        {users.data?.users.map((u) => (
          <UserCard key={u.id} user={u} onChanged={refresh} />
        ))}
      </ul>
    </main>
  );
}

function NewUser({ onCreated }: { onCreated: () => Promise<void> }) {
  const { me } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    // A new manager joins every active project; the owner can narrow it under প্রজেক্ট.
    const projectIds = me.projects.filter((p) => p.isActive).map((p) => p.id);
    const result = await api("/api/users", {
      method: "POST",
      body: { name, phone, password, role, projectIds },
    });
    setBusy(false);
    if (!result.ok) {
      return setError(
        result.code === "VALIDATION_FAILED"
          ? withDigits("নাম, সঠিক ফোন নম্বর এবং কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।")
          : errorMessage(result.code),
      );
    }
    setName("");
    setPhone("");
    setPassword("");
    setError(null);
    setOpen(false);
    await onCreated();
  }

  if (!open) {
    return (
      <div className="px-4">
        <PrimaryButton type="button" onClick={() => setOpen(true)}>
          + নতুন ব্যবহারকারী
        </PrimaryButton>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mx-4 flex flex-col gap-4 rounded-lg border-2 border-primary p-4">
      <Field label="নাম">
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="ফোন নম্বর">
        <input
          required
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={withDigits("০১XXXXXXXXX")}
          className={inputClass}
        />
      </Field>
      <Field label={withDigits("পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)")}>
        <input
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Chips label="ভূমিকা" options={ROLE_OPTIONS} value={role} onChange={setRole} />
      <ErrorBox message={error} />
      <PrimaryButton disabled={busy}>যোগ করুন</PrimaryButton>
      <SecondaryButton onClick={() => setOpen(false)}>বাতিল</SecondaryButton>
    </form>
  );
}

function UserCard({ user, onChanged }: { user: User; onChanged: () => Promise<void> }) {
  const { me } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const body: Record<string, string> = {};
    if (name.trim() !== user.name) body.name = name;
    if (role !== user.role) body.role = role;
    if (password) body.password = password;
    if (Object.keys(body).length === 0) {
      setBusy(false);
      return;
    }
    const result = await api(`/api/users/${user.id}`, { method: "PATCH", body });
    setBusy(false);
    if (!result.ok) {
      return setError(
        result.code === "VALIDATION_FAILED"
          ? withDigits("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।")
          : errorMessage(result.code),
      );
    }
    setPassword("");
    setError(null);
    setSaved(true);
    await onChanged();
  }

  return (
    <li className="rounded-lg border-2 border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between px-4 text-left"
      >
        <span className="flex flex-col">
          <span className="font-semibold">
            {user.name}
            {user.id === me.user.id ? " (আপনি)" : ""}
          </span>
          <span className="text-sm text-muted">{withDigits(user.phone)}</span>
        </span>
        <span className="text-muted">{user.role === "OWNER" ? "মালিক" : "ম্যানেজার"}</span>
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
          <Chips label="ভূমিকা" options={ROLE_OPTIONS} value={role} onChange={setRole} />
          <Field label="নতুন পাসওয়ার্ড (বদলাতে চাইলে)">
            <input
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <ErrorBox message={error} />
          {saved && <p className="font-semibold text-primary">সংরক্ষণ হয়েছে।</p>}
          <PrimaryButton type="button" onClick={save} disabled={busy || !name.trim()}>
            সংরক্ষণ করুন
          </PrimaryButton>
        </div>
      )}
    </li>
  );
}
