# Production Checklist

Feature ID: `RC5-SYNCHRONIZED-READINESS`

## Current Gate Status

| Status | Gate | Evidence / Action |
| --- | --- | --- |
| ✅ Completed | Public hosted smoke | `docs/validation/PRODUCTION_SMOKE_REPORT.md`: `7` pass, `18` manual. |
| ✅ Completed | Hosted provider probe | `docs/validation/PROVIDER_VERIFICATION_REPORT.md`: `8` pass, `3` manual. |
| ✅ Completed | Bundle/performance reports | `docs/performance/FINAL_BUNDLE_REPORT.md`, `docs/performance/PRODUCTION_PERFORMANCE_VERIFICATION_REPORT.md`. |
| 🔴 Blocking | Hostinger release metadata | Hosted metadata reports `applicationVersion=v1.0.0-rc4` and `deploymentEnvironment=development`; set `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc5` and `NEXT_PUBLIC_APP_ENV=production`. |
| 🔴 Blocking | Production env validation | `docs/validation/PRODUCTION_ENV_VALIDATION_REPORT.md`: `24` errors needing real production values. |
| 🟡 Pending Manual | Browser/device/provider/hardware/Lighthouse | Complete before go-live. |

## Hostinger

- Set `NEXT_PUBLIC_APP_ENV=production`.
- Set `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc5`.
- Set final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure Firebase Admin credentials.
- Configure Firebase VAPID key.
- Configure `TABLE_QR_SECRET`.
- Configure `DATABASE_ALERT_EMAIL`.
- Configure provider secrets only in Hostinger/env dashboards.
- Redeploy current branch.
- Clear Hostinger cache.
- Verify `/api/release-info` reports final SHA, `applicationVersion: v1.0.0-rc5`, and `deploymentEnvironment: production`.
- Verify `/health/live`, `/health/ready`, and `/health/startup`.

Current hosted probe on 2026-07-13:

- `/api/release-info`: hosted SHA is still `dcff59e050de1dace19460198cb2909372bce7d5`, Node is `v22.18.0`, but version/env remain `v1.0.0-rc4` and `development`; deploy `fc0986e9ba5dedb302dedcdd5eb9e20346844dba`.
- `/health/ready`: `ok`; Firestore connected, Storage/SMTP/Cloudinary configured, Firebase Admin/Public configured, VAPID missing, Razorpay owner-scoped or missing.
- `/health/startup`: `ok`; Firestore connected, Storage/SMTP/Cloudinary configured, Firebase Admin/Public configured, VAPID missing, Razorpay owner-scoped or missing.

## Firebase

- Confirm production project id.
- Deploy Firestore rules.
- Deploy Firestore indexes.
- Confirm Storage rules.
- Confirm authorized domains.
- Confirm Firebase Auth providers.
- Confirm Cloud Messaging VAPID key.
- Confirm emulators are disabled.
- Run protected read/write smoke with real roles.

## Providers

- SMTP: OTP, owner credentials, order mail, outage mail.
- Google OAuth: hosted sign-in and redirect domain.
- Cloudinary: signature, upload, transformed image delivery.
- Mapbox: token, map load, profile/address surfaces.
- Razorpay: order, checkout, verify, webhook, failure, refund.
- WhatsApp: token, phone id, webhook verify, template/send.
- SMS: provider selection and transactional compliance.
- Meta: OAuth/app review before publishing.
- Push: foreground/background, click deep link, unsubscribe.

## Security

- HTTPS enforced.
- HSTS present.
- Security headers present.
- CSP reviewed.
- Secure cookies/session behavior verified.
- No secrets in client payloads or logs.
- Feature flags disabled unless explicitly approved.
- Plugin flags disabled in production.

## Performance

- Run Lighthouse mobile/desktop after redeploy.
- Run Chrome Performance and Coverage.
- Run 30-minute browser memory stability.
- Verify no duplicate listeners or polling loops.
- Verify route transitions and first input responsiveness.

## Manual Operations

- Customer order flow.
- Owner order intake.
- Kitchen lifecycle.
- POS payment/receipt.
- QR/table ordering.
- Printing and reprinting.
- Offline recovery.
- Realtime multi-device updates.
