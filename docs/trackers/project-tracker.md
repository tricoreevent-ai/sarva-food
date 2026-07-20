# Project Tracker

## RC5 Enterprise Waiter Operational Workflow - 2026-07-20

- Active Orders Waiter view is now a live stage board for New, Accepted, Preparing, Ready, Serving, and Completed.
- Tables can now carry multiple independent active kitchen tickets; Add Items starts a new add-on ticket and Smart Bill Merge merges billing only.
- Smart Bill Merge now supports open partial-payment tickets while blocking locked, authorized, paid, refunded, closed, or already merged bills; Split Bill remains independent of service state.
- Paid orders no longer hide Kitchen status/progress; cards display Kitchen status, payment status, progress, priority, ETA, Ready for Pickup, Serving, Completed, and auto-history countdown together.
- Kitchen Operations Center cards now adapt to item count with no fixed blank item well while preserving touch-friendly actions and windowing.
- Owner Settings now persists configurable operational sounds for New Order, Kitchen Accepted, Preparing, Ready for Pickup, Urgent Delay, and Customer Request.
- Timeline rows now identify Kitchen, Payment, Print, and Audit events independently.
- `smoke:operational` now passes 24/24 and covers waiter live Kitchen/payment dashboard visibility, Ready Signal without Waiter push, multi-ticket dining, bill-only merge, completed holding/history, and configurable operational sounds.
- Repository readiness: 100%.
- Production readiness: 92%.
- Remaining QA: hosted authenticated multi-role Active Orders/POS/Kitchen, real push/device sound delivery, provider dashboards, browser/device matrix, printer hardware, Lighthouse/Core Web Vitals, Chrome/React profiling, Firebase Console, and long-run heap.

## Phase 5C Payment Workflow and Kitchen UI - 2026-07-20

- Payment lifecycle correction: repository complete; payment is independent of Kitchen/service state and completion still requires Served + Paid.
- POS New Order cancel resumes the current draft/cart/customer/discount/payment draft; Clear Order remains destructive.
- Kitchen cards are item-first with order number, priority, ETA, status, and icon actions; operational details moved into Preview/More.
- Superseded by RC5 Enterprise Waiter Workflow: `smoke:operational` now passes 24/24 and covers payment independence, New Order cancel resume, Owner workflow payment state, item-first Kitchen cards, Waiter Kitchen/payment visibility, timeline categories, multi-ticket dining, bill-only merge, Ready Signal, completed holding/history, and configurable sounds.
- Final validation completed: typecheck, lint, build, analyze, audit:release, runtime profile, operational smoke, and diff check passed.
- Repository readiness: 100%.
- Production readiness: 92%.
- Remaining QA: hosted authenticated payment before/during/after cooking, multi-role Active Orders/POS/Kitchen flows, provider dashboards, browser/device matrix, printer hardware, Lighthouse/Core Web Vitals, Chrome/React profiling, and long-run heap.

## Phase 5B POS Active Orders - 2026-07-16

- High-density operational board: repository complete.
- Desktop density: 20 collapsed cards at 1366×768; 4/5/6-column responsive grid.
- Expansion render scope: 30 → 1 card open; 30 → 2 cards when switching.
- Lifecycle/actions: unchanged and covered by 14/14 operational smoke checks.
- Hosted authenticated multi-role/device/printer and Chrome profiler QA: pending.

## Phase 5B Finalization - 2026-07-17

- Active Orders optimization, Kitchen workflow, waiter notification architecture, payment lifecycle enforcement, print context, and POS print preview are repository complete.
- `smoke:operational` now passes 17/17 and covers strict lifecycle, all active-order actions, status/duration/timeline consistency, keyboard/touch affordances, and Kitchen notify contracts.
- Final validation completed: typecheck, lint, build, analyze, audit:release, runtime profile, operational smoke, and diff check passed.
- Repository readiness: 100%.
- Production readiness: 92%.
- Remaining QA: hosted authenticated owner/manager/waiter/cashier/Kitchen flows, provider dashboards, browser/device matrix, printer hardware, Lighthouse/Core Web Vitals, Chrome/React profiling, and long-run heap.

## Phase 5A Kitchen Operations - 2026-07-16

- Repository implementation: complete.
- Kitchen Serve removal: complete.
- Waiter notify/push/in-app/acknowledgement/escalation: complete.
- Responsive Kitchen presentation: complete.
- Hosted real-device/provider/printer QA: pending.

## RC5 Phase 4D - 2026-07-16

- Repository operational hardening: complete.
- Automated operational contracts: 9/9 pass.
- Phase 4C contracts: 19/19 pass.
- Repository readiness: 100%.
- Production readiness: 92%.
- Release decision: NO-GO pending external production gates listed in `docs/deployment/PENDING_MANUAL_TASKS.md`.

Last updated: 2026-07-17

