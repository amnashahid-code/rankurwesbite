# RankYourWebsite

A new full-stack website-audit SaaS built with Next.js 16, React, TypeScript, Tailwind, Supabase Auth and PostgreSQL. Branding is centralized in `lib/config.ts`; pricing and feature flags live in `app_settings`.

## 1. What is implemented

- Responsive dark landing page, illustrated sample report (explicitly labeled), live aggregate counters and privacy-safe activity. No fake customers, testimonials or usage data.
- Sign-up, email verification, sign-in/out, password recovery/reset, protected personal dashboards and admin-only analytics/settings.
- Real server-side single-page analyzer: SSRF-safe DNS-pinned fetching, redirect/time/size limits, queued scans with leases/retries, actual progress, deterministic scores, top-three preview, full report, optional AI explanations and a 30-day plan.
- Private websites/notes, scan history, reports, referrals, billing, account settings, keyword history and community information.
- Atomic report generation/counters, normal $2 one-time report purchases for every user, and an optional maximum $0.50 discount after five qualifying referrals. Each referred account must verify email **and complete a scan**; referrals are never required to buy a report.
- Stripe hosted Checkout and signed webhook verification, idempotent fulfillment and full refund revocation. Pakistan PayFast hosted checkout and fail-closed callback/status adapter.
- Downloadable, professionally styled HTML report with Print → Save as PDF support. No PDF rendering service is required.
- Metadata, canonical URLs, sitemap, robots, structured data, accessibility/reduced-motion styles, privacy/terms/refund/cookie/disclaimer/contact pages.

Unconfigured external services return clear unavailable states. There is no fake payment mode or production unlock bypass. Deterministic reports remain useful when AI is unavailable. Internal scores never claim to be Google's ranking.

## 2. Install and database migrations

For your existing Supabase project, follow [the step-by-step connection guide](SUPABASE-SETUP.md). A private `.env.local` is prepared locally; enter credentials there. The complete SQL Editor installation is [`supabase/final-production-setup.sql`](supabase/final-production-setup.sql). Run `npm run check:supabase` after applying it to check your actual connection without printing secrets.

Use Node.js 22+ (tested with Node 24). On Windows PowerShell use `npm.cmd` if your execution policy blocks `npm.ps1`.

```sh
npm ci
```

Use your **existing** Supabase project. Run the complete setup file above in SQL Editor. Alternatively, for installations managed by Supabase CLI migration history, apply these incremental migrations in order:

1. `supabase/migrations/0001_initial.sql`
2. `supabase/migrations/0002_admin_analytics.sql`
3. `supabase/migrations/0003_personal_metrics.sql`
4. `supabase/migrations/0004_public_growth_and_maintenance.sql`
5. `supabase/migrations/0005_production_readiness.sql`

They create all tables, ownership constraints, RLS, auth triggers, aggregate totals, rate limits, transactional scan completion, referral verification, checkout reservation, webhook deduplication, refunds and analytics functions. Individual historical migrations are not repeatable; the complete setup file is tested for reruns and populated upgrades of this repository's schema. It preserves real records and fails transactionally for incompatible structures. SQL tests use PostgreSQL via PGlite with a minimal simulated Supabase auth schema.

## 3. Environment variables

Copy `.env.example` to `.env.local`. Set:

