# Release Notes

## v1.0.0-rc1 - Release Candidate

Commit: `6823c15e5a7906decf179e329b7bee1f9617dd28`
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Local, remote, and hosted release metadata are aligned to the same commit.
- Application code is frozen for release closure.
- Enterprise Hardening has not started.
- Production release remains blocked by manual environment, provider, Firestore, browser, and hardware verification gates.

### Completed

- Sprint 1 production-readiness code pass from base `8a0315c37228918e82498ae0d7c78317d616da45`: FCM push, explicit Firestore support rules, owner API mutation hardening, monitoring, and targeted performance cleanup.
- Owner Operations Center V2 active orders stabilization.
- Kitchen Operations Center and Kitchen History readiness.
- Razorpay server integration, webhook handling, refunds, and owner settings support.
- POS/Kitchen operational workflow stabilization.
- Split bill, transfer table, merge table, payment history, print history, audit timeline, and notification center workflows.
- QR ordering, phone verification, printing, customer module, owner module, admin module, and Master Menu Library release-candidate code readiness.

### Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed with the known Firebase/protobuf dynamic dependency warning.
- `git diff --check`: passed with Git line-ending normalization warning only.
- `cmd /c npm run validate:prod-env`: failed because production environment values are incomplete in this workspace.

### Mandatory Gates Still Open

- Firebase Web Push VAPID key must be configured before production push smoke.
- `NEXT_PUBLIC_APP_ENV` must be `production`; hosted metadata currently reports `development`.
- `NEXT_PUBLIC_APP_URL` must use `https://` in production-equivalent env validation.
- Firebase Admin variables must be configured with real production values.
- `DATABASE_ALERT_EMAIL` must be configured.
- Firestore rules and indexes require manual production deployment review.
- Hosted `/robots.txt` must be refreshed after Hostinger restart/cache clear; current hosted output still blocks Googlebot although the local build route is correct.
- Authenticated browser smoke, provider smoke, and printer/hardware smoke remain manual.

### Rollback

Previous validated Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`.
