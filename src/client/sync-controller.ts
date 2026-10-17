// Decides when to sync in the app (CLAUDE.md section 6, "Triggers"): on app
// open, when the connection returns, when the app comes back to the
// foreground, shortly after each local change, and on "sync now". Failures
// retry with backoff. Background Sync in the service worker is a bonus on
// top; nothing depends on it.
// The Android test APK has no server, so it never syncs.
import { DEMO_AVAILABLE } from "@/client/demo";
import { AuthError, syncOnce } from "@/client/sync-engine";

export type SyncState = {
  running: boolean;
  online: boolean;
  /** "auth": logged out on the server; "network": last try failed and will retry. */
  problem: "auth" | "network" | null;
  nextRetryAt: number | null;
};

let state: SyncState = { running: false, online: true, problem: null, nextRetryAt: null };
const listeners = new Set<() => void>();
let started = false;
let again = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSyncState = () => state;

// 2 s, 4 s, 8 s ... up to 5 minutes, with some jitter so two phones do not
// retry in lockstep.
function backoff(n: number) {
  const base = Math.min(2000 * 2 ** n, 5 * 60 * 1000);
  return base / 2 + Math.random() * (base / 2);
}

export async function syncNow(): Promise<void> {
  if (DEMO_AVAILABLE) return;
  if (state.running) {
    again = true;
    return;
  }
  clearTimeout(retryTimer);
  set({ running: true, nextRetryAt: null });
  try {
    await syncOnce();
    failures = 0;
    set({ problem: null });
  } catch (err) {
    if (err instanceof AuthError) {
      set({ problem: "auth" });
    } else {
      const delay = backoff(failures++);
      set({ problem: "network", nextRetryAt: Date.now() + delay });
      retryTimer = setTimeout(syncNow, delay);
    }
  } finally {
    set({ running: false });
  }
  if (again) {
    again = false;
    void syncNow();
  }
}

/** Ask for a sync soon. Called after every local change. */
export function requestSync() {
  if (typeof window === "undefined" || DEMO_AVAILABLE) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(syncNow, 1500);
  // Lets the service worker finish the push if the app is closed first.
  navigator.serviceWorker?.ready
    .then((reg) =>
      (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync?.register(
        "green-hill-sync",
      ),
    )
    .catch(() => {});
}

/** Start the triggers once per page load, and sync. */
export function startSync() {
  if (typeof window === "undefined" || DEMO_AVAILABLE) return;
  // Opening the app again (for example after logging in) syncs again.
  if (started) return void syncNow();
  started = true;
  set({ online: navigator.onLine });
  window.addEventListener("online", () => {
    set({ online: true });
    failures = 0;
    void syncNow();
  });
  window.addEventListener("offline", () => set({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  void syncNow();
}
