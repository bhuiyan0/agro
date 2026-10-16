import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

// Cache Components is off: every screen is a client component that reads
// from IndexedDB, so nothing uses it, and Serwist's service-worker route
// needs the route segment options it forbids.
const nextConfig: NextConfig = {
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
