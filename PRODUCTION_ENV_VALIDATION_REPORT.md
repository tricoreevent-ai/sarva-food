# Production Environment Validation Report

Generated: 2026-07-09T11:16:54.862Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 46 |
| WARNING | 1 |
| ERROR | 24 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| required:NEXT_PUBLIC_APP_ENV | ERROR | missing or empty |
| required:NEXT_PUBLIC_APP_URL | PASS | configured |
| placeholder:NEXT_PUBLIC_APP_URL | ERROR | value still looks like a placeholder/local example |
| required:NEXT_PUBLIC_APP_VERSION | ERROR | missing or empty |
| required:NEXT_PUBLIC_USE_FIREBASE | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_API_KEY | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_PROJECT_ID | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | PASS | configured |
| required:NEXT_PUBLIC_FIREBASE_VAPID_KEY | ERROR | missing or empty |
| required:NEXT_PUBLIC_FIREBASE_APP_ID | PASS | configured |
| required:FIREBASE_ADMIN_PROJECT_ID | ERROR | missing or empty |
| required:FIREBASE_ADMIN_CLIENT_EMAIL | ERROR | missing or empty |
| required:FIREBASE_ADMIN_PRIVATE_KEY | ERROR | missing or empty |
| required:TABLE_QR_SECRET | ERROR | missing or empty |
| required:SMTP_HOST | PASS | configured |
| required:SMTP_PORT | PASS | configured |
| required:SMTP_SECURE | PASS | configured |
| required:SMTP_USER | PASS | configured |
| required:SMTP_PASS | PASS | configured |
| required:SMTP_FROM | PASS | configured |
| required:DATABASE_ALERT_EMAIL | ERROR | missing or empty |
| required:NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN | PASS | configured |
| required:NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID | PASS | configured |
| required:GOOGLE_OAUTH_CLIENT_ID | PASS | configured |
| required:GOOGLE_OAUTH_CLIENT_SECRET | PASS | configured |
| required:NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME | PASS | configured |
| required:CLOUDINARY_CLOUD_NAME | PASS | configured |
| required:CLOUDINARY_API_KEY | PASS | configured |
| required:CLOUDINARY_API_SECRET | PASS | configured |
| required:NEXT_PUBLIC_RAZORPAY_KEY_ID | ERROR | missing or empty |
| required:RAZORPAY_KEY_ID | ERROR | missing or empty |
| required:RAZORPAY_KEY_SECRET | ERROR | missing or empty |
| required:RAZORPAY_WEBHOOK_SECRET | ERROR | missing or empty |
| version:NEXT_PUBLIC_APP_VERSION | ERROR | expected v1.0.0-rc4 |
| environment:NEXT_PUBLIC_APP_ENV | ERROR | must be production |
| url:NEXT_PUBLIC_APP_URL | ERROR | must be a valid https URL |
| firebase:NEXT_PUBLIC_USE_FIREBASE | PASS | must be true |
| firebase:emulators | PASS | must be false in production |
| login:dev | ERROR | must be false in production |
| login:test | PASS | must be false in production |
| plugins:quality | PASS | quality diagnostics should stay disabled unless profiling |
| plugins:dashboard | PASS | developer dashboard must stay disabled |
| plugins:profiler | PASS | plugin profiler must stay disabled unless profiling |
| plugins:restaurant-health | PASS | restaurant health plugin should stay disabled unless running controlled admin smoke |
| plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET | PASS | example plugin flags must stay disabled in production |
| plugins:example:NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET | PASS | example plugin flags must stay disabled in production |
| plugins:example:NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET | PASS | example plugin flags must stay disabled in production |
| plugins:example:NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET | PASS | example plugin flags must stay disabled in production |
| firebase:api-key-format | PASS | client api key must look like a Firebase web key |
| firebase:app-id-format | PASS | app id must match 1:<sender>:web:<hash> |
| firebase:sender-format | PASS | messaging sender id must be numeric |
| firebase:admin-project-match | ERROR | admin and public project ids must match |
| firebase:admin-email | ERROR | admin client email must be a service account |
| firebase:private-key | ERROR | private key must be full PEM with escaped newlines |
| cloudinary:cloud-name-match | PASS | public and server cloud names must match |
| cloudinary:cloud-name-format | PASS | cloud name format |
| cloudinary:api-key-format | PASS | api key should be numeric |
| razorpay:public-key | ERROR | production key must start rzp_live_ |
| razorpay:key-match | PASS | public/server key ids must match |
| razorpay:secret-strength | ERROR | secret must be configured |
| razorpay:webhook-strength | ERROR | webhook secret must be configured |
| smtp:port | PASS | port must be positive integer |
| smtp:secure | PASS | SMTP_SECURE must be true or false |
| smtp:from | PASS | SMTP_FROM must include email address |
| smtp:gmail-app-password | PASS | Gmail should use a 16-character app password |
| oauth:client-match | PASS | public/server OAuth client ids must match |
| oauth:client-format | PASS | Google OAuth client id format |
| secret:TABLE_QR_SECRET | ERROR | minimum 32 characters |
| secret:PAYMENT_SETTINGS_ENCRYPTION_KEY | WARNING | recommended for encrypted owner payment settings |
