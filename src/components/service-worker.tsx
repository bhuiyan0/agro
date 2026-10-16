"use client";

import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

// Registers the service worker in production. Serwist's defaults would
// reload the page when the connection returns, which would throw away a
// half-filled form, so that is turned off; pages are precached instead of
// cached on navigation.
export function ServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV !== "production"}
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
