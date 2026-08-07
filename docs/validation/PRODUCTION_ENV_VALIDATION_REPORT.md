# Production Environment Validation Report

Generated: 2026-08-07T07:05:06.846Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 35 |
| WARNING | 3 |
| ERROR | 10 |
| FAIL | 0 |
| MANUAL | 2 |

## Checks

| Category | Classification | Check | Status | Detail |
| --- | --- | --- | --- | --- |
| Release Metadata | Required | required:NEXT_PUBLIC_APP_ENV | ERROR | Required because it selects production-safe behavior. Used by runtime configuration. Fix: set to production. |
| Infrastructure | Required | required:NEXT_PUBLIC_APP_URL | PASS | configured |
| Infrastructure | Required | placeholder:NEXT_PUBLIC_APP_URL | ERROR | A placeholder cannot initialize production safely. Used by public URL and mutation-origin validation. Fix: set the final HTTPS origin. |
| Release Metadata | Required | required:NEXT_PUBLIC_APP_VERSION | ERROR | Required because it identifies the deployed release. Used by release and health endpoints. Fix: set to v1.0.0-rc6.5. |
| Firebase | Required | required:NEXT_PUBLIC_USE_FIREBASE | PASS | configured |
| Firebase | Required | required:NEXT_PUBLIC_FIREBASE_API_KEY | PASS | configured |
| Authentication | Required | required:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | PASS | configured |
| Firebase | Required | required:NEXT_PUBLIC_FIREBASE_PROJECT_ID | PASS | configured |
| Firebase | Required | required:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | PASS | configured |
| Notifications | Required | required:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | PASS | configured |
| Firebase | Required | required:NEXT_PUBLIC_FIREBASE_APP_ID | PASS | configured |
| Firebase | Required | required:FIREBASE_ADMIN_PROJECT_ID | ERROR | Required because it authorizes server-side tenant operations on Hostinger. Used by src/firebase/admin.ts. Fix: set the service-account project id. |
| Firebase | Required | required:FIREBASE_ADMIN_CLIENT_EMAIL | ERROR | Required because it identifies the server service account. Used by src/firebase/admin.ts. Fix: set the service-account client email. |
| Security | Required | required:FIREBASE_ADMIN_PRIVATE_KEY | ERROR | Required because it signs Firebase Admin requests. Used by src/firebase/admin.ts. Fix: set the full PEM value with escaped newlines. |
| QR | Required | required:TABLE_QR_SECRET | ERROR | Required because it prevents forged table sessions. Used by table QR signing and verification. Fix: generate and retain a random value of at least 32 characters. |
| Payments | Required | required:PAYMENT_SETTINGS_ENCRYPTION_KEY | ERROR | Required because it protects owner-managed payment credentials at rest. Used by payment settings encryption. Fix: generate and retain a random value of at least 32 characters. |
| Notifications | Recommended | optional:notifications | PASS | configured |
| Notifications | Recommended | optional:notifications | WARNING | email notifications and outage alerts remain unavailable. Missing: DATABASE_ALERT_EMAIL. Fix: configure the SMTP group and alert recipient together. |
| Infrastructure | Recommended | optional:infrastructure | PASS | configured |
| Authentication | Recommended | optional:authentication | PASS | configured |
| Infrastructure | Recommended | optional:infrastructure | PASS | configured |
| Infrastructure | Required | url:NEXT_PUBLIC_APP_URL | ERROR | must be a valid https URL. Required to prevent unsafe or ambiguous production startup. Used by Infrastructure configuration. Fix: set the documented production value and rerun npm run validate:prod-env. |
| Infrastructure | Recommended | url:NEXT_PUBLIC_SHORT_LINK_ORIGIN | WARNING | missing; smart links will safely use NEXT_PUBLIC_APP_URL |
| Marketing | Optional | whatsapp:cloud-api | MANUAL | optional for sharing links; required only for automated outbound WhatsApp messages |
| Monitoring | Recommended | monitoring:sentry | WARNING | missing; first-party structured monitoring remains active but external alerting is unavailable |
| Firebase | Required | firebase:NEXT_PUBLIC_USE_FIREBASE | PASS | must be true |
| Firebase | Required | firebase:emulators | PASS | must not be true in production; absence safely defaults to false |
| Authentication | Required | login:dev | ERROR | must not be true in production; absence safely defaults to false. Required to prevent unsafe or ambiguous production startup. Used by Authentication configuration. Fix: set the documented production value and rerun npm run validate:prod-env. |
| Authentication | Required | login:test | PASS | must not be true in production; absence safely defaults to false |
| Infrastructure | Required | plugins:quality | PASS | quality diagnostics should stay disabled unless profiling |
| Infrastructure | Required | plugins:dashboard | PASS | developer dashboard must stay disabled |
| Infrastructure | Required | plugins:profiler | PASS | plugin profiler must stay disabled unless profiling |
| Infrastructure | Required | plugins:restaurant-health | PASS | restaurant health plugin should stay disabled unless running controlled admin smoke |
| Infrastructure | Required | plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET | PASS | example plugin flags must stay disabled in production |
| Infrastructure | Required | plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET | PASS | example plugin flags must stay disabled in production |
| Infrastructure | Required | plugins:example:NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET | PASS | example plugin flags must stay disabled in production |
| Infrastructure | Required | plugins:example:NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET | PASS | example plugin flags must stay disabled in production |
| Firebase | Required | firebase:api-key-format | PASS | client api key must look like a Firebase web key |
| Firebase | Required | firebase:app-id-format | PASS | app id must match 1:<sender>:web:<hash> |
| Firebase | Required | firebase:sender-format | PASS | messaging sender id must be numeric |
| Infrastructure | Required | cloudinary:cloud-name-match | PASS | public and server cloud names must match |
| Infrastructure | Required | cloudinary:cloud-name-format | PASS | cloud name format |
| Infrastructure | Required | cloudinary:api-key-format | PASS | api key should be numeric |
| Payments | Optional | razorpay:configuration | MANUAL | owner-scoped configuration required; global fallback intentionally disabled |
| Notifications | Required | smtp:port | PASS | port must be positive integer |
| Notifications | Required | smtp:secure | PASS | SMTP_SECURE must be true or false |
| Notifications | Required | smtp:from | PASS | SMTP_FROM must include email address |
| Notifications | Required | smtp:gmail-app-password | PASS | Gmail should use a 16-character app password |
| Authentication | Required | oauth:client-match | PASS | public/server OAuth client ids must match |
| Authentication | Required | oauth:client-format | PASS | Google OAuth client id format |

