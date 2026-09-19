# Deploy RankYourWebsite on Vercel

Deploy the `rankurwebsite` folder as a **Next.js** project. This Next.js app is the only customer application and contains the real scan, authentication, dashboard, report, referral, and payment routes.

## 1. GitHub

1. Create an empty GitHub repository, for example `rankyourwebsite`.
2. In VS Code, open only the `rankurwebsite` folder.
3. Commit and push this project. `.env.local` must never be committed.

## 2. Vercel

1. In Vercel select **Add New → Project**, then import the GitHub repository.
2. Select the **Next.js** framework preset.
3. If the GitHub repository holds every project, set Root Directory to `rankurwebsite`. Otherwise leave it empty.
4. Add the environment values below before deploying.

## 3. Required Vercel environment variables

Add these in **Project → Settings → Environment Variables**. Use your own values directly from Supabase; do not put a secret into GitHub or source code.

```dotenv
APP_ENV=production
NEXT_PUBLIC_APP_NAME=RankYourWebsite
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
NEXT_PUBLIC_CONTACT_EMAIL=YOUR-SUPPORT-EMAIL
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLIC-SUPABASE-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVER-ONLY-SUPABASE-KEY
CRON_SECRET=A-LONG-RANDOM-SECRET
TRUSTED_IP_HEADER=x-vercel-forwarded-for
ENABLE_DEMO=false
```

The app deliberately uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; do not add a different `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never prefix service-role, PayFast, Stripe or AI secrets with `NEXT_PUBLIC_`.

## 4. Supabase before deployment

1. In the Supabase SQL Editor, run [`supabase/final-production-setup.sql`](supabase/final-production-setup.sql) once.
2. In **Authentication → URL Configuration**, set Site URL to your Vercel domain.
3. Add redirect URLs for:
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/confirm`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback?next=/auth/reset-password`
4. Enable Email provider and Confirm email. Configure SMTP before accepting real customers.

## 5. Deploy, then test

Deploy, create a real test account, verify its email, run an authorized scan, and confirm the dashboard holds only that user’s data. Locally, `npm.cmd run check:supabase` checks the connection/schema without printing credentials.

## 6. PayFast after UAT approval

Only after PayFast gives you your merchant contract, add these server-only Vercel variables:

```dotenv
PAYFAST_MERCHANT_ID=
PAYFAST_SECURED_KEY=
PAYFAST_CHECKOUT_BASE_URL=
PAYFAST_TRANSACTION_API_URL=
PAYFAST_TRANSACTION_API_TOKEN=
PAYFAST_USD_TO_PKR=
PAYFAST_CONTRACT_VERIFIED=false
```

Set the PayFast server callback to:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/webhooks/payfast
```

Complete UAT payment, invalid callback, replay, amount mismatch and refund tests. Then set `PAYFAST_CONTRACT_VERIFIED=true`, enable PayFast in `/admin`, and redeploy. Reports unlock only after server-side verification—not from the browser success page.

## 7. Scan recovery cron

`vercel.json` already schedules the scan worker each minute. Keep `CRON_SECRET` private. Confirm your Vercel plan supports the scheduled function before going live.
