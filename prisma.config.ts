import { defineConfig } from "prisma/config";

// The Prisma CLI does not read .env on its own. Node's built-in loader
// avoids a dotenv dependency; in CI and on Vercel the variables are already
// set, so a missing file is fine.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