## Release Metadata

- **ERROR** `required:NEXT_PUBLIC_APP_ENV`: Required because it selects production-safe behavior. Used by runtime configuration. Fix: set to production.
- **ERROR** `required:NEXT_PUBLIC_APP_VERSION`: Required because it identifies the deployed release. Used by release and health endpoints. Fix: set to v1.0.0-rc6.5.

## Infrastructure

- **PASS** `required:NEXT_PUBLIC_APP_URL`: configured
- **ERROR** `placeholder:NEXT_PUBLIC_APP_URL`: A placeholder cannot initialize production safely. Used by public URL and mutation-origin validation. Fix: set the final HTTPS origin.
- **PASS** `optional:infrastructure`: configured
- **PASS** `optional:infrastructure`: configured
- **ERROR** `url:NEXT_PUBLIC_APP_URL`: must be a valid https URL. Required to prevent unsafe or ambiguous production startup. Used by Infrastructure configuration. Fix: set the documented production value and rerun npm run validate:prod-env.
- **WARNING** `url:NEXT_PUBLIC_SHORT_LINK_ORIGIN`: missing; smart links will safely use NEXT_PUBLIC_APP_URL
- **PASS** `plugins:quality`: quality diagnostics should stay disabled unless profiling
- **PASS** `plugins:dashboard`: developer dashboard must stay disabled
- **PASS** `plugins:profiler`: plugin profiler must stay disabled unless profiling
- **PASS** `plugins:restaurant-health`: restaurant health plugin should stay disabled unless running controlled admin smoke
- **PASS** `plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET`: example plugin flags must stay disabled in production
- **PASS** `plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET`: example plugin flags must stay disabled in production
- **PASS** `plugins:example:NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET`: example plugin flags must stay disabled in production
- **PASS** `plugins:example:NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET`: example plugin flags must stay disabled in production
- **PASS** `cloudinary:cloud-name-match`: public and server cloud names must match
- **PASS** `cloudinary:cloud-name-format`: cloud name format
- **PASS** `cloudinary:api-key-format`: api key should be numeric

