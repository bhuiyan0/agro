/// <reference lib="webworker" />
// The service worker. Bundled by Serwist from this file at build time and
// served at /serwist/sw.js.
//
// - Every page and every built asset is precached, so the app opens with no
//   connection. Pages are static; query strings (`/accounts/edit?id=…`) are
//   ignored when matching, so any entry can be opened offline.
// - The API is never cached: data offline comes from IndexedDB.
// - Background Sync: when the app queued changes and was closed before they
//   were sent, the browser wakes this worker once the phone is online again.
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { syncOnce } from "@/client/sync-engine";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    ignoreURLParametersMatching: [/.*/],
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
  ],
});

serwist.addEventListeners();

type SyncEvent = ExtendableEvent & { tag: string };
self.addEventListener("sync", (event) => {
  const e = event as SyncEvent;
  // A rejected promise tells the browser to try again later.
  if (e.tag === "green-hill-sync") e.waitUntil(syncOnce());
});