- `APP_ENV`: `development`, `test` or `production`. Production rejects Stripe test events and PayFast UAT checkout.
- `NEXT_PUBLIC_APP_URL`: exact app origin including scheme, no trailing slash. Use the **actual local port**; mutations enforce this origin.
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL`: public branding and a real support mailbox.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public Supabase project connection details.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret. Never prefix it with `NEXT_PUBLIC_`.
- `ENABLE_DEMO`: defaults to disabled; only `true` in development enables the isolated sample interface. Production and real dashboard routes never use sample data.
- `CRON_SECRET`: a long randomly generated secret for the scan recovery worker.
- `TRUSTED_IP_HEADER`: only a header your trusted ingress **overwrites** (on Vercel, `x-vercel-forwarded-for`). If unset, anonymous traffic shares one persistent rate limit. Do not trust arbitrary client-forwarded IP headers.

Keep separate databases and credentials for production and testing. Never seed demonstration users/scans into a public production database. The homepage's example scores are purely illustrative, not platform usage counters.

## 4. Supabase setup

1. Enable email/password authentication and **email confirmation**. Use custom SMTP for production delivery.
2. Set Auth Site URL to your app origin. Allow `/auth/callback` and `/auth/confirm` on that origin, and the local origin for development.
3. For a cross-device confirmation flow, use this confirmation-email link:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
4. Recovery email can use:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   Default PKCE callback emails also work when opened in the initiating browser.
5. Configure Supabase Auth email rate limits and password protections. App sign-up additionally has a persistent IP-based limit. Manual fraud investigation is still needed for coordinated multi-account abuse; verified email is not proof of a unique human.
6. Create your account, verify email, then grant admin **in SQL only**:
   `update public.profiles set is_admin = true where id = '<your-auth-user-uuid>';`
7. Open `/admin`. Payment flags default to disabled. Add working credentials and complete sandbox acceptance testing before enabling them.

All database writes that affect roles, payment state, report access or counters are server-only. Owners can directly read only their own RLS-protected data; locked report content is not selectable even by its owner. Server routes independently check ownership. Referral dashboards expose statuses, never invitee identities.

## 5. Pakistan PayFast setup

This integration is for **Pakistan's PayFast / gopayfast.com / apps.net.pk**, not South African PayFast or unrelated similarly named providers.

- Set `PAYFAST_MERCHANT_ID`, `PAYFAST_SECURED_KEY`, and `PAYFAST_CHECKOUT_BASE_URL` to your approved UAT/live merchant endpoint.
- Set `PAYFAST_USD_TO_PKR` to the approved quoted rate. PKR minor units are fixed server-side at reservation and displayed before redirect.
- Obtain the merchant's authenticated transaction-status API base URL and access token: `PAYFAST_TRANSACTION_API_URL`, `PAYFAST_TRANSACTION_API_TOKEN`. Rotate expiring merchant tokens through your deployment secret manager.
- Configure the server callback at `/api/webhooks/payfast`.
- The hosted checkout adapter obtains a token from `/Ecommerce/api/Transaction/GetAccessToken`, then posts to `/Ecommerce/api/Transaction/PostTransaction`.
- The callback adapter checks SHA-256 `basket_id|secured_key|merchant_id|err_code`, then calls `/transaction/{transaction_id}`. Fulfillment additionally requires the same basket ID, transaction ID, exact amount, currency, and successful status.
- **Confirm the callback hash and transaction response schema with your merchant integration contract.** The current strict status adapter expects `status_code: "00"`, `basket_id`, `transaction_id`, `transaction_amount` or `txnamt`, and `currency_code`. If your response omits amount/currency or differs, the payment stays locked; map the approved contract in `lib/payments/payfast.ts` before launch. The public API documentation does not establish every merchant-specific hosted-checkout field.
- `PAYFAST_WEBHOOK_SECRET` is reserved for merchant-specific signature variants; it is **not** used by the current validation-hash contract.
- Set `PAYFAST_CONTRACT_VERIFIED=true` **only after** UAT checkout, forged callback, amount/currency mismatch, replay, delayed notification and real report unlock tests pass. Then enable PayFast in `/admin`.

The architecture is implemented, but PayFast production readiness cannot be certified without your approved contract and UAT account. Refund reconciliation for PayFast must invoke the existing `refund_payment` RPC from a trusted verified administrative/provider integration; no refund is inferred from a browser return.

## 6. International payment setup

Use a Stripe account legitimately available to your business. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Hosted Checkout does not require a publishable key; `.env.example` reserves it for future embedded checkout.

Subscribe `/api/webhooks/stripe` to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

For local testing use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then set its signing secret. Use a real app-generated Checkout Session to test fulfillment; a generic CLI trigger will not have matching app order metadata. Fulfillment retrieves the session from Stripe, checks the payment amount/currency/order, and performs one database transaction. Browser redirects never unlock anything. Full refunds revoke access unless another paid order covers the report. Revenue analytics show original USD sales value, excluding settlement fees and exchange movements.

## 7. AI credentials

Set `GEMINI_API_KEY` and `GEMINI_MODEL` to a currently supported model in your Google AI account. Turn on AI explanations in admin settings. Only controlled detected issue codes, titles, categories and fix guidance are sent; raw HTML, user names, payment details and website text are not sent. Scores are deterministic. Output is schema-validated and must reference existing issues. Provider failure or invalid output falls back to the clearly labeled rules-based report; it does not invent measurements.

## 8. PageSpeed and ranking credentials

- `PAGESPEED_API_KEY`: enable Google PageSpeed Insights API. This adds mobile Lighthouse lab performance scoring. Without it, performance is explicitly labeled as basic HTML signals, not Core Web Vitals.
- `SERPAPI_KEY`: connect SerpApi for keyword/country organic search checks. Save/check a keyword from the ranking dashboard. Results store the actual returned search depth; absence is reported as “not found in returned results,” never a fabricated ranking. Re-submit a saved keyword for a new check/history entry.

## 9. Local testing

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

If port 3000 is occupied, Next chooses a new port. Update `NEXT_PUBLIC_APP_URL` to match before testing mutations and callbacks. Public pages work without credentials; real scans, user accounts, dashboards and payments require Supabase.

Tests cover SSRF URL/IP rejection, real HTML scoring, grounded report plans, Stripe signatures and metadata, PayFast digest tampering, actual PostgreSQL migrations/RLS, verified registration counts, scan/report idempotency, failed/cancelled exclusion, guest ownership claims, unique verified referrals, payment reservation/verification, refund access revocation and rate limits.

Browser checks (start the app first):

```sh
npx playwright install chromium
# Default E2E URL is http://localhost:3001; override E2E_BASE_URL as needed.
npm run test:e2e
```

If Playwright's bundled browser is unavailable, use installed Chrome. On a resource-constrained Windows machine, run one browser worker at a time:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:E2E_BASE_URL='http://localhost:3001'
npm.cmd run test:e2e -- --workers=1
```

