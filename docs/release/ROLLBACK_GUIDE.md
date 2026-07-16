# Rollback Guide

Feature ID: `RC5-SYNCHRONIZED-READINESS`

Current decision: `NO GO` for production launch until Hostinger env and manual gates pass.

## Immediate Rollback

1. Disable plugin and diagnostics flags:
   - `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD=false`
   - `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false`
   - `NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD=false`
   - `NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER=false`
2. Redeploy the last known good Hostinger commit or the last signed RC4 SHA.
3. Clear Hostinger cache.
4. Verify `/api/release-info` SHA/version.
5. Verify `/health/live`, `/health/ready`, and `/health/startup`.
6. Run public route smoke.

## Provider Rollback

- Razorpay: disable Razorpay in the affected owner's Payment settings and keep COD/manual payment; do not delete payment intents or rotate the encryption key during rollback.
- Push: remove the affected device registration or omit the public VAPID key on rollback, then use in-app/email fallback. Keep Firebase private material server-side.
- Cloudinary: keep existing image URLs; stop new uploads until provider recovers.
- SMTP: disable dependent OTP/mail expectations and use manual support flow if needed.

## Data Safety

- No RC4 Phase 4 repository-side schema migration is introduced.
- No Firestore collection/index/rule change is introduced by Phase 4 hardening/report work.
- If manual Firebase rule/index deploy causes errors, redeploy the previous known rules/indexes from backup.

## Verification After Rollback

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Hosted release info and health probes
- Targeted browser smoke for affected workflow
