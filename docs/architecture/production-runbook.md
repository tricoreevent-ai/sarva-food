# Production Operational Runbook

Release candidate: `v1.0.0-rc5`; existing `v1.0.0-rc4` tag remains immutable
Branch: `release/production-nammude`
Commit: `dcff59e050de1dace19460198cb2909372bce7d5` plus final validation/performance evidence if this sprint changes files
Tag: keep `v1.0.0-rc4` unchanged; create `v1.0.0-rc5`

## Current Phase 4 Snapshot

| Area | Status |
| --- | --- |
| Repository validation | 2026-07-13 typecheck, lint, build, analyze, audit, and operational smoke passed. |
| Hosted deployment verification | `14` pass, `1` warning, `2` errors; hosted version still reports `v1.0.0-rc4` and hosted env reports `development`. |
| Public smoke | `7` pass, `18` manual. |
| Provider probe | `8` pass, `3` manual. |
| Memory probe | `1` pass, `2` manual. |
| Production readiness | `86%`; production launch remains `NO GO`. |

Immediate operator action: commit final validation/performance evidence if present, tag the final RC5 validation commit as RC5, set Hostinger `NEXT_PUBLIC_APP_ENV=production`, redeploy/restart the RC5 commit, clear cache, and rerun deployment/performance/provider/smoke reports with `PRODUCTION_URL=https://violet-squid-380447.hostingersite.com`.

## Operational Logging

- Server routes use `productionLogger` or `logOperationalFailure`.
- Public responses may include `requestId`; internal `traceId`, `correlationId`, and `transactionId` stay in logs only.
- Logs mask passwords, JWTs, Firebase tokens, API keys, secrets, cookies, authorization headers, OTPs, card fields, and payment ids.
- Production filtering uses `NAMMUDE_LOG_LEVEL` or `LOG_LEVEL`.

## Release Audit

Run:

```bat
cmd /c npm run audit:release
```

Report:

```text
docs/validation/repository-hardening-audit.md
```

Current repository-side interpretation:

| Check | Status |
| --- | --- |
| Server console logs | Centralized in touched API/repository/server helper paths. |
| Firestore unbounded reads | Static audit reports `0` matching unbounded collection reads. |
| Debt markers | Static audit reports `0` actionable markers in scanned release paths. |
| Listener lifecycle | Static audit reports listener sites for manual review; existing route cleanup patterns are preserved. |
| API envelopes | Static audit reports remaining envelope sites; response contracts were kept backward compatible. |

## Health Endpoints

| Endpoint | Purpose | Notes |
| --- | --- | --- |
| `/health/live` | Process liveness. | Does not run external probes; returns safe runtime and configuration status. |
| `/health/ready` | Deployment readiness. | Runs bounded Firestore readiness and storage configuration probes; returns `503` when critical checks are degraded. |
| `/health/startup` | Startup dependency check. | Same safe readiness shape for platform startup verification. |

Health responses are no-store and expose status booleans plus `requestId` only. They never expose provider secrets, Firebase private keys, OTPs, cookies, authorization headers, raw payment ids, or stack traces.

## Disaster Recovery

| Event | First Action | Recovery |
| --- | --- | --- |
| Bad deploy | Redeploy last known-good SHA in Hostinger. | Clear cache, verify `/api/release-info`, then smoke `/`, `/owner/login`, `/owner/pos`, `/owner/kitchen`, `/admin/login`. |
| Bad env | Restore previous Hostinger env snapshot. | Restart Node app and rerun `cmd /c npm run validate:prod-env` in production-equivalent env. |
| Firestore rules issue | Revert/deploy previous rules/indexes. | Check Admin diagnostics and owner/customer protected routes. |
| Payment issue | Disable online payment in owner settings. | Reconcile Razorpay dashboard against `paymentIntents` and order payment timelines. |
| QR signing issue | Restore prior `TABLE_QR_SECRET`. | Verify printed QR links and table sessions. |
| SMTP outage | Keep ordering live; mark email channel degraded. | Fix SMTP/app password and send OTP/order/outage smoke. |

## Security Checklist

- Hostinger env has no placeholder secrets.
- `NEXT_PUBLIC_APP_ENV=production`.
- `NEXT_PUBLIC_APP_URL` is HTTPS.
- `TABLE_QR_SECRET` is stable and at least 32 characters.
- Firebase Admin private key is unquoted with escaped `\n`.
- Firebase/Google authorized domains include Hostinger and final custom domain.
- Firestore rules and indexes are deployed to the production project.
- Razorpay webhook secret is set before online payments.
- WhatsApp/SMS/push/Meta credentials are configured only when provider smoke is planned.

## Performance Checklist

- Run `cmd /c npm run build`.
- Run `cmd /c npm run audit:release`.
- Run `cmd /c npm run smoke:operational`.
- Run `npm run analyze` only when bundle changes need inspection.
- After Hostinger redeploy, rerun Lighthouse/Core Web Vitals against the current SHA.

## Provider Checklist

| Provider | Required Smoke |
| --- | --- |
| SMTP | OTP, owner credential, order notification, outage alert. |
| Firebase | Admin diagnostics, client auth, Firestore rules/indexes, VAPID push device smoke. |
| Razorpay | Order create, verify, invalid signature, webhook, refund, reconciliation. |
| Cloudinary | Signature route, upload widget, image display. |
| WhatsApp | Webhook verify, send, event persistence. |
| Google OAuth | Hosted sign-in on authorized domain. |
| Mapbox | Customer/owner map surfaces with production token. |

## Infrastructure Checklist

- Hostinger branch is `release/production-nammude`.
- Hosted `/api/release-info` matches the final `v1.0.0-rc5` commit.
- Hosted metadata reports `deploymentEnvironment: production`.
- Hosted metadata reports `applicationVersion: v1.0.0-rc5`.
- Cache is cleared after redeploy.
- `/robots.txt`, `/sitemap.xml`, and `/manifest.json` are checked after cache clear.
