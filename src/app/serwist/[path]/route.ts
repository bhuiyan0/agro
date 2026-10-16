// Builds and serves the service worker (Serwist's Turbopack integration).
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

// Every screen is a static page; precaching them is what lets the app open
// offline. Keep this list in step with the pages under src/app.
const PAGES = [
  "/",
  "/login",
  "/accounts",
  "/accounts/new",
  "/accounts/edit",
  "/work",
  "/work/new",
  "/work/edit",
  "/settings",
  "/settings/projects",
  "/settings/users",
];

// A new revision per build makes phones fetch the new pages after a deploy.
function buildRevision() {
  try {
    return readFileSync(".next/BUILD_ID", "utf8").trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();
  }
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: PAGES.map((url) => ({ url, revision: buildRevision() })),
});
