# AI Handoff

Future AI agents must read this file before making changes.

## Current State

| Field | Value |
| --- | --- |
| Branch | `release/production-nammude` |
| Release | `v1.0.0-rc5` candidate |
| Current image closure commit | `fc0986e9ba5dedb302dedcdd5eb9e20346844dba` |
| Repository readiness | `99%` |
| Production readiness | `86%` |
| Production launch | `NO GO` |
| Documentation hub | `docs/README.md` |
| Master tracker | `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md` |

## Completed Phases

- Repository-side RC5 implementation and production hardening are considered feature complete.
- Tracker, release, deployment, validation, and performance reports are centralized under `docs/`.
- Generated Markdown reports now write to `docs/validation` or `docs/performance`.
- Machine-readable validation JSON remains under `reports/`.

## Pending Deployment Work

- Set Hostinger production environment values, especially `NEXT_PUBLIC_APP_ENV=production` and `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc5`.
- Configure final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure Firebase Admin credentials, Firebase VAPID key, `TABLE_QR_SECRET`, and `DATABASE_ALERT_EMAIL`.
- Configure provider secrets in Hostinger/provider dashboards only.
- Redeploy `release/production-nammude`, clear Hostinger cache, and verify `/api/release-info`, `/health/live`, `/health/ready`, and `/health/startup`.

## Pending Manual QA

- Authenticated customer, owner, kitchen, waiter, POS, QR/table, payment, and printer workflows.
- Firebase Console rules, indexes, authorized domains, auth providers, Cloud Messaging, and protected reads/writes.
- Provider dashboards and live flows for SMTP, Google OAuth, Cloudinary, Mapbox, Razorpay, WhatsApp, SMS, Meta, and push.
- Browser/device smoke, Lighthouse mobile/desktop, Chrome Performance, Coverage, and 30-minute memory stability.

## Coding Rules

- Do not rewrite completed features.
- Do not modify business logic, APIs, repositories, architecture, Firestore schema, rules, or indexes unless fixing a confirmed bug.
- Do not create duplicate documentation.
- Always update `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md` and the relevant project tracker when repository changes are made.
- Keep plugin and diagnostic flags disabled in production unless explicitly approved.

## Validation Commands

```powershell
npm run typecheck
npm run lint
npm run build
cmd /c npm run analyze
cmd /c npm run audit:release
cmd /c npm run smoke:operational
cmd /c npm run verify:performance
git diff --check
```

## Release Process

- Keep existing RC tags immutable.
- Commit only intentional repository changes.
- Create the RC5 tag only after repository validation and documentation handoff are complete.
- Recommended tag form: `git tag -a v1.0.0-rc5 -m "Release v1.0.0-rc5"`.

## Deployment Process

- Use `docs/deployment/HOSTINGER_DEPLOYMENT_GUIDE.md`.
- Use `docs/deployment/production-environment-matrix.md` for environment values.
- Use `docs/deployment/POST_DEPLOYMENT_CHECKLIST.md` and `docs/deployment/PRODUCTION_ACCEPTANCE_CHECKLIST.md` after redeploy.
- Use `docs/release/ROLLBACK_GUIDE.md` if the hosted release fails acceptance.