Rescanning an existing website preserves its custom name and private notes. Regression tests cover project reuse and isolation between accounts scanning the same URL.

Live acceptance checklist, using a **test** Supabase project and provider sandboxes:

1. Register two accounts, verify each email, sign out/in, recover/reset a password. Unverified registration does not count; confirmed registration increments once.
2. Scan an authorized public website. Observe real stage progress. Completed scan and report totals each increase once; allow 30–60 seconds for cache/poll refresh.
3. Try a private IP, invalid URL, cancelled scan and inaccessible website. No completed counters should increase.
4. Open another user's scan/report URL and query Supabase directly using that user's JWT: no private records or paid content should be returned.
5. Register five separate legitimate test referrals, confirm email and complete a scan for each. Verify the $1.50 checkout amount; repeated scans/confirmations must not increase referrals.
6. Complete configured sandbox checkout. Refresh report, replay webhook, test tampered signature/amount, verify one unlock. Check full refund revocation.
7. Check `/admin` with normal and administrator accounts. Confirm ordinary users cannot read or change settings.
8. Confirm `/api/public/stats` has only `registeredUsers`, `completedScans`, `reportsGenerated`; activity has only generic message and date.

PGlite tests simulate the Supabase auth schema, not the external Auth email/session service. SMTP, deployed RLS, API quotas, merchant settlement and production webhooks require live acceptance after credentials are supplied.

## 10. Deployment

Deploy to a Node.js-capable Next.js host (not a static export). Set production secrets, `APP_ENV=production`, the HTTPS origin, contact mailbox, and production Supabase redirects. Build with `npm run build`; self-host with `npm start` behind HTTPS. Use an ingress that strips/replaces client IP headers and limits request body size.

Scanning uses `after()` for prompt execution plus a durable PostgreSQL queue. Configure a scheduler to GET `/api/jobs/scans` with `Authorization: Bearer <CRON_SECRET>` every minute; `vercel.json` includes this schedule. Your hosting plan must support minute-level cron and a 180-second function duration. On other hosts, configure the same authenticated job externally. Row locks and attempt leases prevent duplicate processing; expired workers can be retried. For sustained high volume, move the same `runScan` worker into a dedicated process and monitor queue age.

Before accepting money: run migrations, verify email delivery, publish real contact details and review legal policies for your business, finish payment provider acceptance, configure backups/monitoring, and run the live checklist against the deployed URL. External production deployment and credentials have not been supplied by this repository.

## Integration references

- [Next.js server lifecycle (`after`)](https://nextjs.org/docs/app/api-reference/functions/after)
- [Supabase SSR and verified server authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Pakistan PayFast API reference](https://gopayfast.com/docs/)
- [Pakistan PayFast hosted checkout document](https://gopayfast.com/wp-content/uploads/google-pay-developer-doc.pdf)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Google PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/get-started)
- [SerpApi Google Search API](https://serpapi.com/search-api)
