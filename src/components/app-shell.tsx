"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { clearLocalData, getMeta, setMeta } from "@/client/local-db";
import { startSync } from "@/client/sync-controller";
import { useLiveQuery } from "@/client/use-live-query";
import { SyncBar } from "@/components/sync-status";
import { api, type Me } from "@/lib/api-client";
import { errorMessage } from "@/lib/messages";

// "all" or a project id. Kept per phone so the app reopens where it was left.
const SELECTED_KEY = "gh.selectedProject";

type AppState = {
  me: Me;
  isOwner: boolean;
  selected: string;
  setSelected: (value: string) => void;
  reload: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = use(AppContext);
  if (!value) throw new Error("useApp must be used inside AppShell");
  return value;
}

function readSelected(): string {
  try {
    return localStorage.getItem(SELECTED_KEY) ?? "all";
  } catch {
    return "all";
  }
}

const NAV = [
  { href: "/", label: "হোম" },
  { href: "/accounts", label: "হিসাব" },
  { href: "/work", label: "কাজ" },
  { href: "/reports", label: "রিপোর্ট" },
  { href: "/settings", label: "সেটিংস" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // The user and their projects come from the phone first, so the app opens
  // offline; the server copy replaces it whenever there is a connection.
  const cached = useLiveQuery(async () => ({ me: (await getMeta("me")) ?? null }), []);
  const me = cached?.me ?? null;
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelectedState] = useState("all");

  const reload = useCallback(async () => {
    const result = await api<Me>("/api/auth/me");
    if (result.ok) {
      const previous = await getMeta("me");
      // Another person logged in on this phone: never mix their data.
      if (previous && previous.user.id !== result.data.user.id) await clearLocalData();
      await setMeta("me", result.data);
      setError(null);
    } else if (result.status === 401) router.replace("/login");
    else if (!(await getMeta("me"))) setError(errorMessage(result.code));
  }, [router]);

  useEffect(() => {
    // Reading localStorage must wait until after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedState(readSelected());
    void reload().then(startSync);
  }, [reload]);

  const setSelected = useCallback((value: string) => {
    setSelectedState(value);
    try {
      localStorage.setItem(SELECTED_KEY, value);
    } catch {}
  }, []);

  if (error && !me) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
        <p className="font-semibold text-danger">{error}</p>
        <button onClick={reload} className="h-12 rounded-lg border-2 border-border px-5 font-semibold">
          আবার চেষ্টা করুন
        </button>
      </main>
    );
  }
  if (!me) return <p className="p-5 text-muted">লোড হচ্ছে...</p>;

  // A project that was removed or that the user lost access to falls back to "all".
  const effective = selected === "all" || me.projects.some((p) => p.id === selected) ? selected : "all";

  return (
    <AppContext value={{ me, isOwner: me.user.role === "OWNER", selected: effective, setSelected, reload }}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-20">
        <SyncBar />
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t-2 border-border bg-background">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 items-center justify-center font-semibold ${
                    active ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </AppContext>
  );
}
