# Connect your existing RankYourWebsite project

The app uses your real Supabase project for accounts, websites, scans, reports, payments, referrals and counters. There is no production mock-data fallback. An empty account shows an empty dashboard. Sample routes require explicit development-only opt-in and are disabled in `.env.local`.

## What has been completed in the code

- Created a private `.env.local` with blank Supabase fields; `.gitignore` excludes it. A local cron secret was generated without printing it.
- Kept the existing UI and real Supabase queries. The server credential is used only by server code (`lib/supabase/server.ts` imports `server-only`).
- Preserved email/password signup, sign-in, confirmation, password recovery/reset and cookie sessions. Expanded session refresh coverage to scan, checkout and signup routes, fixed signed-out dashboard redirects, and handled sign-out failures.
- Added safe callback redirects and tests for signup confirmation, recovery and expired links.
- Created `supabase/final-production-setup.sql`: the complete, repeatable SQL Editor setup, including all five migrations. It installs missing app tables/columns/functions/triggers/indexes, restores app RLS policies, and backfills existing real Auth users and genuine activity.
- Added `npm run check:supabase`, a read-only connection/schema check that never prints keys or private records.
- Kept payment setup out of this work. New installations have Stripe and PayFast disabled. Existing settings are preserved.

**What you must do:** copy your project's keys into the local file, execute the SQL in your project, configure Auth URLs/templates, and complete a real email/account/scan test. Until then, your remote database has not been inspected or changed by this work. Local PostgreSQL tests cannot verify email delivery or your hosted project's state.

## STEP 1 — Open Supabase

Open https://supabase.com/dashboard and select the **existing RankYourWebsite project you already created**. You do not need another project or another UI.

## STEP 2 — Find your Project URL

Open the project's **Connect** dialog. Copy **Project URL**, normally `https://YOUR-PROJECT-REF.supabase.co`.

Do not copy the Dashboard page URL, database password, or PostgreSQL connection string.

## STEP 3 — Find the two API keys

Open **Project Settings → API Keys**.

| Copy this value | Paste into this variable |
| --- | --- |
| Project URL from Step 2 | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_...`), or existing legacy `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` |

The server variable retains this repository's existing name; the Supabase JS client also accepts the newer secret key in it. If using legacy keys, an `anon` value works in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Do not create `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the app does not read that variable.**

These are the only three Supabase variables this project requires. A database password, Supabase personal access token and Stripe/PayFast keys are not needed for this setup.

