# Production Checklist

Phase 5A Kitchen repository closure: PASS. Hosted QA must verify waiter push on phone/tablet/desktop, owner silent notification, fallback ordering, acknowledgement synchronization, escalation timing, Kitchen TV layout, and physical KOT printing.

Phase 4D repository closure: PASS. The deterministic operational suite passes 9/9 and full local release gates pass. Deployment sign-off remains blocked only by production environment, provider-console, authenticated real-device/browser, Firebase Console, Lighthouse, and hardware evidence.

Feature ID: `RC6.5-SYNCHRONIZED-READINESS`

## Current Gate Status

| Status | Gate | Evidence / Action |
| --- | --- | --- |
| ✅ Completed | Public hosted smoke | `docs/validation/PRODUCTION_SMOKE_REPORT.md`: `7` pass, `18` manual. |
| ✅ Completed | Hosted provider probe | `docs/validation/PROVIDER_VERIFICATION_REPORT.md`: `8` pass, `3` manual. |
| ✅ Completed | Bundle/performance reports | `docs/performance/FINAL_BUNDLE_REPORT.md`, `docs/performance/PRODUCTION_PERFORMANCE_VERIFICATION_REPORT.md`. |
| ✅ Completed | Phase 4C repository verification | `docs/validation/PHASE_4C_AUTOMATED_VERIFICATION.md`: `19/19` checks, 34 notification scenarios, 10 tenant mappings. |
| ✅ Completed | Phase 5C workflow verification | `docs/validation/OPERATIONAL_HARDENING_REPORT.md`: `20/20` checks covering payment independence, POS New Order cancel resume, Owner Orders payment state, and Kitchen item-first cards. |
| 🔴 Required | Hostinger RC6.5 runtime metadata | Hosted metadata must report final RC6.5 SHA, `applicationVersion=v1.0.0-rc6.5`, `deploymentEnvironment=production`, and Node `v22.x`; use `/api/release-info` for the exact hosted SHA. |
| 🔴 Blocking | Production env validation | `docs/validation/PRODUCTION_ENV_VALIDATION_REPORT.md`: `17` errors and `1` manual check needing production Hostinger/Firebase/QR/alert/encryption values and owner Razorpay verification. |
| 🟡 Pending Manual | Browser/device/provider/hardware/Lighthouse | Complete before go-live. |

## Hostinger

- Set `NEXT_PUBLIC_APP_ENV=production`.
- Set `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc6.5`.
- Set final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure Firebase Admin credentials.
- Set the documented public Firebase VAPID key and verify `vapidConfigured=true` after Phase 5C deploy.
- Set a stable `PAYMENT_SETTINGS_ENCRYPTION_KEY` with at least 32 random characters.
- Configure `TABLE_QR_SECRET`.
- Configure `DATABASE_ALERT_EMAIL`.
- Configure provider secrets only in Hostinger/env dashboards.
- Redeploy current branch.
- Clear Hostinger cache.
- Verify `/api/release-info` reports final SHA, `applicationVersion: v1.0.0-rc6.5`, and `deploymentEnvironment: production`.
- Verify `/health/live`, `/health/ready`, and `/health/startup`.

Current hosted probe on 2026-07-16:

- `/api/release-info`: Node is `v22.x`, `applicationVersion=v1.0.0-rc6.5`, `deploymentEnvironment=production`, and the hosted SHA matches the final RC6.5 commit.
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
- Razorpay: configure per owner; run connection, key, test order, checkout, signature, webhook, capture, failure/cancel/timeout, refund, rotation, and settlement checks.
- WhatsApp: token, phone id, webhook verify, template/send.
- SMS: provider selection and transactional compliance.
- Meta: OAuth/app review before publishing.
- Push: Owner Notification Test Center registration/refresh/removal plus real foreground/background/action/deep-link/unsubscribe across supported browsers/devices.

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