## Firebase

- **PASS** `required:NEXT_PUBLIC_USE_FIREBASE`: configured
- **PASS** `required:NEXT_PUBLIC_FIREBASE_API_KEY`: configured
- **PASS** `required:NEXT_PUBLIC_FIREBASE_PROJECT_ID`: configured
- **PASS** `required:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: configured
- **PASS** `required:NEXT_PUBLIC_FIREBASE_APP_ID`: configured
- **ERROR** `required:FIREBASE_ADMIN_PROJECT_ID`: Required because it authorizes server-side tenant operations on Hostinger. Used by src/firebase/admin.ts. Fix: set the service-account project id.
- **ERROR** `required:FIREBASE_ADMIN_CLIENT_EMAIL`: Required because it identifies the server service account. Used by src/firebase/admin.ts. Fix: set the service-account client email.
- **PASS** `firebase:NEXT_PUBLIC_USE_FIREBASE`: must be true
- **PASS** `firebase:emulators`: must not be true in production; absence safely defaults to false
- **PASS** `firebase:api-key-format`: client api key must look like a Firebase web key
- **PASS** `firebase:app-id-format`: app id must match 1:<sender>:web:<hash>
- **PASS** `firebase:sender-format`: messaging sender id must be numeric

## Authentication

- **PASS** `required:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: configured
- **PASS** `optional:authentication`: configured
- **ERROR** `login:dev`: must not be true in production; absence safely defaults to false. Required to prevent unsafe or ambiguous production startup. Used by Authentication configuration. Fix: set the documented production value and rerun npm run validate:prod-env.
- **PASS** `login:test`: must not be true in production; absence safely defaults to false
- **PASS** `oauth:client-match`: public/server OAuth client ids must match
- **PASS** `oauth:client-format`: Google OAuth client id format

## Notifications

- **PASS** `required:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: configured
- **PASS** `optional:notifications`: configured
- **WARNING** `optional:notifications`: email notifications and outage alerts remain unavailable. Missing: DATABASE_ALERT_EMAIL. Fix: configure the SMTP group and alert recipient together.
- **PASS** `smtp:port`: port must be positive integer
- **PASS** `smtp:secure`: SMTP_SECURE must be true or false
- **PASS** `smtp:from`: SMTP_FROM must include email address
- **PASS** `smtp:gmail-app-password`: Gmail should use a 16-character app password

## Security

- **ERROR** `required:FIREBASE_ADMIN_PRIVATE_KEY`: Required because it signs Firebase Admin requests. Used by src/firebase/admin.ts. Fix: set the full PEM value with escaped newlines.

## QR

- **ERROR** `required:TABLE_QR_SECRET`: Required because it prevents forged table sessions. Used by table QR signing and verification. Fix: generate and retain a random value of at least 32 characters.

## Payments

- **ERROR** `required:PAYMENT_SETTINGS_ENCRYPTION_KEY`: Required because it protects owner-managed payment credentials at rest. Used by payment settings encryption. Fix: generate and retain a random value of at least 32 characters.
- **MANUAL** `razorpay:configuration`: owner-scoped configuration required; global fallback intentionally disabled

## Marketing

- **MANUAL** `whatsapp:cloud-api`: optional for sharing links; required only for automated outbound WhatsApp messages

## Monitoring

- **WARNING** `monitoring:sentry`: missing; first-party structured monitoring remains active but external alerting is unavailable
