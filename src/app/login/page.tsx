"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api("/api/auth/login", { method: "POST", body: { phone, password } });
    setBusy(false);
    if (result.ok) router.replace("/");
    else setError(errorMessage(result.code));
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
      <div>
        <h1 className="text-3xl font-bold text-primary">গ্রিন হিল</h1>
        <p className="mt-1 text-muted">বাগানের হিসাব ও কাজের রিপোর্ট</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">ফোন নম্বর</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="username"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="০১XXXXXXXXX"
            className="h-14 rounded-lg border-2 border-border px-4 text-xl focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">পাসওয়ার্ড</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-lg border-2 border-border px-4 text-xl focus:border-primary focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg border-2 border-danger px-4 py-3 font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="h-14 rounded-lg bg-primary text-xl font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "অপেক্ষা করুন..." : "লগইন"}
        </button>
      </form>
    </main>
  );
}
