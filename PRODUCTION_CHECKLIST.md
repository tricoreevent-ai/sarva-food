# Production Checklist

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Hostinger

- Set `NEXT_PUBLIC_APP_ENV=production`.
- Set `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc4`.
- Set final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure Firebase Admin credentials.
- Configure Firebase VAPID key.
- Configure `TABLE_QR_SECRET`.
- Configure `DATABASE_ALERT_EMAIL`.
- Configure provider secrets only in Hostinger/env dashboards.
- Redeploy current branch.
- Clear Hostinger cache.
- Verify `/api/release-info` reports final SHA and `deploymentEnvironment: production`.
- Verify `/health/live`, `/health/ready`, and `/health/startup`.

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
