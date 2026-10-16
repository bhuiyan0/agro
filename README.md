# Green Hill

Offline-first app for the daily accounts and work reports of the Green Hill garden in Sreemangal. The full brief is in [CLAUDE.md](CLAUDE.md); decisions and their reasons are in [DECISIONS.md](DECISIONS.md).

Status: all five v1 milestones are built. Waiting on a Bengali copy review (`COPY.md`) and a check on a real Android phone. Photos (milestone 6) are optional and not started.

## Run it locally

You need Node 22 and PostgreSQL 16.

1. Create two databases, one for development and one for tests:
   ```sh
   createdb agro
   createdb agro_test
   ```
2. Copy `.env.example` to `.env` and fill in the database URLs and the two seed users.
3. Install, create the tables and add the seed data:
   ```sh
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. Start the app and open http://localhost:3000 on your phone or in the browser:
   ```sh
   npm run dev
   ```
   Log in with the owner's or manager's phone number and password from `.env`.

## Checks

```sh
npm run lint
npm run format:check
npm run typecheck
npm test          # uses TEST_DATABASE_URL, empties it on every run
npm run build
```

CI runs the same steps on every push.

## API

All responses are JSON. Errors look like `{ "error": { "code": "INVALID_CREDENTIALS" } }`. Every endpoint except login needs the session cookie and checks project membership on the server.

| Method           | Path                        | What it does                                                             |
| ---------------- | --------------------------- | ------------------------------------------------------------------------ |
| POST             | `/api/auth/login`           | `{ phone, password }`. Sets the session cookie.                          |
| POST             | `/api/auth/logout`          | Ends the session and clears the cookie.                                  |
| GET              | `/api/auth/me`              | The logged-in user and their projects.                                   |
| GET, POST        | `/api/projects`             | List the user's projects; create one (owner).                            |
| PATCH            | `/api/projects/:id`         | Rename, archive or restore (owner).                                      |
| GET, PUT         | `/api/projects/:id/members` | List members; set the managers (owner).                                  |
| GET, POST        | `/api/users`                | List users; add one (owner).                                             |
| PATCH            | `/api/users/:id`            | Change name, role or password (owner).                                   |
| GET, POST        | `/api/transactions`         | List (`projectId`, `type`, `month=YYYY-MM`); create with a device id.    |
| GET, PUT, DELETE | `/api/transactions/:id`     | Read, replace, soft delete.                                              |
| GET, POST        | `/api/work-logs`            | List (`projectId`, `workType`, `month`); create with a device id.        |
| GET, PUT, DELETE | `/api/work-logs/:id`        | Read, replace, soft delete.                                              |
| POST             | `/api/sync/push`            | `{ mutations: [...] }`, applied in order; one result per mutation.       |
| GET              | `/api/sync/pull`            | Changes since `?cursor=`, deleted rows included; repeat while `hasMore`. |

## Offline

The service worker is only active in a production build (`npm run build && npm start`). To try offline mode, open the app once online, then switch the phone or browser to offline: entries save on the phone and show "পাঠানো বাকি" until the connection returns.

## Deploying (Vercel + Neon)

Not set up yet. When it is: create a Neon database, set `DATABASE_URL` in the Vercel project, and run `npm run db:deploy` against it before the first deploy.
