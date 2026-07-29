# Food Gedi Release Report

| Field | Value |
| --- | --- |
| Build Date | 2026-07-29 |
| Git Branch | release/production-nammude |
| Base Commit Before RC6.5 | 98e16ab1cb5fcc2cb4fc9e4f55d95eca6f414a81 |
| Runtime Release Commit SHA | verify final RC6.5 deployed SHA with `/api/release-info` |
| Final Certification Commit SHA | produced by the RC6.5 reconciliation commit |
| Release Tag | Create `v1.0.0-rc6.5` only after validation and hosted release-info verification; do not move existing RC tags. |
| Release Version | v1.0.0-rc6.5 |
| Node Version | v22.x production target |
| Package Version | 1.0.0-rc.6.5 |
| Build Status | RC6.5 validation rerun required before commit |
| Typecheck | RC6.5 validation rerun required |
| Lint | RC6.5 validation rerun required |
| Build | RC6.5 validation rerun required |
| Analyze | RC6.5 validation rerun required |
| Operational Smoke | RC6.5 validation rerun required |
| Repository Hardening Audit | PASS: generated `docs/validation/repository-hardening-audit.md`; server console logs centralized in touched paths, `0` debt markers, `0` matching unbounded Firestore collection reads. |
| Performance Recovery | PASS: `docs/performance/PERFORMANCE_REPORT.md` added; GA, customer runtime providers, public-header Firestore listener, logout/favorite action modules, Firebase compatibility exports, home menu preview fetch, and home loading skeleton were optimized without business/API/schema changes. |
| Performance Phase 2 | PASS: added `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`; `/` route JS reduced `1017 KB -> 455 KB`, `/profile` `1714 KB -> 562 KB`, and Firestore/Auth ownership `94 -> 10` route manifests. |
| Local Initial Chunk Probe | PASS: `/`, `/profile`, and `/owner/pos` do not initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks; `/login` keeps auth chunks as expected. |
| Production Lighthouse | MANUAL: rerun after Hostinger serves the final RC6.5 commit with production env. |
| Health Endpoints | MANUAL: verify hosted `/health/live`, `/health/ready`, and `/health/startup` after RC6.5 deployment. |
| Local Release Info | Release metadata source is `v1.0.0-rc6.5`; hosted runtime probe remains manual after final deployment. |
| Git Diff | PASS |
| Production Env Validation | External: requires real Hostinger/Firebase/Razorpay/provider values and HTTPS app URL. |
| Production Readiness % | 92% pending hosted deployment, provider, hardware, browser, and multi-device validation. |

## Pending Manual Tasks
- Hostinger env/cache/redeploy and hosted route smoke.
- Firestore rules/index deployment.
- Deploy Hostinger from the final pushed `release/production-nammude` commit; `v1.0.0-rc6.5` must be the immutable runtime release tag after keeping previous RC tags unchanged.
- Rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory after production-env redeploy.
- Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
- Printer profile and physical output validation.

## Pending Provider Tasks
- SMTP, Razorpay, WhatsApp, SMS, push/VAPID, Meta, Cloudinary, Mapbox, Google OAuth.

## Pending Infrastructure Tasks
- Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