| Feature | Status | Progress % | Pending Work | Owner | Date |
| --- | --- | ---: | --- | --- | --- |
| Customer hero image source | Tested | 100 | None | Codex | 2026-06-22 |
| Architecture Investigation | Completed | 100 | None | Codex | 2026-06-23 |
| Architecture Foundation | Completed | 100 | None | Codex | 2026-06-24 |
| Repository Layer | Completed | 100 | None | Codex | 2026-06-23 |
| CRM | Completed | 100 | None | Codex | 2026-06-23 |
| Loyalty | Completed | 100 | None | Codex | 2026-06-23 |
| Critical data-parity investigation | Completed | 100 | Firestore, APIs, and production screens match current Cafe Al Arab data: 5 orders, INR 1976 billable revenue, 3 customers, 3 loyalty accounts | Codex | 2026-06-24 |
| Phase 2 Full Data Consistency Audit | Completed | 100 | Production validation passed at `35017398773ba04efbdc3ab37d250cfa547c0675` | Codex | 2026-06-26 |
| Operational Migration Sprint | Closed | 100 | Local and Hostinger production runtime validation passed at `c11a00d` | Codex | 2026-06-24 |
| Screen Migration Tracker | Completed | 100 | Hostinger browser/API validation passed | Codex | 2026-06-26 |
| Dashboard Repository Migration | Completed | 100 | Analytics runtime: 5 orders, INR 1976 billable revenue, 3 customers, 3 loyalty, 8 menu, 2 staff, 4 kitchen | Codex | 2026-06-24 |
| Owner Orders Repository Migration | Completed | 100 | Firestore, API, and screen count all equal 5 | Codex | 2026-06-24 |
| Kitchen Queue Repository Migration | Completed | 100 | Firestore, API, and screen count all equal 4 | Codex | 2026-06-24 |
| POS Data Repository Migration | Completed | 100 | Screen verified with 8 menu items, 3 customers, and 5 orders | Codex | 2026-06-24 |
| Tables Repository Migration | Completed | 100 | T99 create, refresh, edit, delete, and final refresh passed | Codex | 2026-06-24 |
| Employees Repository Migration | Completed | 100 | Firestore, API, and screen count all equal 2 | Codex | 2026-06-24 |
| Owner Menu Repository Migration | Completed | 100 | Firestore, API, and local screen count all equal 8; CRUD baseline restored | Codex | 2026-06-25 |
| Owner Offers Repository Migration | Completed | 100 | Firestore, API, and local screen count all equal 2; CRUD baseline restored | Codex | 2026-06-25 |
| Inventory Repository Migration | Completed | 100 | Repository/API/screen baseline 0; create, adjust, delete passed | Codex | 2026-06-25 |
| Accounting Repository Migration | Completed | 100 | Repository/API/screen baseline 0; create and delete passed | Codex | 2026-06-25 |
| Sprint 1 Repository Migration | Completed | 100 | Local and Hostinger production validation passed at `e75a3c5` | Codex | 2026-06-25 |
| Admin Data Repository Migration | Completed | 100 | Production Admin dashboard and analytics passed | Codex | 2026-06-26 |
| Customer Ordering Repository Audit | Completed | 100 | Production customer profile, orders, and history passed | Codex | 2026-06-26 |
| TASK-01 Offer Consolidation | Tested | 100 | None | Codex | 2026-06-22 |
| TASK-02 Centralized Menu Pricing Engine | Tested | 100 | Manual browser screenshot pass on owner device | Codex | 2026-06-22 |
| TASK-03 Table CRUD Management | Completed | 100 | T99 persistence lifecycle verified | Codex | 2026-06-24 |
| TASK-04 Order Desk Mobile Redesign | Deferred | 15 | Future feature work outside the final release baseline | Codex | 2026-06-22 |
| TASK-05 Printer Configuration | Completed | 100 | Production printer API and screen validation passed | Codex | 2026-06-26 |
| TASK-06 Staff & Access | Completed | 100 | Production permission matrix passed | Codex | 2026-06-26 |
| TASK-07 Role-Based Dashboards | Completed | 100 | Manual production role/device smoke remains a release gate | Codex | 2026-07-13 |
| TASK-08 Security Controls | Completed | 100 | Production view switching and scoped access passed; owner password switch remains manual verification | Codex | 2026-06-26 |
| TASK-09 Audit Logs | Completed | 100 | Production audit API and screen validation passed | Codex | 2026-06-26 |
| TASK-10 Project Tracking | Tested | 100 | None | Codex | 2026-06-22 |
| Kitchen Operations Center Redesign | Completed | 100 | Manual Kitchen TV/tablet/printer smoke remains a release gate | Codex | 2026-07-13 |
| Enterprise Staff & Access Sprint | Completed | 100 | Production validation passed on Hostinger | Codex | 2026-06-26 |
| RC5 Production Observability | Implemented | 95 | Hosted Admin/Owner monitoring smoke, export check, and long-run alert verification remain manual | Codex | 2026-07-13 |
| RC5 Image Optimization | Repository Complete | 95 | Hosted visual smoke, Cloudinary credential upload check, and real-device image quality review remain manual | Codex | 2026-07-15 |
| POS Active Orders High-Density Board | Repository Complete | 95 | Deploy; run authenticated owner/waiter/cashier/manager/device/printer visual and workflow QA plus Chrome profiling | Codex | 2026-07-16 |
| RC5 Enterprise Waiter Operational Workflow | Repository Complete | 100 | Deploy final commit; run hosted waiter Kitchen/payment visibility, real device active-view sound, multi-role Active Orders/POS/Kitchen, printer, Lighthouse, Chrome profiling, Firebase Console, and long-run heap QA | Codex | 2026-07-20 |
| Phase 5C Payment Workflow and Kitchen UI | Repository Complete | 100 | Deploy final commit; run hosted payment before/during/after cooking, multi-role Active Orders/POS/Kitchen, provider, browser/device, printer, Lighthouse, Chrome profiling, and long-run heap QA | Codex | 2026-07-20 |
| Phase 5B Operational Hardening Finalization | Repository Complete | 100 | Deploy final commit; run hosted authenticated multi-role, provider, browser/device, printer, Lighthouse, Chrome profiling, and long-run heap QA | Codex | 2026-07-17 |
| RC5 Phase 4C Push & Owner Payments | Repository Implemented | 95 | Deploy Phase 4C; verify hosted VAPID, real-device push, owner Razorpay sandbox/live webhook/payment, browsers, and providers | Codex | 2026-07-16 |
| POS Draft Autosave P0 | Repository Fixed | 95 | Deploy and run hosted owner/waiter/cashier, offline/reconnect, refresh, close/reopen, restaurant switch, and multi-device smoke | Codex | 2026-07-16 |

