# Deploying Green Hill (Vercel + Neon)

Steps for the first deploy. They need your own Vercel and Neon accounts, so you do the clicking; the commands run on your computer. Nothing here is a secret: passwords and connection strings go into Vercel or your terminal, never into the repository.

Checked in development: a clean install and build with no `.env` works (as on Vercel), and the migrations plus the seed run cleanly on an empty database (as on a new Neon database).

## 0. Before you start

- The code must be on GitHub (`bhuiyan0/agro`). Vercel deploys from there.
- Decide which branch is production. Vercel deploys the default branch (usually `main`) to the live address; every other branch gets a preview address.

## 1. Create the database (Neon)

1. Sign up at https://neon.tech and create a project named `green-hill`.
2. **Region: AWS Asia Pacific (Singapore).** It is the closest to Sreemangal, and Vercel can run in Singapore too.
3. Copy two connection strings from the project dashboard:
   - the **pooled** one (the host contains `-pooler`): the app uses this one;
   - the **direct** one (no `-pooler`): migrations use this one.

## 2. Create the tables

On your computer, in the project folder:

```sh
npm ci
DATABASE_URL="<direct connection string>" npm run db:deploy
```

It should end with "All migrations have been successfully applied."

## 3. Create the two users and the projects

Pick the real names, phone numbers and passwords (at least 6 characters). They are only typed into your terminal:

```sh
DATABASE_URL="<direct connection string>" \
SEED_OWNER_NAME="Mamun" SEED_OWNER_PHONE="01XXXXXXXXX" SEED_OWNER_PASSWORD="…" \
SEED_MANAGER_NAME="…" SEED_MANAGER_PHONE="01XXXXXXXXX" SEED_MANAGER_PASSWORD="…" \
npm run db:seed
```

This creates the owner, the manager, and the projects "বাগানের ফল" and "খামার" (rename or archive them later under সেটিংস → প্রজেক্ট). Running it again changes nothing. Passwords can later be changed in the app under সেটিংস → ব্যবহারকারী.

## 4. Create the app (Vercel)

1. Sign up at https://vercel.com with your GitHub account and choose **Add New → Project → Import** `bhuiyan0/agro`.
2. Framework: Next.js (detected). Leave the build settings as they are.
3. **Environment variables:** add `DATABASE_URL` = the **pooled** connection string, for Production (and Preview, if previews should use the same database).
4. **Function region:** in the project settings, set the functions region to **Singapore (sin1)**, next to the database (the menu is under Settings → Functions at the time of writing; names may differ slightly).
5. Deploy. The address will look like `https://green-hill-….vercel.app`.

## 5. Check it

On each Android phone, in Chrome:

1. Open the address and log in.
2. সেটিংস → **অ্যাপ ইনস্টল করুন** (or Chrome menu → Add to Home screen).
3. Add an entry, switch on airplane mode, add another, open and close the app, switch airplane mode off: both entries should show on the other phone within a minute.

## Later deploys

Every push to the production branch deploys automatically. When a change adds a migration (a new folder under `prisma/migrations`), run step 2 again **before** pushing, so the new code never meets an old database. Phones pick up the new version the next time the app is opened online.

## Costs

Both free tiers cover two users comfortably. Neon's free tier suspends an idle database and wakes it on the next request, so the first sync after a quiet night can take a little longer; nothing is lost, and the phone retries on its own. Check both providers' current free-tier limits when you sign up; they change from time to time.
