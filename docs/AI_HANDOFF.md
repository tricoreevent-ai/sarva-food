# AI Handoff

Future AI agents must read this file before making changes.

## Current State

| Field | Value |
| --- | --- |
| Branch | `release/production-nammude` |
| Release | `v1.0.0-rc6.5` candidate |
| Current base commit | `98e16ab1cb5fcc2cb4fc9e4f55d95eca6f414a81` before RC6.5 reconciliation |
| Hosted runtime status | Verify exact deployed SHA with `/api/release-info` after RC6.5 deployment |
| Repository readiness | `100%` after local validation |
| Production readiness | `92%` until external production gates pass |
| Production launch | `NO GO` |
| Current local phase | RC6.5 final tracker/release reconciliation; repository feature implementation is complete |
| Documentation hub | `docs/README.md` |
| Master tracker | `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md` |

## Completed Phases

- Repository-side RC6 implementation and production hardening are considered feature complete.
- RC6.4.1 operational classification, RC6.3 customer/order-tracking hardening, RC6.3.1 restaurant hero gap removal, and RC6 brand/logo fixes are complete in the repository.
- POS draft autosave now uses local-first state, scoped localStorage/IndexedDB recovery, coalesced writes, categorized retry messaging, and waiter/cashier-aligned authorization.
- Tracker, release, deployment, validation, and performance reports are centralized under `docs/`.
- Generated Markdown reports now write to `docs/validation` or `docs/performance`.
- Machine-readable validation JSON remains under `reports/`.

## Pending Deployment Work

- Deploy the final RC6.5 commit and verify `/api/release-info` reports the same SHA and `v1.0.0-rc6.5`.
- Set the documented public `NEXT_PUBLIC_FIREBASE_VAPID_KEY` and stable `PAYMENT_SETTINGS_ENCRYPTION_KEY` in Hostinger; never expose private VAPID or Razorpay secrets through public variables.
- Use Owner Settings Notification Test Center and Payment Verification Center with real registered devices and owner Razorpay sandbox credentials.
- Keep `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc6.5`, and final HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure/verify Firebase VAPID key, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, each owner's Razorpay live keys/webhook in Owner Settings, WhatsApp/SMS/push, and provider dashboard secrets.
- Clear Hostinger cache and reverify `/api/release-info`, `/health/live`, `/health/ready`, and `/health/startup`.

## Pending Manual QA

- Authenticated customer, owner, kitchen, waiter, POS, QR/table, payment, and printer workflows.
- Hosted owner/waiter/cashier POS draft offline/reconnect, refresh, browser close/reopen, restaurant switch, and multi-device recovery.
- Firebase Console rules, indexes, authorized domains, auth providers, Cloud Messaging, and protected reads/writes.
- Provider dashboards and live flows for SMTP, Google OAuth, Cloudinary, Mapbox, Razorpay, WhatsApp, SMS, Meta, and push.
- Customer Order Confirmation and Customer Order Rejection notification workflows remain explicitly manual; all other requested notification templates pass repository contract verification but still need provider/device delivery evidence.
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
npm run analyze
npm run audit:release
npm run smoke:operational
npm run profile:runtime
npm run theme:contrast
npm run brand:visual
git diff --check
```

## Release Process

- Keep existing RC tags immutable.
- Commit only intentional repository changes.
- Create the RC6.5 tag only after repository validation, deployment verification, and documentation handoff are complete.
- Recommended tag form: `git tag -a v1.0.0-rc6.5 -m "Release v1.0.0-rc6.5"`.

## Deployment Process

- Use `docs/deployment/HOSTINGER_DEPLOYMENT_GUIDE.md`.
- Use `docs/deployment/production-environment-matrix.md` for environment values.
- Use `docs/deployment/POST_DEPLOYMENT_CHECKLIST.md` and `docs/deployment/PRODUCTION_ACCEPTANCE_CHECKLIST.md` after redeploy.
- Use `docs/release/ROLLBACK_GUIDE.md` if the hosted release fails acceptance.
