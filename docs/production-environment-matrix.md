# Production Environment Matrix

Last updated: 2026-07-08

Release: `v1.0.0-rc3`

## Required

| Variable | Purpose | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Public runtime environment; must be `production`. | Hostinger |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS app URL. | Hostinger |
| `NEXT_PUBLIC_APP_VERSION` | Release version; must be `v1.0.0-rc3`. | Release metadata |
| `NEXT_PUBLIC_USE_FIREBASE` | Enables Firebase-backed runtime; must be `true`. | Hostinger |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push VAPID key for FCM browser push smoke. | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase client app id. | Firebase Console |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin SDK project id. | Firebase service account |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin SDK client email. | Firebase service account |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin SDK private key with escaped `\n`. | Firebase service account |
| `TABLE_QR_SECRET` | Production QR signing secret; at least 32 characters. | Manual secret |
| `SMTP_HOST` | SMTP host. | SMTP provider |
| `SMTP_PORT` | SMTP port. | SMTP provider |
| `SMTP_SECURE` | SMTP TLS flag; `true` or `false`. | SMTP provider |
| `SMTP_USER` | SMTP username. | SMTP provider |
| `SMTP_PASS` | SMTP password or app password. | SMTP provider |
| `SMTP_FROM` | Sender identity. | SMTP provider |
| `DATABASE_ALERT_EMAIL` | Customer-data outage alert recipient. | Operations |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox maps/autocomplete token. | Mapbox |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Browser Google OAuth client id. | Google Cloud |
| `GOOGLE_OAUTH_CLIENT_ID` | Server Google OAuth client id; must match public id. | Google Cloud |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Server Google OAuth client secret. | Google Cloud |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public Cloudinary cloud name. | Cloudinary |
| `CLOUDINARY_CLOUD_NAME` | Server Cloudinary cloud name. | Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary signing API key. | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary signing API secret. | Cloudinary |

## Optional

| Variable | Purpose | Rule |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase/GA measurement id. | Set when analytics is enabled. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics id. | Optional analytics. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Alternate Google Analytics id. | Optional analytics. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Browser Razorpay key id. | If any Razorpay variable is set, configure all Razorpay keys. |
| `RAZORPAY_KEY_ID` | Server Razorpay key id. | Must match public key when Razorpay is enabled. |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret. | Server-only. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret. | Server-only. |
| `UPI_MERCHANT_ID` | Manual UPI merchant id. | Optional payment metadata. |
| `UPI_MERCHANT_VPA` | Manual UPI VPA. | Optional payment metadata. |
| `PAYMENT_SETTINGS_ENCRYPTION_KEY` | Stable encryption material for stored payment settings. | Recommended; at least 32 characters when set. |
| `WHATSAPP_CLOUD_API_TOKEN` | WhatsApp Cloud API token. | Required only for Cloud API launch. |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud phone number id. | Required only for Cloud API launch. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook verify token. | Required only for Cloud API launch. |
| `CLOUDINARY_URL` | Cloudinary URL alternative. | Use instead of individual Cloudinary server values only if preferred. |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stack Auth project id. | Optional/unused unless Stack Auth is enabled. |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stack Auth public key. | Optional/unused unless Stack Auth is enabled. |
| `NEXT_PUBLIC_STACK_BASE_URL` | Stack Auth base URL. | Optional/unused unless Stack Auth is enabled. |
| `STACK_SECRET_SERVER_KEY` | Stack Auth server key. | Optional/unused unless Stack Auth is enabled. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser Sentry DSN. | Optional monitoring. |
| `SENTRY_DSN` | Server Sentry DSN. | Optional monitoring. |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS` | Runtime diagnostics flag. | Defaults to enabled unless set to `false`. |

## Build Metadata

| Variable | Purpose |
| --- | --- |
| `HOSTINGER_GIT_COMMIT_SHA` | Preferred deployed commit SHA on Hostinger. |
| `GIT_COMMIT_SHA` | Generic deployed commit SHA. |
| `VERCEL_GIT_COMMIT_SHA` | Vercel commit SHA fallback. |
| `NEXT_PUBLIC_BUILD_COMMIT` | Public build commit fallback. |
| `NEXT_PUBLIC_GIT_COMMIT_SHA` | Public git commit fallback. |
| `NEXT_PUBLIC_COMMIT_SHA` | Public commit fallback. |
| `HOSTINGER_GIT_BRANCH` | Preferred deployed branch on Hostinger. |
| `VERCEL_GIT_COMMIT_REF` | Vercel branch fallback. |
| `NEXT_PUBLIC_GIT_BRANCH` | Public branch fallback. |
| `NEXT_PUBLIC_BUILD_DATE` | Public build date. |
| `NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP` | Public deployment timestamp. |
| `BUILD_DATE` | Server build date fallback. |

## Development Only

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_USE_EMULATORS` | Enables Firebase emulators locally. |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | Enables local dev login helpers. |
| `NEXT_PUBLIC_ENABLE_TEST_LOGIN` | Enables local test login helpers. |
| `SARVA_ALLOW_BUILD_WITH_DEV` | Allows build while a dev server is running. |
| `SARVA_HTTPS_PORT`, `SARVA_NEXT_INTERNAL_PORT`, `SARVA_NEXT_INTERNAL_PORTS`, `SARVA_HTTP_REDIRECT_PORT`, `SARVA_HTTP_REDIRECT_PORTS`, `SARVA_SECONDARY_HTTPS_PORT`, `SARVA_NEXT_MAX_RESTARTS`, `SARVA_DEBUG_STARTUP`, `SARVA_NEXT_DEV_ENGINE`, `SARVA_ENABLE_TURBOPACK`, `SARVA_CLEAN_STALE` | Local HTTPS/dev-server helpers. |
| `NEXT_PUBLIC_LAN_HOST` | Local LAN dev origin. |
| `SEED_SAMPLE_MENU_ITEMS`, `SEED_SAMPLE_ORDERS`, `BOOTSTRAP_OWNER_PASSWORD`, `REPAIR_RESTAURANT_ID`, `REPAIR_OWNER_EMAIL`, `REPAIR_OWNER_NAME` | Local/controlled scripts only. |

## Deprecated Or Unused

| Variable | Replacement |
| --- | --- |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | Use `NEXT_PUBLIC_FIREBASE_USE_EMULATORS`. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Use `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`. |
| `SMTP_PASSWORD` | Use `SMTP_PASS`. |
| `RAZORPAY_SECRET` | Use `RAZORPAY_KEY_SECRET`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Use `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`. |
| `MAPBOX_TOKEN` | Use `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. |
| `WHATSAPP_ACCESS_TOKEN` | Use `WHATSAPP_CLOUD_API_TOKEN`. |
| `QR_SECRET` | Use `TABLE_QR_SECRET`. |
| `STRIPE_SECRET_KEY` | Unused; no Stripe runtime is implemented. |
| `META_APP_ID`, `SMS_PROVIDER` | Roadmap/provider planning only; not required by current runtime. |
