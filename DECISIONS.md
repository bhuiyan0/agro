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

## 2026-10-16: Milestone 2 (online CRUD)

- **App-wide role on `User` (OWNER or MANAGER).** Chosen by the owner. OWNER creates and archives projects and manages users and memberships. Owners are members of every project automatically, so "the owner sees everything" always holds. Access to a project's data still comes from `ProjectMember`, so managers see only their projects.
- **The last owner cannot be demoted.** Otherwise nobody could manage the app.
- **Categories and work types as listed in CLAUDE.md**, confirmed by the owner. They live in `src/lib/categories.ts`. The server only accepts listed values, so typos do not split the reports.
- **Entries are created with the device's UUID, and a repeated create returns the existing row (200).** This is the groundwork for offline sync in milestone 3.
- **Update is a full replace (PUT), not a partial patch.** Category validity depends on the type, and the sync outbox will carry whole rows anyway.
- **Updating a deleted entry fails with `ROW_DELETED` (409); deleting twice succeeds.** This matches the conflict rule in CLAUDE.md section 6.
- **Archived projects are read-only.** Old entries stay visible; new entries, edits and deletes are refused (`PROJECT_ARCHIVED`).
- **Amounts travel as strings ("1250.50").** This avoids floating-point rounding; client totals are summed in paisa.
- **Lists are filtered by month and capped at 1000 rows.**
- **Edit pages take the id as a query parameter (`/accounts/edit?id=`).** Every screen stays a static page, which milestone 3 can cache for offline use.
- **Last used category, work type and project are remembered per phone** (localStorage), so the most common entry needs only the amount and a tap on save.
- **New managers join every active project by default**; the owner can narrow this per project.
- **Plots have no API or UI yet.** The schema keeps `plotId`; the server checks a given plot belongs to the project. No screen in section 7 asks for plots.

## 2026-10-16: Milestone 3 (offline and sync)

- **Screens read and write only the phone's IndexedDB (Dexie).** Every save writes the row and an outbox entry in one IndexedDB transaction, so the UI never waits for the network. Owner-only settings (projects, users) stay online-only.
- **One database transaction per pushed mutation, not one for the whole batch.** The spec asks for ordered application in a transaction; a whole-batch transaction would let one refused entry undo the accepted ones. Each mutation and its `ProcessedMutation` record commit together, in the order sent, so a mutation is applied exactly once however often it is re-sent.
- **The sync push reuses the REST service functions** (same validation and permission checks). An AsyncLocalStorage-held transaction client (`getDb()`) lets them run inside the push transaction without threading a client through every call.
- **Push results: applied, conflict or rejected, each with the server's current row.** An edit to a row deleted on the other phone is a conflict: the delete stands and the phone shows a notice. A refused create or edit stays on the phone, marked, with "save again" and "discard" in the form.
- **Pull holds back rows younger than five seconds** (database clock). Without it, a slow transaction could commit a row with an `updatedAt` older than the cursor and be missed for good. The phone's own changes return in the push results, so only the other phone's changes wait.
- **Pull starts over when the user's projects change.** The cursor carries a fingerprint of the project set; being added to a project would otherwise never deliver its older rows.
- **Two cursors, one per table**, each the `(updatedAt, id)` tuple from the spec, packed into one opaque string.
- **Sync triggers:** app open, `online`, app back in the foreground, 1.5 s after each change, and the sync button. Failures retry after 2 s, 4 s, 8 s ... up to 5 minutes, with jitter. Web Locks keep one sync running at a time across tabs and the service worker.
- **Background Sync** is registered after each change; the service worker then runs the same sync engine if the app was closed first. Nothing depends on it.
- **Logout needs a connection, warns about unsent changes and clears the phone's data.** Logging in as a different user on the same phone also clears it, so data is never mixed.
- **Cache Components turned off.** No screen uses it (all are client components reading IndexedDB), and Serwist's Turbopack route needs the `force-static` segment option that Cache Components forbids.
- **Serwist via `@serwist/turbopack`**, which needs `esbuild` (added as a dev dependency) to bundle the worker. The worker is hand-configured rather than using Serwist's default cache rules: all pages and built assets are precached, query strings are ignored when matching, and the API is never cached.
- **Serwist's "reload when back online" is off.** It would throw away a half-filled form.
- **App icons** are a white leaf on green, generated as PNGs (192, 512 and a maskable 512).
- **Client sync tests use `fake-indexeddb` (dev only)**, approved by the owner. They run the real sync engine against the real route handlers and test database, so they cover the phone and the server together.
- **When a pull starts over, rows changed after the server's settle cutoff are kept**, and the new cursor is stored only after the last page. The first version removed every synced row the restart did not send, which briefly dropped a row the phone had just pushed; the client tests caught it.
- **Refused entries are left out of totals and reports** (owner's choice), so both phones show the same numbers. Entries still waiting to be sent do count. Refused entries stay visible in the lists, marked in red.

## 2026-10-16: Milestone 4 (reports and dashboard)

- **Reports are computed on the phone from the local copy**, so they work offline. A server reports endpoint can follow with the web back office; the arithmetic lives in `src/lib/report.ts` and can be reused there.
- **Simple bars, no chart library** (owner's choice): no new dependency, light on a low-end phone.
- **A six-month trend** under the chosen month (owner's choice).
- **Money only on the Reports screen**, as in the spec (owner's choice); no work summary.
- **Home also shows this month's expense, income and profit/loss** (owner's choice), linking to Reports.
- **"All projects" counts each entry exactly once:** totals are a plain sum over distinct entries (de-duplicated by id), and a test checks that the per-project lines add up to the all-projects total.
- **Totals leave out deleted and server-refused entries; entries still waiting to be sent count.**
- **Profit or loss is labelled "লাভ" / "ক্ষতি"** with an explicit sign.
- **Reports is a fifth tab** in the bottom bar and is precached for offline use.
