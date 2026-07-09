# Rollback Guide

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Immediate Rollback

1. Disable plugin and diagnostics flags:
   - `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD=false`
   - `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false`
   - `NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD=false`
   - `NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER=false`
2. Redeploy the last known good Hostinger commit.
3. Clear Hostinger cache.
4. Verify `/api/release-info` SHA/version.
5. Verify `/health/live`, `/health/ready`, and `/health/startup`.
6. Run public route smoke.

## Provider Rollback

- Razorpay: disable online payment and keep COD/manual payment.
- WhatsApp/SMS/Push: disable failing channel and use email/manual fallback.
- Cloudinary: keep existing image URLs; stop new uploads until provider recovers.
- SMTP: disable dependent OTP/mail expectations and use manual support flow if needed.

## Data Safety

- No RC1 repository-side schema migration is introduced.
- No Firestore collection/index/rule change is introduced by RC1 docs/certification.
- If manual Firebase rule/index deploy causes errors, redeploy the previous known rules/indexes from backup.

## Verification After Rollback

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Hosted release info and health probes
- Targeted browser smoke for affected workflow

