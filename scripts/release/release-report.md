# Nammude Release Report

| Field | Value |
| --- | --- |
| Build Date | 2026-07-08 |
| Git Branch | release/production-nammude |
| Base Commit SHA | 6272d7edfdc7299a728cb0e606b523a55b1248ee |
| Runtime Release Commit SHA | cd1c81435a1e535483b94d66ffa1b1bf63494c0b |
| Final Certification Commit SHA | `bf54ec3013a1b7e8630377567aee1663becf745a` before the performance recovery pass; final performance recovery SHA must be recorded after commit/push. |
| Release Tag | PASS: immutable `v1.0.0-rc3` resolves to runtime release commit `cd1c81435a1e535483b94d66ffa1b1bf63494c0b`; `v1.0.0-rc1` and `v1.0.0-rc2` were not moved. |
| Release Version | v1.0.0-rc3 |
| Node Version | v22.16.0 |
| Package Version | 1.0.0-rc.3 |
| Build Status | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Analyze | PASS |
| Operational Smoke | PASS |
| Repository Hardening Audit | PASS: generated `scripts/release/repository-hardening-audit.md`; server console logs centralized in touched paths, `0` debt markers, `0` matching unbounded Firestore collection reads. |
| Performance Recovery | PASS: `PERFORMANCE_REPORT.md` added; GA, customer runtime providers, public-header Firestore listener, logout/favorite action modules, Firebase compatibility exports, home menu preview fetch, and home loading skeleton were optimized without business/API/schema changes. |
| Performance Phase 2 | PASS: added `BUNDLE_DEEP_ANALYSIS.md`, `DEPENDENCY_AUDIT.md`, `ROUTE_LOAD_ANALYSIS.md`, and `PERFORMANCE_PHASE2_REPORT.md`; `/` route JS reduced `1017 KB -> 455 KB`, `/profile` `1714 KB -> 562 KB`, and Firestore/Auth ownership `94 -> 10` route manifests. |
| Local Initial Chunk Probe | PASS: `/`, `/profile`, and `/owner/pos` do not initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks; `/login` keeps auth chunks as expected. |
| Production Lighthouse | PENDING: PageSpeed API quota returned `429 RESOURCE_EXHAUSTED`; rerun after Hostinger serves the performance recovery commit with production env. |
| Health Endpoints | PASS: local production server returned `/health/live` 200 and safe degraded `/health/ready`/`/health/startup` 503 because local Firebase Admin production env is absent. |
| Local Release Info | PASS: local production server returned v1.0.0-rc3, production env, release branch, HTTPS public URL, and HTTP 200. |
| Git Diff | PASS |
| Production Env Validation | FAIL locally: requires real Hostinger/Firebase/provider values and HTTPS app URL. |
| Production Readiness % | 85% pending manual infrastructure, provider, hardware, browser, and multi-device validation. |

## Pending Manual Tasks
- Hostinger env/cache/redeploy and hosted route smoke.
- Firestore rules/index deployment.
- Deploy Hostinger from the final pushed `release/production-nammude` commit; `v1.0.0-rc3` remains the immutable runtime release tag.
- Rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory after production-env redeploy.
- Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
- Printer profile and physical output validation.

## Pending Provider Tasks
- SMTP, Razorpay, WhatsApp, SMS, push/VAPID, Meta, Cloudinary, Mapbox, Google OAuth.

## Pending Infrastructure Tasks
- Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
