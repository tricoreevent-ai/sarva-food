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
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
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
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Sarva Food <orders@your-domain.com>"
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

For `FIREBASE_ADMIN_PRIVATE_KEY`, Hostinger hPanel asks for the variable name and value separately. Paste only the value, without surrounding quotes. Use escaped `\n` line breaks, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`. The app now tolerates accidentally quoted values, but unquoted is the clean production format. Do not upload or commit `service-account-key.json`.

For customer Google sign-in, add the same OAuth client id to `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_ID`, and add the OAuth secret to `GOOGLE_OAUTH_CLIENT_SECRET`. In Firebase Authentication, enable the Google provider and add both `mistyrose-butterfly-740173.hostingersite.com` and the final custom domain under authorized domains.

## Pre-Deploy Checks

Run these locally before pushing:

```bash
npm run typecheck
npm run lint
npm run build
```

Optional environment validation after setting a local production env file:

```bash
npm run validate:prod-env
```

## Firebase Launch Data

Seed the launch restaurants and master data only after the production Firebase env variables are set:

```bash
npm run firebase:seed:production
```

To remove non-launch restaurants, run a dry run first:

```bash
npm run firebase:launch-cleanup:dry-run
```

Then apply only after reviewing the output:

```bash
npm run firebase:launch-cleanup:apply
```

The cleanup keeps the launch restaurant ids `test-owner` and `falak-leela-bhartiya`.

## Deployment Steps

1. Commit and push the repository to GitHub on `main`.
2. In Hostinger hPanel, choose "Deploy Your Node.js Web App".
3. Select "Import Git repository" and continue with GitHub.
4. Pick the `sarva-food` repository.
5. Set the build settings from the table above.
6. Add all required environment variables.
7. Click Deploy.
8. After deployment, open `/api/public/restaurants`. It should return `{"data":[...]}` with HTTP 200. If it returns 500, open Hostinger application logs and look for a `[Sarva public API] restaurants failed` message.
9. Verify `/`, `/restaurants`, `/restaurant/cafe-al-arab`, `/owner/login`, and `/admin/login`.
10. Connect the final custom domain and update `NEXT_PUBLIC_APP_URL` to that HTTPS URL.
11. Redeploy after changing `NEXT_PUBLIC_APP_URL`.

## Notes

- The repo intentionally ignores `.env*`, `.next/`, `node_modules/`, local certs, Firebase service account JSON files, and provider local state.
- Commit-safe env templates are kept as `.env.example`, `.env.production.example`, `.env.staging.example`, and `.env.hostinger.example`.
- Hostinger deployment does not use `vercel.json`; it can remain in the repo for reference/alternate deployment without affecting Hostinger.
