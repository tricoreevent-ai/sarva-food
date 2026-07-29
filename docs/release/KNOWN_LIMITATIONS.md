# Known Limitations

RC6.5 final tracker reconciliation closes repository tracker/release-artifact drift after RC6.4.1. No repository P0/P1 feature work remains pending. Production launch still requires deploying the final RC6.5 commit and verifying `/api/release-info`, health endpoints, authenticated multi-role workflows, provider dashboards, Firebase Console, Lighthouse/Chrome, long-run heap, and hardware/printer/QR gates.

RC6.4.1 operational classification is repository complete. Source/type filters, secondary operational filters, smart-priority counts, and per-module persisted filters are derived from existing state with no new APIs or listeners. Hosted browser/device verification remains external.

RC6.3.1 restaurant header-to-hero spacing is repository complete. Remaining validation is hosted visual smoke across customer, checkout, tracking, login, owner, POS, Kitchen, dashboard, and settings pages after deploy.

RC6.3 customer experience and order tracking hardening is repository complete. Hosted customer journey and browser/device verification remain external.

RC5 Owner/Waiter Active Orders unification closes the remaining repository-side duplicated active-order workflow by rendering Owner Active Orders through the same operational component and action contracts used by POS/Waiter. Order-only tickets now have transactional, retry-safe Send To Kitchen linkage. The final unification commit still requires Hostinger redeployment and authenticated hosted multi-role/device/provider/hardware verification before customer go-live.

RC5 final operational hardening closes the remaining repository-side live consistency risks found in POS add-on KOTs, Kitchen create retry idempotency, Kitchen full-snapshot streaming, Kitchen ready-signal polling, stale Owner Dashboard KPIs, and one-shot Owner Reports. The final hardening commit still requires Hostinger redeployment and authenticated hosted multi-role/device/provider/hardware verification before customer go-live.

RC5 enterprise waiter workflow closes the visible production POS/Kitchen service bug, unnecessary Waiter Ready push noise, single-ticket table assumption, kitchen-ticket merge side effects, and missing Completed holding behavior. Multiple active kitchen tickets per table, Ready Signal, bill-only merge, and 30-minute Completed holding are repository complete but still require Hostinger redeployment before the currently hosted runtime changes.

Phase 5C closes the Hostinger reverse-proxy origin mismatch and the service-dependent payment mismatch. Payment is now independent of Kitchen/service state, POS New Order cancel resumes drafts, and Kitchen cards are item-first. The fixes still require Hostinger redeployment before the currently hosted runtime changes.

Phase 5B closes the repository-side POS Active Orders hang, inconsistent accordion, hidden-action, low-density, incomplete lock-release, and stale print-context defects. Phase 5C supersedes the earlier service-dependent payment behavior. Remaining QA is authenticated hosted owner/manager/waiter/cashier/Kitchen workflow observation, real printer/device checks, provider dashboard checks, React Profiler/FPS/INP capture, Lighthouse/Core Web Vitals, and long-run browser heap stability.

Phase 5A closes the repository-side Kitchen Serve responsibility violation, unbounded time labels, and fixed-width Kanban. RC5 waiter-serving hardening supersedes the old notification model with targeted Waiter ready acknowledgement/recovery, deduped Owner/Manager escalation, and live Waiter screen cues. Real push delivery, browser permission, multi-device timing, sound policy, Firebase rules deployment, and printer hardware remain external QA.

Phase 4E closes the repository-side Active Orders broken-action, skipped-lifecycle, unbounded-delay, duplicate-timeline, progress-color, and excessive-density issues. Remaining Active Orders work is authenticated hosted multi-role/device/provider/printer observation only.

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Current No-Go Items

- Hosted runtime must report the final RC6.5 commit and `applicationVersion=v1.0.0-rc6.5` through `/api/release-info`.
- Local production env validation lacks production-only secrets and provider values.
- Firebase Console rules/indexes/authorized domains require manual verification.
- Razorpay live/sandbox order, checkout, verify, webhook, failure, refund, and reconciliation require dashboard smoke.
- WhatsApp/SMS/Meta provider launch remains provider-gated.
- Production Lighthouse/Core Web Vitals and Chrome profiling remain manual.
- Authenticated browser smoke remains manual.
- Active Orders multi-role hosted QA remains manual, including multiple tickets on one table, Ready Signal SSE/recovery, Waiter Serving, live Reports/Dashboard counters, add-on KOT idempotency, bill-only merge, payment before/during/after Kitchen preparation, and service + Paid completion.
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
