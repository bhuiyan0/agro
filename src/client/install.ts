// "Install the app" support. Chrome on Android fires `beforeinstallprompt`
// once the app is installable; keeping that event lets Settings offer an
// install button. Nothing is shown where the browser does not offer it.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  installed = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  window.addEventListener("beforeinstallprompt", (e) => {
    // Show our own button instead of the browser's mini bar.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export type InstallState = "available" | "installed" | "unavailable";

export function getInstallState(): InstallState {
  if (installed) return "installed";
  return deferred ? "available" : "unavailable";
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Show the browser's install dialog. Resolves true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === "accepted";
}
