# Release Notes

## v1.0.0-rc5 - Release Candidate

Commit: pushed RC5 production testing baseline `2b8a348c416b0d952ab80d80083202280548c4d9`; existing RC4 tag remains unchanged
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Active release metadata, package metadata, environment templates, and deployment docs now align on `v1.0.0-rc5` / `1.0.0-rc.5`.
- The existing `v1.0.0-rc1`, `v1.0.0-rc2`, `v1.0.0-rc3`, and `v1.0.0-rc4` tags remain immutable; tag the final RC5 validation commit as the new `v1.0.0-rc5` candidate.
- Phase 4 hardening and report synchronization are complete repository-side.
- Production release remains blocked by hosted `deploymentEnvironment=development`, production env validation, Firebase Console, provider dashboard, authenticated browser, Lighthouse, and hardware smoke gates.

### Completed

- Removed generated owner temporary passwords from admin API/browser responses; credentials are sent through the configured email path only.
- Replaced TinyURL raw provider error echo with a safe generic fallback message.
- Corrected production health metadata to avoid a stale `development` fallback when app env is absent.
- Expanded the production environment matrix from the actual runtime/build env scan and aligned Razorpay as production-required with `validate:prod-env`.
- Removed unconditional Cloudinary/Firebase Storage global preconnects, kept GTM preconnect conditional, and kept no-store on dynamic/release routes.
- Deferred Firebase Auth, Stack Auth, and toaster runtime from auth/session startup paths where safe.
- Prevented duplicate same-source brand logo image requests.
- Preserved the already-implemented POS/Active Orders operational workflow updates: incremental KOT, Ready To Serve waiter view, Order History filters, compact active rows, and portaled More actions.
- Fixed the More actions component hook order found during the interrupted audit continuation.
- Consolidated duplicated client error-reason helpers into `src/lib/client-diagnostics.ts`.
- Added explicit accessible names to compact order icon-only action controls.
- Completed RC5 image optimization: shared Cloudinary presets, AVIF-first upload compression, WebP/JPEG fallback, incoming Cloudinary transforms, `dpr_auto` delivery cleanup, and right-sized `SafeImage` thumbnails.
- Corrected the production environment matrix to require `v1.0.0-rc5`.
- Regenerated bundle, runtime, render, network, memory, provider, smoke, deployment, env, performance, and certification reports.
- Completed the RC5 pending-work audit: no repository-side code blocker remains; remaining work is Hostinger/Firebase/provider/browser/Lighthouse/hardware validation.

### Validation

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run build`: passed with the accepted Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run analyze`: passed with the accepted Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run profile:runtime`: passed.
- `cmd /c npm run audit:release`: passed.
- `cmd /c npm run smoke:operational`: passed.
- `cmd /c npm run validate:prod-env`: failed locally with `46` pass, `1` warning, and `24` errors requiring real production Hostinger/Firebase/Razorpay/provider secrets.
- `PRODUCTION_URL=... cmd /c npm run verify:deployment`: `15` pass, `1` warning, `1` error because hosted env still reports `development`.
- `PRODUCTION_URL=... cmd /c npm run verify:providers`: `8` pass, `3` manual.
- `PRODUCTION_URL=... cmd /c npm run smoke:production`: `7` pass, `18` manual.
- `PRODUCTION_URL=... cmd /c npm run monitor:memory`: `1` pass, `2` manual.
- `PRODUCTION_URL=... cmd /c npm run verify:performance`: `3` pass, `1` warning, `2` manual.
- 2026-07-13 RC5 closure: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed; build/analyze retain the accepted Firebase/protobuf warning.
- 2026-07-13 pending-work audit: runtime source scan found no actionable TODO/FIXME, app-source `console.log`, duplicate order component, incomplete repository path, duplicate listener, or unbounded Firestore read requiring a release-freeze code change.
- 2026-07-15 image optimization closure: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed; analyzer timeout resolved and bundle evidence regenerated.

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
- Added root `docs/performance/PERFORMANCE_REPORT.md` and completed runtime-focused performance recovery: deferred Google Analytics, idle-mounted customer shell background providers, lazy-loaded logout/favorite/Firestore address modules, made Firebase compatibility exports non-eager, deferred home menu preview fetch until idle, and replaced the home splash loader with a layout-reserving skeleton.
- Completed Phase 2 route-level bundle splitting with `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`: `/` route JS reduced from `1017 KB` to `455 KB`, `/profile` from `1714 KB` to `562 KB`, and Firestore/Auth ownership from `94` route manifests to `10`.
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
- `cmd /c npm run audit:release`: passed and generated `docs/validation/repository-hardening-audit.md`.
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
