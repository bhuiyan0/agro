"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-shell";
import { PageHeader, SecondaryButton } from "@/components/ui";
import { api } from "@/lib/api-client";

// Numeral style (milestone 5) and manual sync (milestone 3) are added here later.
export default function SettingsPage() {
  const router = useRouter();
  const { me, isOwner } = useApp();

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.replace("/login");
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="সেটিংস" />
      <section className="mx-4 rounded-lg border-2 border-border p-4">
        <p className="text-xl font-bold">{me.user.name}</p>
        <p className="text-muted">
          {me.user.phone} · {isOwner ? "মালিক" : "ম্যানেজার"}
        </p>
      </section>

      {isOwner && (
        <nav className="flex flex-col gap-2 px-4">
          <SettingsLink href="/settings/projects">প্রজেক্ট</SettingsLink>
          <SettingsLink href="/settings/users">ব্যবহারকারী</SettingsLink>
        </nav>
      )}

      <div className="flex flex-col px-4 pt-4">
        <SecondaryButton onClick={logout}>লগআউট</SecondaryButton>
      </div>
    </main>
  );
}

function SettingsLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="flex h-14 items-center justify-between rounded-lg border-2 border-border px-4 text-lg font-semibold"
    >
      {children}
      <span aria-hidden>›</span>
    </Link>
  );
}
