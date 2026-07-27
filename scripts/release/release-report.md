# Food Gedi Release Report

| Field | Value |
| --- | --- |
| Build Date | 2026-07-13 |
| Git Branch | release/production-nammude |
| Local HEAD Before RC5 Commit | b8c1ed6a7d4310f80cd9fdbe9b8621e21d5fc132 |
| Runtime Release Commit SHA | pending final RC5 commit from synchronized workspace |
| Final Certification Commit SHA | pending final RC5 commit |
| Release Tag | Create `v1.0.0-rc5`; do not move `v1.0.0-rc1`, `v1.0.0-rc2`, `v1.0.0-rc3`, or `v1.0.0-rc4`. |
| Release Version | v1.0.0-rc5 |
| Node Version | v22.16.0 |
| Package Version | 1.0.0-rc.5 |
| Build Status | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Analyze | PASS |
| Operational Smoke | PASS |
| Repository Hardening Audit | PASS: generated `docs/validation/repository-hardening-audit.md`; server console logs centralized in touched paths, `0` debt markers, `0` matching unbounded Firestore collection reads. |
| Performance Recovery | PASS: `docs/performance/PERFORMANCE_REPORT.md` added; GA, customer runtime providers, public-header Firestore listener, logout/favorite action modules, Firebase compatibility exports, home menu preview fetch, and home loading skeleton were optimized without business/API/schema changes. |
| Performance Phase 2 | PASS: added `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`; `/` route JS reduced `1017 KB -> 455 KB`, `/profile` `1714 KB -> 562 KB`, and Firestore/Auth ownership `94 -> 10` route manifests. |
| Local Initial Chunk Probe | PASS: `/`, `/profile`, and `/owner/pos` do not initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks; `/login` keeps auth chunks as expected. |
| Production Lighthouse | PENDING: PageSpeed API quota returned `429 RESOURCE_EXHAUSTED`; rerun after Hostinger serves the performance recovery commit with production env. |
| Health Endpoints | PASS: local production server returned `/health/live` 200 and safe degraded `/health/ready`/`/health/startup` 503 because local Firebase Admin production env is absent. |
| Local Release Info | Release metadata source is `v1.0.0-rc5`; hosted/local runtime probe remains manual after final deployment. |
| Git Diff | PASS |
| Production Env Validation | FAIL locally: `46` pass, `1` warning, `24` errors requiring real Hostinger/Firebase/Razorpay/provider values and HTTPS app URL. |
| Production Readiness % | 86% pending manual infrastructure, provider, hardware, browser, and multi-device validation. |

## Pending Manual Tasks
- Hostinger env/cache/redeploy and hosted route smoke.
- Firestore rules/index deployment.
- Deploy Hostinger from the final pushed `release/production-nammude` commit; `v1.0.0-rc5` must be the immutable runtime release tag after keeping RC4 unchanged.
- Rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory after production-env redeploy.
- Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
- Printer profile and physical output validation.

## Pending Provider Tasks
- SMTP, Razorpay, WhatsApp, SMS, push/VAPID, Meta, Cloudinary, Mapbox, Google OAuth.

## Pending Infrastructure Tasks
- Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
