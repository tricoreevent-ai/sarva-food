# Production Acceptance Checklist

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-13

## Acceptance Decision

Current decision: `NO GO`.

Production readiness score: `86%`.

## Required Pass Gates

| Gate | Status | Required Evidence |
| --- | --- | --- |
| Release metadata | 🔴 Blocking | `/api/release-info` shows final SHA, branch, `v1.0.0-rc5`, HTTPS URL, `deploymentEnvironment: production`. |
| Production env validation | 🔴 Blocking | `npm run validate:prod-env` passes with real production values. |
| Health endpoints | ✅ Completed | `/health/live`, `/health/ready`, `/health/startup` return healthy/safe metadata after final redeploy. |
| Build pipeline | ✅ Completed | Typecheck, lint, build, analyze pass. |
| Bundle/performance | 🟡 Pending Manual | Lighthouse mobile/desktop and Chrome Performance/Coverage/Memory captured after final redeploy. |
| Security | 🟡 Pending Manual | HTTPS/HSTS/CSP/cookies/auth redirects/role guards verified in browser. |
| Browser compatibility | 🟡 Pending Manual | Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop pass. |
| API/customer/owner/admin flows | 🟡 Pending Manual | Authenticated smoke passes with no P0/P1 issue. |
| Firestore | 🟡 Pending Manual | Rules/indexes deployed and protected read/write smoke passes. |
| Providers | 🟡 Pending Manual | Firebase, Cloudinary, SMTP, OAuth, Razorpay, WhatsApp/SMS/push validated. |
| Hardware | 🟡 Pending Manual | Printer, QR, camera/upload checks pass on target devices. |
| Rollback | 🟡 Pending Manual | Previous known-good SHA/env rollback verified or documented in Hostinger. |

## Sign-off Rule

Mark production accepted only after every 🔴 item is resolved and every 🟡 item has a dated manual result. Repository-only evidence is sufficient for RC5 deployment testing, not for public production launch.
