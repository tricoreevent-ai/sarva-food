# Release Notes

## v1.0.0-rc2 - Release Candidate

Commit: final SHA after the release hardening commit is created
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Repository-side release metadata, env validation, QR secret requirements, and safe diagnostics have been hardened for rc2.
- The existing `v1.0.0-rc1` tag remains immutable; `v1.0.0-rc2` is the correct tag for the final committed candidate.
- Production release remains blocked by manual environment, provider, Firestore, browser, and hardware verification gates.

### Completed

- Enterprise production-hardening and release-closure pass through local repository-verifiable gates.
- Release metadata default updated to `v1.0.0-rc2`; package version updated to `1.0.0-rc.2`.
- Production env matrix added and validation scripts aligned to actual runtime requirements.
- Production QR signing now requires explicit `TABLE_QR_SECRET`.
- Raw-error logging/diagnostic paths were sanitized in customer/public/payment/admin release surfaces.
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
- `cmd /c npm run validate:prod-env`: expected to fail locally unless real production Hostinger/Firebase/provider values are present.

### Mandatory Gates Still Open

- Firebase Web Push VAPID key must be configured before production push smoke.
- `NEXT_PUBLIC_APP_ENV` must be `production`; hosted metadata currently reports `development`.
- `NEXT_PUBLIC_APP_VERSION` must be `v1.0.0-rc2` when configured in Hostinger.
- `NEXT_PUBLIC_APP_URL` must use `https://` in production-equivalent env validation.
- Firebase Admin variables must be configured with real production values.
- `TABLE_QR_SECRET` must be configured with a stable long random secret.
- `DATABASE_ALERT_EMAIL` must be configured.
- Firestore rules and indexes require manual production deployment review.
- Hosted `/robots.txt` must be refreshed after Hostinger restart/cache clear; current hosted output still blocks Googlebot although the local build route is correct.
- Authenticated browser smoke, provider smoke, and printer/hardware smoke remain manual.

### Rollback

Previous validated Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`.