Never paste the server key into chat, screenshots, a `NEXT_PUBLIC_` field or source code. [Supabase's key guide](https://supabase.com/docs/guides/getting-started/api-keys) explains the publishable/server distinction and Dashboard locations.

## STEP 4 — Paste values locally

Open this project folder in your editor, then open `.env.local` beside `package.json`. Fill the three empty fields:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PASTE_YOUR_PUBLIC_KEY_LOCALLY
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVER_KEY_LOCALLY
```

Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `APP_ENV=development`, and `ENABLE_DEMO=false` for local setup. Keep the existing `CRON_SECRET` line. Save the file. Do not commit it.

## STEP 5 — Run the COMPLETE SQL file

1. Open `supabase/final-production-setup.sql` in your editor.
2. Select **all** of the file and copy it.
3. In Supabase, open **SQL Editor → New query**.
4. Paste the whole file. Ensure you selected the intended project and run it using the default administrative SQL Editor role.
5. Click **Run**. The final result must show `schemaVersion: 5` and all four boolean checks as `true`.

Run this one file; you do not also need to paste the five individual migration files. It may be rerun. It preserves existing account/scan/report/payment rows and settings, replaces policies only on the app's 15 tables, and does not insert sample data. If an unrelated or incompatible schema uses the same table names, or missing required data cannot be recovered, it fails and rolls back instead of deleting data. Share only the error text if troubleshooting is needed; never include keys or private rows.

The file supports fresh projects and the schema from this repository, including partial migration installs. It does not claim to repair every possible manually altered schema. When using Supabase CLI migrations later, reconcile migration history first; this SQL Editor installation does not write the CLI's migration ledger.

## STEP 6 — Configure Authentication

In **Authentication → Sign In / Providers → Email** (sometimes labeled **Providers**): enable email signup and **Confirm email**.

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- Add these **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/auth/reset-password`
  - `http://localhost:3000/auth/confirm`

In **Authentication → Email Templates**, preserve the rest of each email and set the main button/link target as follows:

**Confirm signup:**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

**Reset password:**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

These templates use this app's server confirmation endpoint and work when the email is opened in another browser. Save both templates. See [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Configure **Authentication → Email → SMTP Settings** with your own email provider for delivery to real users. Supabase's default email service has restrictions; a database connection alone does not prove email delivery. If enabling CAPTCHA later, also add its widget/token flow in the app before enabling enforcement.

For deployment, replace localhost with your actual HTTPS origin in both Supabase and your deployment environment. Public environment values are included at build time, so rebuild after changing them.

## STEP 7 — Check the connection and restart the app

Open a PowerShell terminal in this project folder:

```powershell
npm.cmd run check:supabase
```

It checks Auth accessibility, confirmation settings, the server key, the 15 tables/required columns, RLS flags and auth triggers. It reads `.env.local` without showing the values. It does not change your database or create test users.

If it reports missing fields, finish Step 4. If it reports missing database setup, complete Step 5. If it reports Auth settings, finish Step 6.

Stop any old development server with **Ctrl+C**, then run:

```powershell
npm.cmd run dev -- --port 3000
```

Open http://localhost:3000. If port 3000 is occupied, stop the old app server or intentionally choose another port and change **all** app/Supabase URLs above to that port. The app validates mutation origins.

## STEP 8 — Create a REAL test account

Open http://localhost:3000/auth/sign-up. Enter your name, an email you can receive, and a password of at least 12 characters. Click **Create account**.

Open the confirmation email and click **Confirm your email**. You should reach `/dashboard`. If email does not arrive, check the Supabase Auth logs, SMTP configuration and spam folder. Do not disable confirmation to hide a delivery problem.

## STEP 9 — Verify the real records

In Supabase **Authentication → Users**, find the email and confirm its verification status. In **Table Editor → public.profiles**, locate the matching user ID:

- `first_name` contains your name.
- `email_verified` is `true` after confirmation.
- `referral_code` is a unique 18-character code.
- `is_admin` is `false`.

The existing-user backfill also creates profiles for users who registered before the SQL was installed. Users cannot make themselves administrators through signup metadata.

In `platform_totals`, `registered_users` counts verified registrations, not unconfirmed signup attempts. The homepage reads real counters via `/api/public/stats`, with roughly 30–60 seconds of cache/poll delay. Empty counts are real zeros, never invented values.

## STEP 10 — Test the REAL dashboard and stored report

1. Open `/dashboard/analyze` and scan a public page you own or are authorized to test.
2. Watch real scan progress. A successful scan creates/updates `website_projects`, `website_scans`, `audit_issues`, `reports`, `platform_events`, and counters.
3. Check **My websites**, rename the website, add private notes, and rescan. The custom name/notes must remain.
4. Check **My reports** and open the free preview. Full content is stored server-side and remains locked while payments are disabled. No payment is needed to verify report storage and previews.
5. Refresh; sign out; sign in again. Your website, notes, scan history and report preview must still be present.
6. In a separate private browser, create and confirm a second account. It must not see the first user's dashboard records. Copy the first user's `/report/ID` URL into the second account: it must not reveal that report.
7. Test **Forgot password?** with the first account. Follow the reset email, set a new password, then sign out/in with the new password. Refresh again to check the session persists.

The SQL Editor runs with administrative privileges and can see all records. That is expected; test user isolation through two signed-in accounts, not as the SQL Editor administrator.

## Test referrals and counters

From the first user's **Referrals** page, copy the real referral link. In a separate browser profile, follow it and register another legitimate test account. Supabase should have one `referrals` row linking the first user to the new user.

The existing rule is **verified email AND one completed scan**. An email confirmation alone remains pending until the scan completes. After five distinct qualifying accounts, the referrer's dashboard shows 5/5 and a $0.50 discount; duplicate scans do not add referrals. Each new account receives its own unique code. Referrals are optional: a user without five qualifying referrals can always purchase the full report at the normal $2 price. Checkout remains disabled during this database setup.

Invitee IDs and fraud fields are not available to browser clients. The dashboard shows only the referrer's own progress/status. Raw tables are not public; safe aggregate counters are exposed through the public API. Admin RPCs and mutation functions require the server credential, and app admin routes additionally verify `is_admin`.

The app starts scan processing after submission. For deployed recovery of interrupted scans, schedule `/api/jobs/scans` with the existing server-only cron secret as described in README.md; this is separate from local Auth/database setup.

## Validation and interface

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
# Start the built app in another terminal:
npm.cmd run start -- --port 3000
# Browser tests (with Chrome installed):
$env:E2E_BASE_URL='http://localhost:3000'
$env:PLAYWRIGHT_CHANNEL='chrome'
npm.cmd run test:e2e -- --workers=1
```

Database tests use an isolated PostgreSQL engine and simulated Auth schema. They test the real SQL, fresh installation, reruns, populated upgrades, missing schema repairs, RLS, counters and referral/payment invariants. Fixtures never enter your hosted database. Browser tests verify public UI and protection; real hosted email/session/scan acceptance is Steps 8–10 above.

After browser tests, interface screenshots are in `test-results/home-desktop.png`, `home-mobile.png`, `signup-desktop.png`, and `signup-mobile.png`. These show the actual app, not an invented dashboard. Once configured, `/dashboard` shows only your signed-in user's real data.
