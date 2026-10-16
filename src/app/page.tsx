"use client";

// Milestone 1 placeholder for the home screen: confirms the login works and
// lists the user's projects. The real dashboard comes in milestones 2 and 4.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";

const ROLE_LABEL = { OWNER: "মালিক", MANAGER: "ম্যানেজার" } as const;

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me").then((result) => {
      if (result.ok) setMe(result.data);
      else if (result.status === 401) router.replace("/login");
      else setError(errorMessage(result.code));
    });
  }, [router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.replace("/login");
  }

  if (error) return <p className="p-5 font-semibold text-danger">{error}</p>;
  if (!me) return <p className="p-5 text-muted">লোড হচ্ছে...</p>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">স্বাগতম, {me.user.name}</h1>
        <button onClick={logout} className="h-12 rounded-lg border-2 border-border px-4 font-semibold">
          লগআউট
        </button>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">আপনার প্রজেক্ট</h2>
        {me.projects.length === 0 ? (
          <p className="text-muted">কোনো প্রজেক্ট নেই।</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {me.projects.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border-2 border-border px-4 py-3"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted">{ROLE_LABEL[p.role]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
