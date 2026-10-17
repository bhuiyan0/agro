import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

// NEXT_PUBLIC_APK=1 builds the Android test APK's web files: a static export
// with demo mode and no server. Only `.tsx` files count as routes then, so
// the API route handlers (`route.ts`) and the web manifest are left out.
// Its type check is skipped: route types are not generated for the left-out
// handlers, and the normal build and CI type-check everything anyway.
const apk = process.env.NEXT_PUBLIC_APK === "1";

// Cache Components is off: every screen is a client component that reads
// from IndexedDB, so nothing uses it, and Serwist's service-worker route
// needs the route segment options it forbids.
const nextConfig: NextConfig = {
  ...(apk && {
    output: "export",
    trailingSlash: true,
    pageExtensions: ["tsx"],
    typescript: { ignoreBuildErrors: true },
  }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
