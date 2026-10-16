import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run against a separate database (TEST_DATABASE_URL) that
// tests/global-setup.ts migrates before the run. Never point it at real data:
// the integration tests empty every table.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
    // Integration test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
