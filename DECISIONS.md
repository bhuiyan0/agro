# Decisions

Each entry: what was decided, and why. Newest at the bottom.

## 2026-10-16: Milestone 1 (foundation)

- **Device: Android, PWA.** Confirmed by the owner: the field manager uses Android, so the PWA plan stands and Expo is not needed.
- **Login: phone number + password for both users.** Confirmed by the owner (no PIN).
- **Hosting: Vercel + Neon (managed PostgreSQL).** Chosen by the owner. The app has no Vercel-specific code, so it still runs on any Node host with PostgreSQL.
- **PWA tooling: Serwist.** Approved by the owner. It is the maintained successor to next-pwa, supports the App Router and handles precaching and Background Sync. It will be added in milestone 3.
- **Versions: Next.js 16 (App Router, Cache Components on), Prisma 7, Zod 4, Tailwind 4, Node 22.** The current stable releases. Prisma 7 talks to Postgres through the `@prisma/adapter-pg` driver adapter, which adds `pg` as a dependency.
- **Password hashing: scrypt from Node's standard library.** Avoids a native or extra dependency (bcrypt/argon2). The stored string carries its cost parameters, so they can be raised later.
- **Sessions: random token in an httpOnly cookie, SHA-256 hash in a `Session` table, 90 days, sliding.** The spec asks for a cookie plus a long-lived refresh. One sliding session does the same job with less code: any request with fewer than 60 days left extends it to 90. Logout and "log out this phone" are a row delete. A stolen database does not expose live sessions.
- **Login lockout: five wrong passwords in a row lock the account for 15 minutes.** The app is on the public internet; this stops password guessing without adding a rate-limit service. Unknown phone numbers get the same error and the same response time as a wrong password.
- **CSRF: SameSite=Lax cookie.** Browsers do not send the cookie on cross-site POSTs, and all API writes are POST/PUT/DELETE with JSON. Revisit if the web back office ever runs on another domain.
- **Phone numbers stored as 11 digits (01XXXXXXXXX).** Input accepts Bengali digits, spaces, dashes and the +880 prefix.
- **API returns error codes, not text.** The client maps codes to Bengali (`src/lib/messages.ts`), so the future web back office can reuse the API.
- **UI pages are client components; the server only serves the API.** The offline app shell must load without the server (milestone 3), so pages are static and fetch data from the API (later from IndexedDB).
- **Font: Noto Sans Bengali via `next/font`.** Self-hosted at build time, so it works offline once cached.
- **Dev dependencies added beyond the spec:** Vitest (tests, required by "CI with lint and tests"), tsx (runs the TypeScript seed), Prettier (formatting). All dev-only.
- **Tests run against a separate database (`TEST_DATABASE_URL`).** The integration tests call the route handlers directly and empty every table between tests.
- **Seed:** one owner and one manager from environment variables (no passwords in the repo), and two projects, "বাগানের ফল" and "খামার", both users members. Re-running the seed changes nothing.
- **Added to the spec schema:** `Session` table, `User.failedLogins` and `User.lockedUntil`, an index on `ProjectMember.userId` and on `Plot(updatedAt, id)` for sync pulls.
