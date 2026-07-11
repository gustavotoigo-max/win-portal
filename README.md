# WinPortal

WinPortal is a Next.js app for selling Windows software licenses, with customer login, signup, manual official license generation, license dashboard, admin license management, and Portuguese/English routing.

## Stack

- Next.js on Vercel
- Supabase Auth + PostgreSQL
- Manual official license flow for the current stage
- Stripe Checkout + webhook kept as future payment integration
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
LICENSE_APP_ID=com.winportal.windowssoftware
LICENSE_HMAC_SECRET=
LICENSE_ENCRYPTION_KEY=
LICENSE_ED25519_PRIVATE_KEY_PEM=
LICENSE_ED25519_PRIVATE_KEY_BASE64=
RESEND_API_KEY=
LICENSE_EMAIL_FROM=
DOWNLOAD_BASE_URL=
DOWNLOAD_FALLBACK_URL=
```

Stripe variables are optional while manual license sales are handled outside the site. Supabase variables are required for real login and license generation.

License variables:

- `LICENSE_HMAC_SECRET`: server-only secret used to hash license keys. Required before production.
- `LICENSE_ENCRYPTION_KEY`: server-only secret used to encrypt the key for dashboard display.
- `LICENSE_ED25519_PRIVATE_KEY_PEM`: server-only Ed25519 private key in PEM format. Use `\n` escaped line breaks in Vercel.
- `LICENSE_ED25519_PRIVATE_KEY_BASE64`: alternative Ed25519 private key as base64 PKCS8 DER.
- The Windows client must contain only the Ed25519 public key.

Email/download variables:

- `RESEND_API_KEY`: optional Resend API key used to email the license after admin generation.
- `LICENSE_EMAIL_FROM`: sender address used for license emails, for example `Licencas <licencas@your-domain.com>`.
- `DOWNLOAD_URL_IMAGEANALYZER`, `DOWNLOAD_URL_PDFANALYZER`, etc.: optional direct installer URLs per product.
- `DOWNLOAD_BASE_URL`: optional base URL used as `{DOWNLOAD_BASE_URL}/{product_id}.exe`.
- `DOWNLOAD_FALLBACK_URL`: optional fallback page when no direct download URL is configured.

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

During testing, Supabase may block login with `Email not confirmed`. You have two options:

- Confirm the user through the email sent by Supabase.
- Or disable email confirmation in `Authentication > Providers > Email > Confirm email`.

Use the hidden admin URL:

```text
https://your-domain.com/ADM
```

The admin link is intentionally not shown in the public navigation.
The `/ADM` page is forced dynamic so it always checks the current login session and admin role.

If the project database already existed before the signed activation API, run this migration too:

```text
supabase/migrations/20260706_license_activation_contract.sql
```

## Manual license flow

The current customer flow does not charge the user inside the site.

1. Customer gives the purchase email to the administrator.
2. Admin opens `/ADM`.
3. Admin creates an official license manually for the customer's email.
4. The app creates:
   - one row in `orders`
   - one row in `licenses`
   - one row in `license_events`
5. The generated license key appears in the admin panel.
6. If email variables are configured, the app emails the key and product page link to the customer.
7. Customer activates the Windows software with the same email and license key.

Important route:

```text
/api/admin/licenses/create
```

## Stripe

Stripe is not required for the current manual license stage. Keep this section for the future paid flow.

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
- `/ADM`: hidden admin license management
- `/api/licenses/fake-purchase`: creates a fake order and license for the logged-in user
- `/api/auth/logout`: signs out the current user
- `/api/ativar`: first online activation for the Windows software
- `/api/revalidar`: later online revalidation for an existing activation
- `/api/checkout`: creates a Stripe Checkout session for future real payment flow
- `/api/stripe/webhook`: creates orders and licenses after payment
- `/api/licenses/validate`: legacy validation endpoint
- `/api/admin/licenses`: updates license status from admin actions

## License validation payload

Preferred activation endpoints for the Windows client:

```text
POST /api/ativar
POST /api/revalidar
```

Activation payload:

```json
{
  "app_id": "com.winportal.windowssoftware",
  "email": "usuario@empresa.com",
  "license_key": "WIN-ABCD-1234-EFGH-5678",
  "machine_id": "stable-machine-id",
  "machine_name": "DESKTOP-01",
  "software_version": "1.0.0",
  "client_utc": "2026-07-06T12:00:00+00:00",
  "system_info": {
    "os": "Windows 11",
    "arch": "x64"
  }
}
```

Revalidation payload:

```json
{
  "license_id": "uuid",
  "activation_id": "uuid",
  "email": "usuario@empresa.com",
  "machine_id": "stable-machine-id",
  "software_version": "1.0.0",
  "last_validation_utc": "2026-07-06T12:00:00+00:00",
  "system_info": {
    "os": "Windows 11",
    "arch": "x64"
  }
}
```

Successful response:

```json
{
  "ok": true,
  "status": "ACTIVE",
  "message": "Licenca valida.",
  "license": {
    "license_id": "uuid",
    "activation_id": "uuid",
    "app_id": "com.winportal.windowssoftware",
    "software": "ImageAnalyzer",
    "product_id": "image-analyzer",
    "email": "usuario@empresa.com",
    "license_key_sha256": "hash-da-chave",
    "machine_id": "stable-machine-id",
    "software_version": "1.0.0",
    "issued_at_utc": "2026-07-06T12:00:00+00:00",
    "expires_at_utc": "2027-07-11T23:59:59.000Z",
    "last_validation_utc": "2026-07-06T12:00:00.000Z",
    "last_server_validation_utc": "2026-07-06T12:00:00+00:00",
    "status": "ACTIVE",
    "revoked": false,
    "revoked_at_utc": null,
    "offline_allowed": true,
    "offline_max_days": 30,
    "features": ["core"]
  },
  "signature": "assinatura-ed25519-base64"
}
```

Error response:

```json
{
  "ok": false,
  "status": "DENIED",
  "code": "LICENSE_REVOKED",
  "message": "Licenca revogada."
}
```

Legacy endpoint still available:

```json
{
  "licenseKey": "WIN-EXAMPLE",
  "machineFingerprint": "stable-machine-id",
  "machineName": "DESKTOP-01"
}
```
