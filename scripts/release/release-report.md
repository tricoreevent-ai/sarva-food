# Nammude Release Report

| Field | Value |
| --- | --- |
| Build Date | 2026-07-07 |
| Git Branch | release/production-nammude |
| Base Commit SHA | 2d9b7c38a4c4a9c12032f3ecc87d7e0c23c582a2 |
| Release Version | v1.0.0-rc2 |
| Node Version | v22.16.0 |
| Package Version | 1.0.0-rc.2 |
| Build Status | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Operational Smoke | PASS |
| Local Release Info | PASS: v1.0.0-rc2, production env, release branch, HTTPS public URL |
| Git Diff | PASS |
| Production Env Validation | FAIL locally: requires real Hostinger/Firebase/provider values and HTTPS app URL. |
| Production Readiness % | 84% pending manual infrastructure, provider, hardware, browser, and multi-device validation. |

## Pending Manual Tasks
- Hostinger env/cache/redeploy and hosted route smoke.
- Firestore rules/index deployment.
- Final `v1.0.0-rc2` tag after committing this release hardening pass.
- Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
- Printer profile and physical output validation.

## Pending Provider Tasks
- SMTP, Razorpay, WhatsApp, SMS, push/VAPID, Meta, Cloudinary, Mapbox, Google OAuth.

## Pending Infrastructure Tasks
- Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
