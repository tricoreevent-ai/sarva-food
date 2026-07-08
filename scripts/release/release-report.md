# Nammude Release Report

| Field | Value |
| --- | --- |
| Build Date | 2026-07-08 |
| Git Branch | release/production-nammude |
| Base Commit SHA | 6272d7edfdc7299a728cb0e606b523a55b1248ee |
| Runtime Release Commit SHA | cd1c81435a1e535483b94d66ffa1b1bf63494c0b |
| Final Certification Commit SHA | Reported in the final handoff after this docs-only certification commit is created and pushed. |
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
| Health Endpoints | PASS: local production server returned `/health/live` 200 and safe degraded `/health/ready`/`/health/startup` 503 because local Firebase Admin production env is absent. |
| Local Release Info | PASS: local production server returned v1.0.0-rc3, production env, release branch, HTTPS public URL, and HTTP 200. |
| Git Diff | PASS |
| Production Env Validation | FAIL locally: requires real Hostinger/Firebase/provider values and HTTPS app URL. |
| Production Readiness % | 85% pending manual infrastructure, provider, hardware, browser, and multi-device validation. |

## Pending Manual Tasks
- Hostinger env/cache/redeploy and hosted route smoke.
- Firestore rules/index deployment.
- Deploy Hostinger from the final pushed `release/production-nammude` commit; `v1.0.0-rc3` remains the immutable runtime release tag.
- Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
- Printer profile and physical output validation.

## Pending Provider Tasks
- SMTP, Razorpay, WhatsApp, SMS, push/VAPID, Meta, Cloudinary, Mapbox, Google OAuth.

## Pending Infrastructure Tasks
- Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
