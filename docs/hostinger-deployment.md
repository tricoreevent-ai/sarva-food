# Hostinger Deployment Guide

This app is a Next.js Node application. Deploy it on Hostinger with the GitHub repository import flow, not as a static export, because API routes use Firebase Admin, Cloudinary signing, sessions, and server-side public data loaders.

## Hostinger Build Settings

Use these values in the Hostinger "Review build settings" screen:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Branch | main |
| Node version | 22.x |
| Root directory | `./` |
| Package manager | npm |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `.next` |
| Start command | `npm run start` |

`npm run start` runs `next start --hostname 0.0.0.0`, so the Hostinger reverse proxy can reach the Node process. Do not use `next export` or an `out` directory for this project.

## Required Environment Variables

Add these in Hostinger hPanel under Environment variables. Keep real values out of Git.

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://your-hostinger-domain.com
NEXT_PUBLIC_APP_NAME=Nammude
NEXT_PUBLIC_APP_VERSION=v1.0.0-rc3
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_ENABLE_DEV_LOGIN=false
NEXT_PUBLIC_ENABLE_TEST_LOGIN=false

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
TABLE_QR_SECRET=
PAYMENT_SETTINGS_ENCRYPTION_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Nammude <orders@your-domain.com>"
DATABASE_ALERT_EMAIL=
```

Optional production integrations:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
UPI_MERCHANT_ID=
UPI_MERCHANT_VPA=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
CLOUDINARY_URL=
```

Use either `CLOUDINARY_URL` or the individual Cloudinary values. The individual values are clearer in Hostinger.

`DATABASE_ALERT_EMAIL` is the fallback recipient for customer-data outage notifications. Configure the same address in Admin → System Settings → Customer service alerts. The hosting value remains usable even when Firestore itself is unavailable.

`TABLE_QR_SECRET` is required for production QR signing and should be a long random value of at least 32 characters. Keep it stable after printing QR codes, otherwise existing QR links may fail verification.

`PAYMENT_SETTINGS_ENCRYPTION_KEY` is recommended before enabling live restaurant payment settings. Keep it stable so encrypted provider secrets remain readable after redeploys.

For `FIREBASE_ADMIN_PRIVATE_KEY`, Hostinger hPanel asks for the variable name and value separately. Paste only the value, without surrounding quotes. Use escaped `\n` line breaks, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`. The app now tolerates accidentally quoted values, but unquoted is the clean production format. Do not upload or commit `service-account-key.json`.

For customer Google sign-in, add the same OAuth client id to `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_ID`, and add the OAuth secret to `GOOGLE_OAUTH_CLIENT_SECRET`. In Firebase Authentication, enable the Google provider and add both `violet-squid-380447.hostingersite.com` and the final custom domain under authorized domains.

The customer public pages read active, complete restaurant records directly from Firestore. Owner/admin APIs still require the Firebase Admin variables. If `/api/public/restaurants` returns 500 on Hostinger, first confirm these required server keys exist in hPanel:

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Restaurants become visible to customers from the database when their public restaurant document is active, complete, approved, and has location, cuisine, media, contact, and delivery-radius details.

## Pre-Deploy Checks

Run these locally before pushing:

```bash
npm run typecheck
npm run lint
npm run build
cmd /c npm run audit:release
```

The repository hardening audit report is generated at `scripts/release/repository-hardening-audit.md`.

After deployment, verify release and health metadata:

```bash
curl.exe https://violet-squid-380447.hostingersite.com/api/release-info
curl.exe https://violet-squid-380447.hostingersite.com/health/live
curl.exe https://violet-squid-380447.hostingersite.com/health/ready
curl.exe https://violet-squid-380447.hostingersite.com/health/startup
```

Optional environment validation after setting a local production env file:

```bash
npm run validate:prod-env
```

The complete production environment matrix is tracked in `docs/production-environment-matrix.md`.

## Firebase Data

Seed initial restaurant and master data only after the production Firebase env variables are set:

```bash
npm run firebase:seed:production
```

## Deployment Steps

1. Commit and push the repository to GitHub on `release/production-nammude`.
2. In Hostinger hPanel, choose "Deploy Your Node.js Web App".
3. Select "Import Git repository" and continue with GitHub.
4. Pick the `sarva-food` repository.
5. Set the build settings from the table above.
6. Add all required environment variables.
7. Click Deploy.
8. After deployment, open `/api/public/restaurants`. It should return `{"data":[...]}` with HTTP 200. If it returns 500, open Hostinger application logs and look for a `[Nammude public API] restaurants failed` message.
9. Verify `/`, `/restaurants`, `/restaurant/cafe-al-arab-thanisandra`, `/owner/login`, and `/admin/login`.
10. Connect the final custom domain and update `NEXT_PUBLIC_APP_URL` to that HTTPS URL.
11. Redeploy after changing `NEXT_PUBLIC_APP_URL`.

## Notes

- The repo intentionally ignores `.env*`, `.next/`, `node_modules/`, local certs, Firebase service account JSON files, and provider local state.
- Commit-safe env templates are kept as `.env.example`, `.env.production.example`, `.env.staging.example`, and `.env.hostinger.example`.
- Hostinger deployment does not use `vercel.json`; it can remain in the repo for reference/alternate deployment without affecting Hostinger.
- If the browser shows 403 after a clean Node.js redeploy, open Hostinger File Manager and confirm `public_html/.htaccess` exists and routes to the generated `nodejs` application directory. Hostinger documents this as the expected routing file for server-side frameworks like Next.js, and a redeploy should regenerate it.
