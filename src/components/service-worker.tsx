"use client";

import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";
// Loaded on every page so the install prompt is caught as soon as it fires.
import "@/client/install";

// Registers the service worker in production. Serwist's defaults would
// reload the page when the connection returns, which would throw away a
// half-filled form, so that is turned off; pages are precached instead of
// cached on navigation.
export function ServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      // The Android test APK serves its files from inside the app.
      disable={process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_APK === "1"}
      register={false}
      reloadOnOnline={false}
      cacheOnNavigation={false}
    >
      <Register />
      {children}
    </SerwistProvider>
  );
}

// Registering ourselves lets a refusal (private browsing, blocked by
// settings) fail quietly: the app still works online without it.
function Register() {
  const { serwist } = useSerwist();
  useEffect(() => {
    serwist?.register().catch(() => {});
  }, [serwist]);
  return null;
}
