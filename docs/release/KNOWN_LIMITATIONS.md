# Known Limitations

Phase 5A closes the repository-side Kitchen Serve responsibility violation, unbounded time labels, fixed-width Kanban, and missing waiter notification/acknowledgement/escalation workflow. Real push delivery, browser permission, multi-device timing, sound policy, and printer hardware remain external QA.

Phase 4E closes the repository-side Active Orders broken-action, skipped-lifecycle, unbounded-delay, duplicate-timeline, progress-color, and excessive-density issues. Remaining Active Orders work is authenticated hosted multi-role/device/provider/printer observation only.

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Current No-Go Items

- Hosted env reports `deploymentEnvironment: development`.
- Local production env validation lacks production-only secrets and provider values.
- Firebase Console rules/indexes/authorized domains require manual verification.
- Razorpay live/sandbox order, checkout, verify, webhook, failure, refund, and reconciliation require dashboard smoke.
- WhatsApp/SMS/Meta provider launch remains provider-gated.
- Production Lighthouse/Core Web Vitals and Chrome profiling remain manual.
- Authenticated browser smoke remains manual.
- Printer/device validation remains manual.

## Accepted Repository Warning

Build/analyze retain the Firebase/protobuf dynamic dependency warning from upstream Firebase server dependency code. This is accepted for RC certification and is not safely replaceable during release freeze.

## Plugin Platform

Restaurant Health Dashboard and diagnostics plugins remain disabled by default. Controlled flag-enabled hosted browser validation is still required before enabling any plugin in production.

## Performance

Route-owned JavaScript remains above aspirational budgets on selected heavy operational routes. This is tracked as future optimization work and is not a functional release blocker.

## POS Draft Recovery

The generic repeated POS draft failure and local data-loss path are resolved repository-side. Hosted owner/waiter/cashier permission, real Firestore interruption, browser close/reopen, restaurant switch, and multi-device recovery still require manual verification after deployment.

## Provider Integrations

SMTP, Cloudinary, Google OAuth, Mapbox, Razorpay, WhatsApp, SMS, Meta, and Push readiness depends on production dashboard access and real credentials.
