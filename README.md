# Knockout Chess

Host knockout chess tournaments. Players log in with Lichess, join a public
tournament, and play every match on Lichess. Winners are reshuffled each round
until one champion is left.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind) · Supabase (database +
photo storage) · Lichess API · Vercel.

## Run locally

1. Install Node.js 20.9 or newer.
2. Install packages:
   ```
   npm install
   ```
3. Create `.env.local` from `.env.example` and fill in `SESSION_SECRET`
   (any random string of 32+ characters). Login works without Supabase;
   profile settings need it.
4. Start the app:
   ```
   npm run dev
   ```
5. Open http://localhost:3000

## Supabase setup

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste each file in `supabase/migrations/`
   **in order** (`001_…`, then `002_…`), and click **Run** for each.
   If the `storage.buckets` insert fails, create the bucket by hand instead:
   **Storage → New bucket**, name `avatars`, **Public** on.
3. Copy the **Project URL** and a **secret key** (`sb_secret_…`; on older
   projects, the `service_role` key) from the project's API settings into
   `.env.local` as `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
   Not the publishable key (`sb_publishable_…`): the database locks that one out.
4. Restart `npm run dev`.

The secret key bypasses database security, so it lives only on the server.
Never put it in a `NEXT_PUBLIC_` variable or commit it.

## Lobby rules

- Tournaments are public: every open tournament is listed in the lobby.
- Player counts: 2, 4, 8, 16 or 32. Time: 5 or 10 minutes, no increment.
- A user can be in one open or running tournament at a time (as host or player).
- Joining closes when the host starts. Start needs every spot filled.
- Hosts can't leave their own tournament; they cancel it instead.
- These rules are enforced inside the database (`kc_*` functions in
  `002_tournaments.sql`), with row locks so two people can't take the last
  spot at the same moment.

## Testing alone: test players

In development (`npm run dev`) the host of an open tournament sees a
**Dev only: test players** box to add fake players or fill every spot.
Test users have ids starting with `test~` and `is_test = true`. The box is
hidden, and the action refused, in production builds.

## How login works

"Log in with Lichess" uses OAuth2 with PKCE. Lichess needs no app
registration. After login the app reads the Lichess username, then
immediately revokes the token: it keeps no access to the Lichess account.
The app's own login is a signed, HTTP-only cookie that lasts 30 days.

## Project layout

```
src/app/                 pages and API routes
src/app/api/auth/        Lichess login + callback
src/app/settings/        settings page and its Server Actions
src/app/tournaments/     lobby, host form, tournament page and their Server Actions
src/components/          UI components
src/lib/                 server code: env, session, Lichess, database, users
supabase/migrations/     SQL to run in Supabase
```
