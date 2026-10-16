# Project Green Hill App: Build Instructions

Read this whole file before writing any code. Follow it milestone by milestone. When something is marked "OPEN", ask the owner before deciding.

## 1. What we are building

A mobile-first, offline-first app to manage the daily accounts and work reports of a garden/farm in Sreemangal, Bangladesh. One app, used for everything, by two people on their own phones:

- **Owner (Mamun):** sees and manages everything, across all projects.
- **Field manager (his younger brother):** works in the garden, enters data on site, and can also see and manage everything in the app.

Mental model: a pocket notebook that always works, even with no signal, and merges into one shared ledger when the internet returns.

## 2. Scope of v1

In scope:
- Login
- Multiple **projects** inside the garden (example: "Garden fruit" for the whole garden, and "Farm" as a separate project inside it). Each project has its own separately maintained accounts.
- **Daily accounts** (expenses and income) per project
- **Work reports** (daily work log) per project
- Home dashboard and summary reports (per project, and all projects combined)
- Offline create, view, edit and delete, with two-way sync
- Bengali UI

Out of scope for v1 (do NOT build, but do not make them hard to add later):
- Web back office (comes later; it will reuse the same API, so keep the API clean and UI-independent)
- Public-facing site, product listing, orders
- Crop or plot condition tracking (explicitly dropped)
- Shared or split expenses across projects (explicitly dropped: every entry belongs to exactly one project; if a cost serves two projects, the user enters two separate entries)
- Photos: optional, and only after milestone 5 (see section 9)

## 3. Users, constraints, context

- Internet at the farm is **intermittent**. Offline must be a first-class path, not a fallback.
- Android phone is the likely device. OPEN: confirm the brother's phone is Android. If iOS, review PWA storage limits and consider Expo.
- Users are not technical. Fewest possible taps for common entries. Large touch targets.
- Language: Bengali UI (all labels, messages, errors). Code, comments, commit messages and docs in English.
- Currency: BDT (৳). Timezone: Asia/Dhaka. Dates stored as dates (no time-of-day needed for entries). Show Bengali numerals as a user setting, default to Bengali numerals. Store plain numbers.

## 4. Tech stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, built as a **PWA** (installable, service worker, offline). One codebase, mobile-first, responsive layout that still works on larger screens.
- **Backend:** Next.js route handlers (REST, JSON), Prisma, PostgreSQL. Validate every request body with Zod.
- **Offline storage on device:** IndexedDB via Dexie.js.
- **PWA tooling:** Serwist (or the current maintained Next.js service worker option). OPEN: pick one and tell the owner why.
- **Auth:** phone number + password, session via secure httpOnly cookie plus a long-lived refresh so the user stays logged in offline for weeks. OPEN: confirm if a simple PIN is preferred for the field manager.
- **Hosting:** OPEN. Ask the owner. Keep the app deployable on a standard Node host with a managed PostgreSQL.
- If a later check shows iOS storage limits or background sync make PWA unsuitable, the fallback is Expo (React Native) with SQLite, reusing the same API. Do not switch without asking.

## 5. Data model (Prisma, starting point)

Rules for every synced table:
- `id` is a **UUID generated on the device**, so creating offline and syncing twice never creates duplicates.
- `updatedAt` is **set by the server** on every write. Never trust the phone clock for ordering.
- Deletes are **soft** (`deletedAt`).
- Every row records `createdBy` and `updatedBy`.

```prisma
enum Role    { OWNER MANAGER }
enum TxnType { EXPENSE INCOME }

model User {
  id           String   @id @default(uuid())
  name         String
  phone        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  memberships  ProjectMember[]
}

model Project {
  id        String   @id @default(uuid())
  name      String
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  members   ProjectMember[]
  plots     Plot[]
  txns      Transaction[]
  workLogs  WorkLog[]
}

model ProjectMember {
  projectId String
  userId    String
  role      Role   @default(MANAGER)
  project   Project @relation(fields: [projectId], references: [id])
  user      User    @relation(fields: [userId], references: [id])
  @@id([projectId, userId])
}

// Optional sub-area inside a project (a block, a section). Keep it minimal.
model Plot {
  id        String   @id
  projectId String
  name      String
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  createdBy String
  updatedBy String
  project   Project  @relation(fields: [projectId], references: [id])
}

model Transaction {
  id        String   @id
  projectId String
  type      TxnType
  category  String
  amount    Decimal  @db.Decimal(12, 2)
  note      String?
  plotId    String?
  date      DateTime @db.Date
  createdBy String
  updatedBy String
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  project   Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, date])
  @@index([updatedAt, id])
}

model WorkLog {
  id        String   @id
  projectId String
  workType  String
  plotId    String?
  workers   Int?
  hours     Decimal? @db.Decimal(5, 2)
  note      String?
  date      DateTime @db.Date
  createdBy String
  updatedBy String
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  project   Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, date])
  @@index([updatedAt, id])
}
```

