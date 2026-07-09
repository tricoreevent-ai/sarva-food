# Release Notes

## v1.0.0-rc4 - Release Candidate

Commit: final tagged RC4 commit
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Active release metadata, package metadata, environment templates, and deployment docs now align on `v1.0.0-rc4` / `1.0.0-rc.4`.
- The existing `v1.0.0-rc1`, `v1.0.0-rc2`, and `v1.0.0-rc3` tags remain immutable; create `v1.0.0-rc4` on the final committed candidate.
- Production release remains blocked only by manual Hostinger, Firebase Console, provider dashboard, authenticated browser, Lighthouse, and hardware smoke gates.

### Completed

- Removed generated owner temporary passwords from admin API/browser responses; credentials are sent through the configured email path only.
- Replaced TinyURL raw provider error echo with a safe generic fallback message.
- Corrected production health metadata to avoid a stale `development` fallback when app env is absent.
- Expanded the production environment matrix from the actual runtime/build env scan and aligned Razorpay as production-required with `validate:prod-env`.

### Validation

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run build`: passed with the accepted Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run audit:release`: passed.
- `cmd /c npm run smoke:operational`: passed.
- `git diff --check`: passed with Git line-ending normalization warnings only.
- `cmd /c npm run validate:prod-env`: failed locally with `46` pass, `1` warning, and `24` errors requiring real production Hostinger/Firebase/Razorpay/provider secrets.
- `cmd /c npm run verify:providers`: failed locally with `6` pass, `4` errors, and `1` manual for missing Firebase Admin/Firestore, Razorpay, WhatsApp, and live provider credentials.

## v1.0.0-rc3 - Release Candidate

Commit: `cd1c81435a1e535483b94d66ffa1b1bf63494c0b`
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Repository-side health endpoints, diagnostics, observability, release metadata, env validation, QR secret requirements, and safe diagnostics have been hardened for rc3.
- Runtime performance recovery and Phase 2 route-level bundle splitting were completed repository-side; final Lighthouse/Core Web Vitals scoring still requires a production-env hosted browser run.
- The existing `v1.0.0-rc1` and published `v1.0.0-rc2` tags remain immutable; `v1.0.0-rc3` points to the final committed candidate.
- Production release remains blocked by manual environment, provider, Firestore, browser, and hardware verification gates.

### Completed

- Repository-side observability hardening: request/correlation/trace/transaction context, masked production logger, unified API error primitives, and centralized high-risk server diagnostics.
- Added root `PERFORMANCE_REPORT.md` and completed runtime-focused performance recovery: deferred Google Analytics, idle-mounted customer shell background providers, lazy-loaded logout/favorite/Firestore address modules, made Firebase compatibility exports non-eager, deferred home menu preview fetch until idle, and replaced the home splash loader with a layout-reserving skeleton.
- Completed Phase 2 route-level bundle splitting with `BUNDLE_DEEP_ANALYSIS.md`, `DEPENDENCY_AUDIT.md`, `ROUTE_LOAD_ANALYSIS.md`, and `PERFORMANCE_PHASE2_REPORT.md`: `/` route JS reduced from `1017 KB` to `455 KB`, `/profile` from `1714 KB` to `562 KB`, and Firestore/Auth ownership from `94` route manifests to `10`.
- Added public no-store `/health/live`, `/health/ready`, and `/health/startup` endpoints with safe runtime, Firebase, Firestore, storage, SMTP, Cloudinary, Razorpay, memory, CPU, build, and request-id metadata.
- Expanded authenticated Owner/Admin diagnostics with operational health metadata for listener ownership, cache state, queue state, tenant/open-order/Kitchen counts, memory, CPU estimate, and slow-query signal.
- Added `npm run audit:release` with generated repository hardening audit report and production operational runbook/checklists.
- Enterprise production-hardening and release-closure pass through local repository-verifiable gates.
- Release metadata default updated to `v1.0.0-rc3`; package version updated to `1.0.0-rc.3`.
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
- `cmd /c npm run audit:release`: passed and generated `scripts/release/repository-hardening-audit.md`.
- `npm run build`: passed with the known Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run analyze`: passed and regenerated `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html`.
- Local production HTML probe: passed for `/`, `/profile`, `/login`, and `/owner/pos`; `/`, `/profile`, and `/owner/pos` do not initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks.
- `cmd /c npm run smoke:operational`: passed.
- `git diff --check`: passed with Git line-ending normalization warning only.
- `cmd /c npm run validate:prod-env`: expected to fail locally unless real production Hostinger/Firebase/provider values are present.

### Mandatory Gates Still Open

- Firebase Web Push VAPID key must be configured before production push smoke.
- `NEXT_PUBLIC_APP_ENV` must be `production`; hosted metadata currently reports `development`.
- `NEXT_PUBLIC_APP_VERSION` must be `v1.0.0-rc3` when configured in Hostinger.
- `NEXT_PUBLIC_APP_URL` must use `https://` in production-equivalent env validation.
- Firebase Admin variables must be configured with real production values.
- `TABLE_QR_SECRET` must be configured with a stable long random secret.
- `DATABASE_ALERT_EMAIL` must be configured.
- Firestore rules and indexes require manual production deployment review.
- Hosted `/robots.txt` must be refreshed after Hostinger restart/cache clear; current hosted output still blocks Googlebot although the local build route is correct.
- Authenticated browser smoke, provider smoke, and printer/hardware smoke remain manual.

### Rollback

Previous validated Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`.