## Final Enterprise Release

| Field | Value |
| --- | --- |
| Production URL | `https://violet-squid-380447.hostingersite.com` |
| Commit SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Release SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Hostinger SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Deployment timestamp | `2026-06-26T04:48:26.958Z` |
| Validation status | PASS |
| Remaining work | Owner password-protected view switch manual verification |

## RC4 / RC5 Production Readiness Audit

| Field | Value |
| --- | --- |
| Branch | `release/production-nammude` |
| RC4 tag | `66f7c6e5b8aba5991f4fe74b7e3b44c6079e5b38` |
| Active Orders code baseline | `ba8e957d57b949a94d0c42a3b170cf198917c0d8` |
| Hosted runtime status | RC5 production runtime includes Active Orders baseline; exact SHA comes from `/api/release-info` |
| Repository readiness | `100%` |
| Production readiness | `92%` |
| Current decision | Repository `GO`; production launch `NO GO` |
| Recommendation | Keep RC4 unchanged; tag the final RC5 validation commit after local gates pass |
| Pending work matrix | Repository-side audit found no remaining code blocker; current pending work is external/manual only. |
| Final optimization cleanup | Shared duplicated client error-reason helper, added explicit accessible names for compact order action controls, and moved pure phone normalization into `src/lib/phone.ts` to avoid unnecessary Firebase-heavy service ownership in client bundles; no business logic/API/schema changes. |
| Production monitoring | Internal monitoring store, grouped error/log viewer, Admin Production Monitoring dashboard, Owner diagnostics expansion, alert rules, provider/performance/self-test views, and client/server signal capture added without Firestore schema or business workflow changes. |
| Image optimization | Shared Cloudinary presets, AVIF/WebP browser upload optimization, incoming Cloudinary transforms, and right-sized `SafeImage` thumbnails added without business logic/API/schema/repository changes. |
| Active Orders workspace | Operational summary cards, workflow ribbon, status rails, kitchen progress, KOT count display, advanced search, live filters, compact details, and context-aware actions added without API/schema/repository/workflow changes. |
| Release package verification | Hosted metadata now reports `v1.0.0-rc5` and `deploymentEnvironment=production`; historical RC4 references remain only as immutable tag/history notes. |
| Remaining work | Firebase VAPID/Console, Razorpay/WhatsApp/SMS/push provider checks, authenticated browser/device, Lighthouse, Chrome profiling, Active Orders multi-role QA, and hardware validation |

## Sprint 1 Repository Migration

| Field | Value |
| --- | --- |
| Commit SHA | `e75a3c5cf0873a0d212263010e75b0c4b3470aeb` |
| Release SHA | `e75a3c5cf0873a0d212263010e75b0c4b3470aeb` |
| Hostinger build SHA | `e75a3c5cf0873a0d212263010e75b0c4b3470aeb` |
| Menu | Firestore 8 / API 8 / Production screen 8 |
| Offers | Firestore 2 / API 2 / Production screen 2 |
| Inventory | Firestore 0 / API 0 / Production screen 0 |
| Accounting | Firestore 0 / API 0 / Production screen 0 |
| Result | PASS |

## Operational Migration Stable

| Field | Value |
| --- | --- |
| Commit SHA | `c11a00d89c008db64afbd3a29fb5850c0986ee93` |
| Release tag | `operational-migration-stable` |
| Hostinger build SHA | `c11a00d89c008db64afbd3a29fb5850c0986ee93` |
| Deployment time | `2026-06-24T16:48:10.249Z` |
| Production result | PASS |