Categories: start with preset lists in code, in Bengali, for fast picking.
- Expense: মজুরি, সার, ওষুধ/স্প্রে, বীজ/চারা, পরিবহন, সেচ, যন্ত্রপাতি, অন্যান্য
- Income: বিক্রি, অন্যান্য
- Work types: সেচ, আগাছা পরিষ্কার, সার দেওয়া, স্প্রে, সংগ্রহ, ছাঁটাই, অন্যান্য

OPEN: confirm the final category lists with the owner. Keep them easy to change later (a constants file now, a table later).

## 6. Offline and sync design

Goal: every action works offline; the UI never blocks on the network.

**On the device (Dexie):**
- Local copies of all entities the user can access.
- An **outbox** table of pending mutations: `{ mutationId, entity, op: create|update|delete, data, createdAtLocal }`.
- Every write goes to local tables and the outbox in one transaction, then the UI updates immediately. Show a small "pending" marker on unsynced rows, and a sync status indicator (count of pending items).

**Push:** `POST /api/sync/push` with an array of mutations. The server applies them in order inside a transaction, is **idempotent** (same `mutationId` twice does nothing the second time), checks that the user is a member of the project, and returns per-mutation results.

**Pull:** `GET /api/sync/pull?cursor=...` returns all rows (including soft-deleted) changed since the cursor, for projects the user belongs to. Cursor is the tuple `(updatedAt, id)` of the last row received. Page the results.

**Triggers:** on app open, on regaining connectivity (`online` event), after each local write (debounced), and a manual "sync now" button. Use Background Sync where available, but never depend on it.

**Conflicts:** last write wins, by server receipt order. This is acceptable because there are only two users and entries are mostly append-only. If an update arrives for a row that was soft-deleted, keep it deleted and report the conflict in the result.

**Rules:**
- Never lose a local entry. A failed push stays in the outbox and retries with backoff.
- Show a clear message only when an entry is permanently rejected (validation or permission), and let the user fix it.
- Write tests for: duplicate push, offline create then edit then delete before first sync, two devices editing the same row, pull pagination, and permission checks.

## 7. Screens (v1)

1. **Login**
2. **Home:** project selector at the top ("সব প্রজেক্ট" or one project), today's summary (expense, income, work entries), sync status, and two big buttons: "নতুন হিসাব" and "নতুন কাজের রিপোর্ট".
3. **Accounts:** list grouped by date with filters (project, type, month), plus a new/edit form. The form defaults to the current project, today's date, and the last used category. Amount field with a numeric keypad.
4. **Work reports:** list with filters, plus a new/edit form with work type chips, workers, hours, note.
5. **Reports:** monthly expense vs income, by category, per project, and all projects combined. All-projects view must sum each entry exactly once.
6. **Settings:** manage projects (owner only), manage users and project membership (owner only), numeral style, manual sync, logout.

UI principles: one-handed use, large buttons, minimal typing (chips and pickers over free text), high contrast for sunlight, Bengali labels, graceful empty and error states.

## 8. Permissions

- Both users can see and manage everything in their projects (create, edit, delete).
- Only OWNER can create or archive projects and add or remove members.
- Enforce permissions on the server for every endpoint. Never rely on the UI hiding things.
- Keep `ProjectMember.role` so a more limited role can be added later without a migration of the core tables.

## 9. Milestones

1. **Foundation:** repo, Next.js + TS + Tailwind, Prisma + Postgres, auth, seed (one owner, one manager, two sample projects), CI with lint and tests.
2. **Online CRUD:** projects, accounts, work reports through the API, with the screens in section 7 working online.
3. **Offline and sync:** Dexie, outbox, push/pull, PWA install, sync status UI, and the sync tests from section 6.
4. **Reports and dashboard:** home summary and monthly reports, correct totals across projects.
5. **Polish:** Bengali copy review, numeral setting, empty states, performance on a low-end Android, installability checks.
6. **Photos (optional, later):** attach an optional photo to a work log. Compress on device (about 1024 px wide, WebP or JPEG around 70% quality, target 100-200 KB), queue uploads separately from text sync, upload to object storage (S3-compatible), store only the URL in the database, delete the local copy after upload.

Finish and confirm each milestone with the owner before starting the next.

## 10. Working agreement

- Ask before making any decision marked OPEN, and before adding dependencies that are not listed here.
- Prefer small, reviewable commits. Explain what changed and how to test it in plain language.
- Keep the API independent of the UI, since a web back office will reuse it later.
- Do not add features outside section 2. If something seems needed, propose it first.
- Never commit secrets. Use environment variables and provide an `.env.example`.
- Keep a short `DECISIONS.md` that logs each decision and the reason.
