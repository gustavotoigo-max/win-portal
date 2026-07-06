# WinPortal

WinPortal is a Next.js app for selling Windows software licenses, with customer login, signup, payment flow, license dashboard, admin license management, and Portuguese/English routing.

## Stack

- Next.js on Vercel
- Supabase Auth + PostgreSQL
- Stripe Checkout + webhook
- Locale routes: `/pt` and `/en`

## Local setup

```bash
npm install
npm run dev
```

## Vercel deploy

The project includes `vercel.json` to force the Next.js preset and `.next` output directory. If the Vercel dashboard still has an old Output Directory value such as `public`, clear it or keep this repository config as the source of truth.

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PRICE_ID=
```

## Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Create your first user.
5. Promote your admin user:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Stripe

1. Create a product and price in Stripe.
2. Put the price id in `NEXT_PUBLIC_STRIPE_PRICE_ID`.
3. Create a webhook endpoint:

```text
https://your-domain.com/api/stripe/webhook
```

4. Listen to `checkout.session.completed`.
5. Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

## Important routes

- `/pt` and `/en`: landing page
- `/pt/login`: login
- `/pt/cadastro`: signup
- `/pt/dashboard`: customer license dashboard
- `/pt/admin`: admin license management
- `/api/checkout`: creates a Stripe Checkout session
- `/api/stripe/webhook`: creates orders and licenses after payment
- `/api/licenses/validate`: endpoint for the Windows software to validate a license
- `/api/admin/licenses`: updates license status from admin actions

## License validation payload

```json
{
  "licenseKey": "WIN-EXAMPLE",
  "machineFingerprint": "stable-machine-id",
  "machineName": "DESKTOP-01"
}
```
