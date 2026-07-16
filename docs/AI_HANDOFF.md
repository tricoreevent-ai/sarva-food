# AI Handoff

Future AI agents must read this file before making changes.

## Current State

| Field | Value |
| --- | --- |
| Branch | `release/production-nammude` |
| Release | `v1.0.0-rc5` candidate |
| Active Orders code baseline | `ba8e957d57b949a94d0c42a3b170cf198917c0d8` |
| Current hosted runtime commit | `3444d8cca5315513368851f44084131b7dbb2c56` |
| Repository readiness | `99%` |
| Production readiness | `90%` |
| Production launch | `NO GO` |
| Documentation hub | `docs/README.md` |
| Master tracker | `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md` |

## Completed Phases

- Repository-side RC5 implementation and production hardening are considered feature complete.
- Tracker, release, deployment, validation, and performance reports are centralized under `docs/`.
- Generated Markdown reports now write to `docs/validation` or `docs/performance`.
- Machine-readable validation JSON remains under `reports/`.

## Pending Deployment Work

- Hosted runtime now includes Active Orders code baseline `ba8e957d57b949a94d0c42a3b170cf198917c0d8`; latest docs-only branch head may trail hosted runtime without blocking application behavior.
- Keep `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc5`, and final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure/verify Firebase VAPID key, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, Razorpay live keys/webhook, WhatsApp/SMS/push, and provider dashboard secrets.
- Clear Hostinger cache and reverify `/api/release-info`, `/health/live`, `/health/ready`, and `/health/startup`.

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
