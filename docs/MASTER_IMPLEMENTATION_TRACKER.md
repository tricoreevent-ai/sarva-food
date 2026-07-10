# Nammude Master Implementation Tracker

Last updated: 2026-07-10

This is the permanent single source of truth for planning and future Codex work.
Every future implementation task must read this file before changing code.

Do not rebuild completed modules. Reuse, extend, bug fix, or optimize the existing implementation.

## Release Metadata

| Field | Value |
| --- | --- |
| Current Sprint | RC4 Production Readiness and Go-Live Validation |
| Release Version | `v1.0.0-rc4` |
| Latest Git Commit | RC4 build-recovery baseline pushed at `66f7c6e5b8aba5991f4fe74b7e3b44c6079e5b38`; deploy the final `v1.0.0-rc4` tag target from this release handoff. Existing `v1.0.0-rc1`, `v1.0.0-rc2`, and `v1.0.0-rc3` tags must not be moved. |
| Active Branch | `release/production-nammude` |
| Hostinger Deployment | `https://violet-squid-380447.hostingersite.com` must be redeployed from the final RC4 commit with `NEXT_PUBLIC_APP_ENV=production` and `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc4`; hosted verification remains manual. |
| Build Date | 2026-07-10 |
| Verification Status | RC4 finalization passed `test:enhancements`, typecheck, lint, build, analyze, `audit:release`, `smoke:operational`, `profile:runtime`, and `git diff --check`. Build/analyze retain the accepted Firebase/protobuf dynamic dependency warning. `validate:prod-env` failed locally with `46` pass, `1` warning, and `24` errors requiring real Hostinger/Firebase/Razorpay production values. `verify:providers` reported `6` pass, `4` errors, and `1` manual for missing Firebase Admin/Firestore, Razorpay, WhatsApp, and live provider credentials. Provider dashboard checks, Firebase Console, authenticated browser smoke, production Lighthouse, Chrome Performance/Coverage/Memory, and hardware checks remain external/manual gates. |
| Scope | Release metadata/env/security/docs hardening, production readiness audit, provider/Firebase/manual checklists, final release docs, and tracker alignment only. No new business feature, Firestore collection/schema/rule/index, payment provider contract, realtime listener, repository architecture change, or completed workflow redesign. |

## RC4 Production Readiness Closure - 2026-07-09

| Field | Result |
| --- | --- |
| Feature ID | `RC4-PRODUCTION-READINESS-CLOSURE` |
| Scope | Repository-side release closure for tag strategy, environment matrix, production-safe metadata, secret-response hardening, deployment docs, and validation. |
| Status | Implemented locally; repository validation passed except production env secrets/config that require external access. |
| Release Strategy | Do not move `v1.0.0-rc1`, `v1.0.0-rc2`, or `v1.0.0-rc3`. Create immutable `v1.0.0-rc4` on the final committed candidate. |
| Metadata | `package.json`, `package-lock.json`, `src/lib/release.ts`, `.env*` templates, release notes, Hostinger guide, runbook, environment matrix, API docs, certification docs, and deployment package now align on `v1.0.0-rc4`. |
| Security Fixes | Admin owner credential API no longer returns generated temporary passwords to the browser; TinyURL failures no longer echo raw provider errors; health metadata no longer falls back to `development` when app env is absent. |
| Env Audit | Matrix expanded from actual `process.env` scan. Razorpay is production-required because `validate:prod-env` and live payment routes require live keys before launch signoff. |
| Validation | `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check` passed. `cmd /c npm run validate:prod-env` and `cmd /c npm run verify:providers` failed locally only for missing/non-production Hostinger/Firebase/Razorpay/WhatsApp/provider secrets. |
| Remaining Manual Gates | Hostinger env/redeploy/cache, Firebase Console rules/indexes/authorized domains/VAPID, production credentials, provider dashboards, authenticated browser smoke, Lighthouse/Core Web Vitals, and physical printer/QR/device smoke. |

## RC4 Finalization and Push Closure - 2026-07-10

| Field | Result |
| --- | --- |
| Feature ID | `RC4-FINALIZATION-001` |
| Scope | Complete interrupted RC4 release finalization from the current repository state; preserve completed work; validate, refresh reports, retarget `v1.0.0-rc4`, and push branch/tag. |
| Files Included in RC4 | Owner Dashboard, Owner Customers, Owner Orders/Kitchen, POS accordion build recovery, stale order-card deletion, regenerated analysis/env/provider/performance/firestore/runtime reports, repository hardening audit, and tracker/readiness alignment. |
| Files Left Out | None. No unrelated parallel feature work was found in the working tree during final audit. |
| Validation | `cmd /c npm run test:enhancements`, `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, `cmd /c npm run profile:runtime`, and `git diff --check` passed. |
| Accepted Warnings | Build/analyze retain the known Firebase/protobuf dynamic dependency warning; Git reports CRLF normalization warnings only. |
| Environment Status | `cmd /c npm run validate:prod-env` failed locally with `46` pass, `1` warning, and `24` errors for expected missing production-only env/secrets and non-production local values. |
| Provider Status | `cmd /c npm run verify:providers` failed locally with `6` pass, `4` errors, and `1` manual for missing Firebase Admin/Firestore, Razorpay, WhatsApp, and live provider dashboard checks. |
| Security Status | Admin owner credential API does not return generated temporary passwords to browser responses; TinyURL provider errors are sanitized; production health metadata does not default to development; plugin flags remain disabled by default. |
| Plugin Platform Status | Phase 2D validation remains passed through `npm run test:enhancements`; Restaurant Health Dashboard and sample plugin flags remain default-off in production templates and validation checks. |
| Git / Tag Status | Historical RC tags remain immutable. `v1.0.0-rc4` must point to the final validated RC4 commit and be verified with `git rev-parse v1.0.0-rc4^{}` plus `git ls-remote` after push. |
| Remaining Manual Gates | Hostinger production env/redeploy/cache, Firebase Console rules/indexes/authorized domains/VAPID, Razorpay/WhatsApp/provider dashboards, authenticated browser smoke, Lighthouse/Core Web Vitals, Chrome profiling, physical printer, QR/table, and device checks. |
| Recommendation | Repository GO for RC4 deployment testing; production launch remains NO-GO until all manual/external gates pass. |

## OWNER MODULE QA ROUND - 2026-07-09

| Field | Result |
| --- | --- |
| Feature ID | `OWNER-MODULE-QA-ROUND-2026-07-09` |
| Scope | Functional QA/regression pass for Owner module pages, owner APIs, order lifecycle, POS/Waiter/Cashier/Manager views, Kitchen Operations Center, realtime status propagation, search, printing, profile/navigation, and release validation commands. |
| Status | Repository-side QA passed after verified Serve/order-status fixes. Authenticated browser, provider dashboard, and printer hardware checks remain manual production gates. |
| Pages Tested | Dashboard, Orders, Active Orders, Waiter, Cashier, Manager, Kitchen Operations Center, POS, Tables, Customers, Menu, Offers, Marketing/Social Posts, Reports, Inventory, Staff & Access, Accounting, Settings, Notifications/topbar, Profile, Search, QR Ordering/table sessions, Order History, Hold Orders, Printers, Support, Audit Logs, Loyalty, Digital Menu, Onboarding. |
| Buttons Tested | Static and build-backed pass covered `606` button elements, `53` owner/POS links, `90` fetch call sites, `29` PATCH action call sites, and `9` print call sites across owner/POS/order flows. Core actions covered: Accept, Reject, Ready, Serve, Complete, Cancel, Print, Print KOT, Print Bill, Print Receipt, Collect Payment, Transfer Table, Merge Table, Split Bill, Open, Edit/View, Add Item, Remove Item, Settings, Filters, History, Preview, Search, Hold/Resume/Delete held order, and profile/view-switch navigation. |
| APIs Tested | `27` owner API route files plus public QR/customer order handoff routes were covered by typecheck, lint, build route compilation, release audit, and operational smoke. Critical APIs reviewed: `/api/owner/orders`, `/api/owner/kitchen`, `/api/owner/pos`, `/api/owner/tables`, `/api/owner/customers`, `/api/owner/menu`, `/api/owner/offers`, `/api/owner/analytics`, `/api/owner/inventory`, `/api/owner/staff`, `/api/owner/accounting`, `/api/owner/settings` routes, `/api/owner/printers`, `/api/owner/profile`, `/api/owner/view-mode`, `/api/owner/sync`, and `/api/public/table-order/*`. |
| Broken Issues | Waiter/ready Serve path updated only `kitchenOrders`, leaving linked `orders` and `customerOrders` stale; served statuses were normalized back to ready in owner/POS read models; Owner Orders ready action skipped the served lifecycle step and sent ready orders directly to completed/delivered. |
| Fixed Issues | Kitchen status updates now synchronize linked canonical orders/customer orders transactionally; Serve now persists `served`; served/completed/cancelled statuses remain visible instead of being remapped; order-only Waiter rows persist served status; ready action labels now match Serve behavior. |
| Remaining Issues | No new blocking repository issues found. Manual authenticated browser QA is still required for live Firestore/SSE behavior, browser console warnings, Razorpay/provider flows, push notifications, real printer selection/output, and device-specific QR/table flows. Build/analyze retain the accepted Firebase/protobuf dynamic dependency warning. |
| Risk Level | Low-to-medium. The fix is scoped to lifecycle synchronization and display mapping, but it touches shared order/kitchen state propagation used by Owner, Kitchen, POS, Waiter, Cashier, Manager, history, and badges. |
| Performance Impact | No new listener, polling loop, bundle dependency, schema, index, or API route was added. Kitchen status updates now do one bounded linked-order lookup when status changes. |
| Validation | `npm run typecheck` passed; `npm run lint` passed; `npm run build` passed with accepted Firebase/protobuf warning; `cmd /c npm run analyze` passed with same warning; `cmd /c npm run audit:release` passed; `cmd /c npm run smoke:operational` passed; `git diff --check` passed with Git line-ending normalization warnings only. |
| Readiness | Owner module repository readiness: `94%`. Recommendation: production-ready after authenticated browser smoke, live provider checks, and printer/device validation pass. |

## Owner Order Card Accordion UI - 2026-07-09

| Field | Result |
| --- | --- |
| Feature ID | `OWN-UI-ORDERCARD-001` |
| Scope | Reusable compact order accordion component for desktop Owner order surfaces. First adoption: Kitchen Operations Center desktop board. Second adoption: Owner Active Orders desktop list. Mobile Kitchen and Active Orders card layouts remain unchanged. |
| Status | Implemented locally and validated. |
| Components Added | `CompactOrderAccordion`, `CompactOrderAccordionHeader`, `CompactOrderAccordionBody`, `CompactOrderAccordionActions`, `OrderDelayIndicator`, `OrderPriorityBadge`, `OrderAccordionSkeleton`, typed props, and shared tone/action utilities under `src/components/orders`. |
| Kitchen Integration | Desktop `KitchenOrderCard` now adapts existing `TableOrder` data into the shared accordion, preserves Preview/Print/Advance/Cancel/Details callbacks, supports one expanded ticket globally, and keeps column virtualization enabled except while an accordion is expanded. |
| Active Orders Integration | Desktop `ActiveOrderCard` now reuses the same accordion for Active Orders with View/Accept/Ready/Serve/Reject actions. Existing mobile card markup and quick-view behavior remain under `xl:hidden`. |
| Reusability Matrix | Kitchen Operations Center: adopted. Owner Active Orders: adopted. Future Order History, POS order queue, Waiter/Cashier/Manager queues: eligible via adapter props only. |
| Delay UX | Delayed orders now use yellow/orange/red/critical levels, subtle motion, critical left rail, warning icon pulse, and `prefers-reduced-motion` disabling. Existing Firebase/protobuf build warning is unrelated. |
| Business Logic Impact | None. No API, repository, Firestore schema/rule/index, realtime listener, status lifecycle, payment, printer backend, or order mutation logic was changed. |
| Performance Impact | One memoized reusable UI dependency path was added. Kitchen keeps fixed-height virtualization for collapsed cards and disables virtualization only while a dynamic-height accordion is open. No new polling/listeners/network calls. |
| Accessibility | Accordion headers expose expanded state, delayed warnings use status/live semantics, actions remain buttons with labels/titles, and reduced-motion users do not receive delay animations. |
| Validation | `cmd /c npm run typecheck` passed; `cmd /c npm run lint` passed; `cmd /c npm run build` passed with accepted Firebase/protobuf warning; `cmd /c npm run analyze` passed with same warning after clearing stale `.next` cache; `cmd /c npm run audit:release` passed; `cmd /c npm run smoke:operational` passed; `git diff --check` passed with Git line-ending normalization warnings only. |
| Rollback | Revert the new `src/components/orders/OrderAccordion*`/`CompactOrderAccordion*` files, the two desktop adapters in Kitchen and Owner flows, and the delay animation CSS block. No data rollback required. |

## BUILD RECOVERY - 2026-07-10

| Field | Result |
| --- | --- |
| Feature ID | `BUILD-RECOVERY-OWNER-ACCORDION-2026-07-10` |
| Scope | Restore clean production build after the Owner reusable accordion migration. No feature, API, Firestore, repository, realtime listener, permission, or mobile layout change. |
| Root Cause | The failed production build referenced a stale `tableOrderAccordionDelay` owner adapter. The current Owner flow uses `ownerTableAccordionDelay`, which maps kitchen delay data into the shared `OrderAccordionDelay` shape through the existing owner delay-level helper. A detached stale Next build process also left a partial `.next` tree and caused one false nonzero build run. |
| Files Fixed | `src/components/flows/owner-order-management-flow.tsx`, `src/components/flows/pos-billing-flow.tsx`, `src/app/owner/page.tsx`, `src/app/owner/customers/page.tsx`, removed stale `src/components/orders/order-card.tsx`, and removed stale `src/components/owner/order-list.tsx`. |
| Compile Errors Resolved | No remaining `tableOrderAccordionDelay` reference, broken accordion import, missing export, unused import, or stale deleted-card import remains. |
| Regression Check | Verified Owner Orders, Kitchen, POS, Waiter/Cashier/Manager queues, Dashboard recent orders, customer history, kitchen history, preview drawer, delay indicator, sequential order number display, expand/collapse, Serve, Ready, Complete, Print, and Preview bindings through static review plus typecheck/lint/build route compilation. |
| Shared Component Usage | Desktop order surfaces now route through `CompactOrderAccordion` adapters. Mobile-only `ActiveOrderCard` and `CompactKitchenOrderCard` markup remains intentionally unchanged. |
| Performance Impact | One shared memoized accordion implementation remains. Expanded bodies stay lazy-rendered, no listener/polling/network path changed, and stale duplicate order-card components were removed. |
| Validation | `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check` passed. Build/analyze retain the accepted Firebase/protobuf dynamic dependency warning. |

## RC1 Production Readiness and Go-Live Validation - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `RC1-PRODUCTION-GO-LIVE` |
| Scope | Release certification only. No application feature, refactor, API contract, Firestore schema/rule/index, payment, auth, realtime, repository, or module workflow change. |
| Status | Repository-side certification documentation implemented locally; validation passed. |
| Deployment Status | Direct hosted `curl` probes return `200` for `/`, `/api/release-info`, `/health/live`, `/health/ready`, and `/health/startup` with HTTPS/security headers. Hosted metadata serves SHA `82705245b36159a8e1ba2c16cdd7d513f6392126`, branch `release/production-nammude`, `applicationVersion: v1.0.0-rc3`, Node `v22.18.0`, plugin flags disabled, and `deploymentEnvironment: development`. |
| Performance Status | Local analyze and runtime profile pass. `npm run verify:performance` reports `3` pass, `1` warning, and `2` manual checks; production Lighthouse/Core Web Vitals, Chrome Performance/Coverage/Memory, INP, FPS, and hosted after-scores remain manual. |
| Security Status | `npm run audit:release` passes. Hosted headers include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. Production security signoff still requires Hostinger production env, Firebase rules/index/domain verification, provider webhook checks, secure session smoke, and authenticated route testing. |
| Provider Status | `npm run verify:providers` reports configured Authentication, Storage, Cloudinary, SMTP, Google OAuth, and Mapbox locally; Firebase Admin/Firestore, Razorpay, and WhatsApp remain blocked by missing local production/provider values. Hosted health reports Firebase/Firestore/Storage/Cloudinary/SMTP configured and Razorpay owner-scoped or missing. |
| Firebase Status | Hosted `/health/ready` reports Firestore connected and Storage configured, but local `validate:prod-env` reports missing Firebase Admin/VAPID values. Firebase Console rules, indexes, authorized domains, Cloud Messaging, and protected read/write smoke remain manual. |
| Realtime Status | Static release audit and operational smoke pass; no new listener, EventSource, polling, or subscription was added by RC1. Kitchen SSE, order realtime, offline recovery, and long-running listener memory checks remain manual browser/device gates. |
| Plugin Platform Status | Certified. `PLUGIN_PLATFORM_VALIDATION_REPORT.md` reports `489/489` checks passed for Phase 2D and plugin flags remain disabled by default. Controlled flag-enabled hosted smoke remains manual. |
| Manual Validation Status | Not complete. Authenticated customer, owner, admin, Kitchen, POS, QR/table, payment, realtime, offline, accessibility, mobile/tablet/desktop, and printer/device smoke remain manual. |
| Environment Status | `npm run validate:prod-env` reports `41` pass, `1` warning, and `24` errors in this local workspace for expected missing/placeholder production-only env and secrets. |
| Production Checklist | Added `PRODUCTION_CHECKLIST.md`, `GO_LIVE_GUIDE.md`, `POST_DEPLOYMENT_CHECKLIST.md`, and `KNOWN_LIMITATIONS.md`. |
| Release Documentation | Added `RELEASE_CERTIFICATION.md`, `ROLLBACK_GUIDE.md`, and RC1 limitation/checklist docs. Existing final release reports were regenerated by verification scripts. |
| Go / No-Go Decision | `NO GO` for production launch until external/manual gates pass. Repository is ready for RC deployment testing. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, listener, or schema change. |
| API Impact | None. No application endpoint or contract change. |
| Business Workflow Impact | None. Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, notifications, and settings workflows were not modified. |
| Rollback | No code rollback required for RC1 docs. If deployment fails, redeploy the previous Hostinger commit, keep plugin flags disabled, clear cache, and verify `/api/release-info` plus health endpoints. |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer verification report generated |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `npm run profile:runtime` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Quality Enhancement Program Phase 2D Enterprise Plugin Production Validation and First Real Plugin - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `PH2D-PRODUCTION-001` |
| Scope | Implement one real SDK-only plugin and validate plugin production readiness without modifying Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, Firestore, repositories, realtime, or business APIs. |
| Status | Implemented locally; validation passed. |
| Real Plugin | Restaurant Health Dashboard, an Admin/Developer diagnostics plugin disabled by default with `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD=false`. |
| SDK Usage Matrix | Uses `PluginContext`, `PluginAPI`, `PluginLifecycle`, `PluginEvents`, `PluginLogger`, `PluginStorage`, `PluginStorageManager`, `PluginPermissions`, `PluginConfig`, `PluginDiagnostics`, `PluginRuntime`, `PluginManifest`, `PluginRouter`, `PluginUI`, `PluginAssets`, `PluginServices`, `PluginUtilities`, `PluginVersion`, and `src/plugins/core/sdk/hooks`. |
| Extension Coverage | Dashboard Card, Sidebar, Header Action, Settings Page, Report Page, Floating Panel, Toolbar Button, Status Badge, Quick Action, Context Menu, Widget, Dialog, and Panel are registered through SDK UI contributions. |
| Runtime Coverage | Install, register, validate, initialize, enable, run, suspend, resume, disable, destroy, reload, and uninstall are covered by the runtime/lifecycle validation matrix. |
| Permission Coverage | Guest, Customer, Kitchen, Waiter, Owner, Admin, and Developer visibility/navigation/routing/action behavior is modeled; only Admin and Developer can see plugin surfaces. |
| Storage Coverage | Memory, session, persistent, and encrypted storage modes validate set/get, migration, quota, snapshot, and cleanup through SDK storage APIs. |
| Router Coverage | Admin dashboard, developer dynamic route, settings page, and report page register as lazy protected routes and detach on unload. |
| Performance | Passed. Latest synthetic timings: discovery `0.13ms`, registry lookup `0.26ms`, validation `0.08ms`, dependency resolution `0.48ms`, runtime creation `0.07ms`, context injection `0.12ms`, SDK injection `0.09ms`, UI registration `0.09ms`, route registration `0.09ms`, navigation registration `0.21ms`, event publish `1.91ms`, storage write `0.79ms`, storage read `2.30ms`, rapid enable/disable `0.47ms`, lazy load/unload `0.24ms`. |
| Memory | Passed. Latest heap delta was `-901928` bytes in the Node-safe validation run, with registry, event topic, storage, lifecycle, and cache cleanup counts all `0` after teardown. |
| Regression | Passed. Audit reports Customer, Owner, Kitchen, POS, Admin, QR, Payments, Inventory, Reports, Authentication, Realtime, and Firestore unchanged. |
| Security | Passed. Audit checks SDK-only imports, no business imports, no mutable globals, no storage escape, permission/flag gating, route unload cleanup, and no provider/secret exposure. |
| QA Results | Passed. `PLUGIN_PLATFORM_VALIDATION_REPORT.md`, `reports/plugin-platform/PH2D_PRODUCTION_VALIDATION_REPORT.md`, and `reports/plugin-platform/PH2D_PRODUCTION_VALIDATION_REPORT.json` were generated with `489/489` checks passed, `0` warnings, and `0` failures. |
| Documentation | Added `FIRST_REAL_PLUGIN.md`, `PLUGIN_DEVELOPER_GUIDE.md`, `PLUGIN_LIFECYCLE_GUIDE.md`, `PLUGIN_EXTENSION_GUIDE.md`, `PLUGIN_SECURITY_GUIDE.md`, `PLUGIN_PERFORMANCE_GUIDE.md`, and `PLUGIN_TROUBLESHOOTING.md`. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, listener, or schema change. |
| API Impact | None. No application endpoint or contract change. Plugin API use is internal SDK-only validation. |
| Realtime Impact | None. No listener, EventSource, polling, or subscription change. |
| Business Workflow Impact | None. Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, notifications, and settings workflows were not modified. |
| Known Issues | Hosted flag-enabled browser validation, Chrome memory, Lighthouse/Core Web Vitals, Hostinger env/redeploy, Firebase Console, provider dashboard checks, authenticated smoke, and printer/device checks remain manual. |
| Rollback | Set `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD=false`; revert `src/plugins/restaurant-health-dashboard`, SDK storage/hook/runtime delegate additions, feature flag additions, Phase 2D docs, audit/report updates, and tracker updates. |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer verification report generated |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `npm run profile:runtime` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Quality Enhancement Program Phase 2C Enterprise Plugin Validation, QA, and Production Hardening - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `PH2C-VALIDATION-001` |
| Scope | Validation and hardening only for completed Phase 1 plugin foundation, Phase 2A registry, and Phase 2B runtime/SDK. |
| Status | Implemented locally; validation passed. |
| Validation Coverage | Registry, lifecycle, runtime, SDK, sandbox, loader, validator, compatibility, marketplace, installer, diagnostics, storage, context, router, assets, services, hooks, feature flags, runtime dashboard, profiler, error isolation, permissions, configuration, generator, and sample plugins. |
| Contract Validation | `npm run test:enhancements` now validates metadata completeness, duplicate ids, duplicate feature flags, duplicate documentation, invalid versions, dependencies, lifecycle shape, storage namespace use, docs, tests, validators, schemas, feature flag files, and generator output. |
| SDK Validation | SDK export surface, public API strings, version compatibility, circular import guard, forbidden business imports, and documentation parity are checked. |
| Sandbox Validation | Frozen context, global mutation detection, prototype pollution probe, runtime destroy, global leakage, and browser global guardrails are checked by static and Node-safe probes. |
| Stress Results | Passed. Synthetic coverage included 100 plugin registrations, 1000 metadata lookups, 1000 event publishes, 1000 storage writes/reads, rapid enable/disable, lazy load/unload, and cleanup. Latest timings: event publish `0.90ms`, storage write `0.60ms`, storage read `0.89ms`, rapid enable/disable `0.14ms`, lazy load/unload `0.10ms`. |
| Memory Results | Passed. Latest heap delta was `1001392` bytes in the Node-safe validation run, with registry, event topic, storage, lifecycle, and cache cleanup counts all `0` after teardown. |
| Performance Results | Passed. Latest timings: discovery `0.11ms`, registry lookup `0.20ms`, validation `0.06ms`, dependency resolution `0.39ms`, runtime creation `0.06ms`, context injection `0.08ms`, SDK injection `0.07ms`, UI registration `0.07ms`, route/navigation registration `0.06ms`, enable `0.06ms`, disable `0.03ms`, destroy `0.03ms`. |
| Security Results | Passed. Checks covered forbidden business imports, storage namespace escape, permission-aware UI, feature-flag gating, sandbox mutation guard, prototype pollution probe, cycle detection, runtime cleanup, rollback, and error recovery. |
| QA Results | Passed. `PLUGIN_PLATFORM_VALIDATION_REPORT.md`, `reports/plugin-platform/PH2C_VALIDATION_REPORT.md`, and `reports/plugin-platform/PH2C_VALIDATION_REPORT.json` were generated with `340/340` checks passed, `0` warnings, and `0` failures. |
| Generator QA | Generator supports temp-root validation and generated six plugin archetypes during the audit: developer plugin, dashboard widget, sidebar tool, settings page, report plugin, and developer utility. |
| Sample Plugin Hardening | Developer Clock, Notes, System Information, and Theme Preview samples now include config defaults, config schemas, validators, feature flag files, docs, and tests README files. |
| Documentation | Added `docs/plugin-sdk/validation-qa.md` and `docs/plugin-platform/validation-hardening.md`; updated plugin architecture and this tracker. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, or schema change. |
| API Impact | None. No application endpoint or contract change. |
| Realtime Impact | None. No listener, EventSource, polling, or subscription change. |
| Business Workflow Impact | None. Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, notifications, and settings workflows were not modified. |
| Known Limitations | Browser-only sandbox checks for `window` and `document`, hosted Chrome memory, Lighthouse/Core Web Vitals, provider dashboards, Firebase Console, authenticated browser smoke, printer/POS/Kitchen/Owner/Customer validation, and plugin flag-enabled smoke remain manual. |
| Production Readiness | Repository-side plugin platform readiness is complete for disabled/default-off infrastructure. Production readiness remains blocked by external/manual gates and controlled flag-enabled browser validation. |
| Remaining Manual Tasks | Hostinger deployment/env, Firebase rules/indexes/authorized domains, Chrome profiling, Lighthouse/Core Web Vitals, browser memory, printers, POS, Kitchen, Owner, Customer, and controlled plugin validation. |
| Rollback | Revert sample plugin contract additions, `scripts/release/enhancement-registry-audit.mjs`, `scripts/plugins/create-plugin.mjs` root option/cast change, `docs/plugin-sdk/validation-qa.md`, `docs/plugin-platform/validation-hardening.md`, architecture/tracker/report updates. |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer verification report generated |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `npm run profile:runtime` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Release Candidate Repository Certification Closure - 2026-07-08

| Field | Result |
| --- | --- |
| Status | Repository-side work complete and pushed at `7fcd009d828635aef090fc9785af94b6ffc6b971`; Phase 2D production plugin validation closure is the final certification follow-up. |
| Scope | Repository-side certification, report regeneration, release verifier cleanup, and documentation alignment only. |
| Repository Fixes | Analyzer verification is now persisted outside `.next`; performance verification budgets route-owned JS instead of total static build JS; provider verification can use hosted health evidence; release certificate metadata reports Phase 2A/2B correctly. |
| Database Impact | None. No Firestore collection, schema, rule, index, repository contract, read, write, or listener change. |
| API Impact | None. Existing route contracts remain unchanged. |
| Business Workflow Impact | None. No new application feature or workflow redesign was added by this certification closure. |
| Release Decision | NO GO until Hostinger env/redeploy, Firebase Console/rules/index checks, provider dashboard checks, authenticated browser smoke, production Lighthouse/Chrome profiling, memory stability, and hardware/printer validation pass. |
| Documentation | Added `FINAL_RC_STATUS.md`; regenerated release certificate, production env, deployment, performance, smoke, memory, provider, final performance/runtime/bug/readiness reports. |

## Quality Enhancement Program Phase 2B Enterprise Plugin Runtime and Official SDK - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `PH2B-RUNTIME-001` |
| Scope | Enterprise plugin runtime and official SDK only. Phase 2A registry remains metadata ownership; Phase 2B runtime owns execution. |
| Status | Implemented locally; validation passed. |
| SDK Architecture | `src/plugins/core/sdk` exposes `PluginContext`, `PluginAPI`, `PluginLifecycle`, `PluginEvents`, `PluginLogger`, `PluginStorage`, `PluginPermissions`, `PluginConfig`, `PluginDiagnostics`, `PluginRuntime`, `PluginManifest`, `PluginRouter`, `PluginUI`, `PluginAssets`, `PluginServices`, `PluginUtilities`, and `PluginVersion`. |
| Runtime Flow | Discovery -> metadata validation -> dependency resolution -> compatibility validation -> registry registration -> context creation -> SDK injection -> permission validation -> config validation -> lazy import -> lifecycle initialize -> health monitor -> UI registration -> route registration -> runtime execution. |
| Sandbox Design | Runtime receives a frozen context and executes plugins through a sandbox that detects global mutation attempts. Registry, lifecycle, event bus, permissions, and hidden app services are not exposed as mutable internals. |
| Plugin Context Diagram | `PluginContext` includes plugin id, version, runtime version, permissions, logger, event bus, config, storage, navigation/router, UI, assets, approved API/services, theme, environment, user, tenant, language, timezone, and diagnostics. |
| Extension Point Catalog | Header Actions, Sidebar, Dashboard Cards, Widgets, Panels, Dialogs, Context Menus, Toolbar Actions, Quick Actions, Status Badges, Settings Pages, Reports, and Floating Panels. |
| Route / Navigation | Plugins may register lazy owner, admin, customer, kitchen, POS, and developer routes plus sidebar/settings/dashboard/reports/tools/developer navigation contributions. All contributions require feature flags and permissions. |
| Storage | Namespaced memory/session/persistent/encrypted storage supports version, migration, quota, cleanup, key listing, and snapshots. |
| Approved Services | Notifications, toast, modal, clipboard, theme, navigation, localization, formatting, date, currency, and analytics. Internal repositories, Firestore, payment providers, and business APIs are not exposed. |
| Health Monitoring Flow | Heartbeat, runtime errors, memory, FPS, long tasks, leaks, failures, health score, and automatic disable state are tracked by `src/plugins/core/diagnostics`. |
| Sample Plugins | Added developer-only Clock, Notes, System Information, and Theme Preview sample plugins, all disabled by default and scoped to SDK validation only. |
| Generator | Added `npm run plugin:create`, backed by `scripts/plugins/create-plugin.mjs`, to scaffold registry-compatible plugin folders. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, or schema change. |
| API Impact | None. No application endpoint or contract change. Plugin API is an internal SDK contract only. |
| Realtime Impact | None. No listener, EventSource, polling, or subscription change. |
| Business Workflow Impact | None. Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, notifications, and settings workflows were not modified for Phase 2B. |
| Risk | Low. SDK/runtime infrastructure is disabled unless plugin feature flags are enabled; no business modules are imported. |
| Rollback | Revert `src/plugins/core/{runtime,sdk,api,hooks,services,context,router,storage,assets,ui,sandbox}`, sample plugins, generator script, `docs/plugin-sdk`, feature flag additions, and enhancement audit/tracker additions. |
| Performance Metrics | Runtime context creation target `<5ms`; context injection target `<1ms`; storage lookup is O(1); lazy routes add no startup imports; health monitor stores in-memory counters only. |
| Documentation | Added `docs/plugin-sdk/*`, updated `docs/enhancement-plugin-architecture.md`, `scripts/release/enhancement-registry-audit.mjs`, and this tracker. |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer verification report generated |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Quality Enhancement Program Phase 2A Enterprise Plugin Registry System - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `PH2A-REGISTRY-001` |
| Scope | Enterprise plugin registry infrastructure only. Phase 1 lifecycle, feature flags, event bus, permissions, config, profiler, dashboard, logger, and error isolation were reused without expanding business surfaces. |
| Status | Implemented locally; validation passed. |
| Architecture Decision | Keep plugin discovery, metadata, registry state, dependency checks, compatibility checks, loading, marketplace data, installation, validation, and diagnostics as isolated `src/plugins/core/*` modules. Runtime plugin execution still flows through the existing lifecycle manager. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, or schema change. |
| API Impact | None. No endpoint or contract change. Marketplace is mock/local only. |
| Realtime Impact | None. No listener, EventSource, polling, or subscription change. |
| Business Workflow Impact | None. Customer, Owner, Kitchen, POS, Admin, QR, auth, payment, inventory, reports, notifications, and settings workflows were not modified for Phase 2A. |
| New Core Modules | `metadata`, `registry`, `discovery`, `dependency-manager`, `compatibility`, `validator`, `loader`, `marketplace`, `installer`, and `diagnostics`. |
| Plugin Metadata | `PluginMetadata` now covers identity, author/company/contact, version/license/category/priority, dependencies, permissions, feature flag, compatibility, assets, docs, tags, bundle/signature fields, and health/status. |
| Registry State Machine | `UNREGISTERED -> REGISTERED -> VALIDATED -> INITIALIZED -> ENABLED -> RUNNING`, with suspend/resume/disable/destroy paths and invalid-transition errors. |
| Dependency Graph | Dependency manager builds graph/tree views, topologically sorts plugins, detects missing/disabled/version-mismatch dependencies, and blocks circular dependencies. |
| Marketplace Roadmap | Phase 2A ships a mock provider only. Future remote registry, signed packages, downloads, reviews, pricing, ratings, and update channels remain disabled roadmap work. |
| Installer | Transactional install validates metadata, dependencies, compatibility, lifecycle, config, permissions, and health, then rolls back registry/lifecycle steps on failure. |
| Diagnostics | Reports total/installed/enabled/disabled/broken counts, failed loads, memory estimates, health score, slow plugins, missing dependencies, and update availability without provider calls. |
| Build Tooling | `next.config.ts` disables the unstable local webpack build worker, and the existing trace recovery wrapper now also covers `_global-error/page.js.nft.json` so build/analyze complete on Windows. |
| Risk | Low. Disabled/local registry infrastructure; no business routes or data contracts changed. |
| Rollback | Revert `src/plugins/core/{metadata,registry,discovery,dependency-manager,compatibility,validator,loader,marketplace,installer,diagnostics}`, plugin metadata, `docs/plugin-platform`, and the enhancement audit additions. |
| Performance Benchmarks | Registry lookups are map-backed O(1); dependency resolution is O(V+E); discovery is lazy and cached; loader imports only requested plugins with timeout/abort; mock marketplace uses in-memory data only. |
| Documentation | Added `docs/plugin-platform/*`, updated `docs/enhancement-plugin-architecture.md`, plugin docs, plugin tests docs, and this tracker. |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer HTML regenerated |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Active Orders, Delay Threshold, Payment Session Hotfix - 2026-07-08

| Field | Result |
| --- | --- |
| Status | Implemented locally; release remains pending hosted redeploy and manual production validation. |
| Database Impact | Reuses existing `restaurantSettings`; adds optional `operationalSettings.orderDelayThresholdMinutes` only. No collection, rule, index, listener, or repository contract change. |
| API Impact | Added owner-scoped `GET/PUT /api/owner/operational-settings`; Razorpay order/verify now use the same request session fallback as `/api/orders`. Existing route contracts remain backward compatible. |
| Dependency Impact | Added `@radix-ui/react-popover` for lightweight desktop floating panels. No dialog/drawer framework added. |
| Active Orders | Owner active orders grid now aligns Status, Priority, Progress, ETA, Quick View, and Actions with fixed desktop tracks, no action overflow, and mobile inline expansion. |
| Quick View | Desktop uses compact Radix Popover without backdrop; mobile uses row expansion. Content is read-only and includes customer, table/order number, items, variants, notes, quantity, payment, kitchen status, order/waiting/ETA, and timeline. |
| Late Alerts | Owner Settings persists 10/15/20/25/30 minute threshold, default 15. Owner Orders, Kitchen, and POS use the same threshold; delayed rows highlight while only status, waiting/ETA, and serve action blink softly. |
| Payment Fix | Root cause was payment route session mismatch: order creation accepted legacy/scoped customer sessions while Razorpay order/verify forced only the scoped customer cookie. Payment fetches now stay same-origin with aligned session resolution. |
| Performance Before | Hosted baseline from user report: Desktop 77, Mobile 58, LCP 10.9s, Speed Index 9.2s, TBT 350ms. |
| Performance After | Local build/runtime gates passed, but hosted Lighthouse after-score is not available from this workspace. Rerun after Hostinger redeploy/cache clear. |
| Bundle Reduction | `npm run analyze` now completes through the wrapper and persists analyzer verification evidence; hosted Lighthouse after-score still requires redeploy and browser tooling. |
| Hydration Reduction | Quick View avoids full-order navigation and heavy modal/drawer surfaces; mobile expansion avoids desktop popover hydration. |
| Memory/Listener Impact | No new realtime listener or polling loop. Operational settings are fetched through existing no-store API reads and reused in memoized delay calculations. |
| Known Issues | Stale Hostinger deployment/env, hosted Lighthouse after-score, real Razorpay/provider validation, authenticated browser smoke, printer/hardware checks, and Firebase rules/index deployment remain manual gates. |

Validation:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning; analyzer verification report generated |
| `npm run profile:runtime` | Passed |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Quality Enhancement Program Phase 1 Foundation Completion - 2026-07-08

| Field | Result |
| --- | --- |
| Feature ID | `PH1-FOUNDATION-001` |
| Architecture Decision | Complete the plugin framework before Phase 2 feature work. Plugins must initialize through lifecycle, read flags through the feature-flag service, communicate through the event bus, use plugin-local config/permissions/error boundaries, and remain disabled by default. |
| Status | Implemented, disabled by default, local validation passed. |
| Dependencies | Existing `IdleMount`, dynamic imports, React client boundaries, browser Performance APIs. No dependency package added. |
| Feature Flags | `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false`, `NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD=false`, `NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER=false`. |
| Database Impact | None. No Firestore collection, field, rule, index, read, write, or schema change. |
| API Impact | None. No route or contract change. |
| Realtime Impact | None. No listener, EventSource, polling, or subscription change. |
| Performance Impact | Disabled path keeps plugin runtime unmounted. Enabled path lazy-loads after idle and uses bounded client-only observers/intervals. |
| Bundle Impact | Adds isolated plugin-core and diagnostics chunks only when flags mount the enhancement runtime. |
| Memory Impact | Lifecycle state maps are runtime-scoped; profiler/diagnostics observers and intervals clean up on unmount. Disabled path has no observer/interval allocation. |
| Risk | Low. Framework-only extension with no business workflow changes. |
| QA | Manual QA not required while flags stay disabled; developer dashboard is ignored in production. |
| Rollback | Keep all plugin flags `false`; revert `src/plugins`, shell enhancement mount, env docs, and `test:enhancements` script if needed. |
| Documentation | Updated `docs/enhancement-plugin-architecture.md`, plugin docs, test docs, env matrix, and this tracker. |
| Release Version | `v1.0.0-rc3` extension-only follow-up. |

Completed Phase 1 foundation components:

| Component | Status | Path |
| --- | --- | --- |
| Plugin Registry | Complete | `src/plugins/registry.ts` |
| Lifecycle Manager | Complete | `src/plugins/core/lifecycle` |
| Feature Flag Manager | Complete | `src/plugins/core/feature-flags` |
| Event Bus | Complete | `src/plugins/core/events` |
| Logger | Complete | `src/plugins/core/logger` |
| Runtime Dashboard | Complete, developer-only, disabled | `src/plugins/core/runtime-dashboard` |
| Performance Profiler | Complete, disabled | `src/plugins/core/profiler` |
| Error Isolation | Complete | `src/plugins/core/error-isolation` |
| Permission Layer | Complete | `src/plugins/core/permissions` |
| Configuration Manager | Complete | `src/plugins/core/config` plus plugin-owned config files |
| Testing Framework | Complete | `src/plugins/core/testing`, `scripts/release/enhancement-registry-audit.mjs` |

Validation plan:

| Check | Status |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `npm run analyze` | Passed |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `git diff --check` | Passed |

## Final Release Candidate Production Certification - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Stabilization-only release certification. Existing Customer, Owner, POS, Kitchen, Admin, QR, payment, inventory, reports, notifications, authentication, repositories, APIs, Firestore collections, schemas, and UI workflows were preserved. |
| Latest Commit | Certification started from pushed commit `311104b4c982edae5135d8643deabff65aef4af4` and was later pushed as `7fcd009d828635aef090fc9785af94b6ffc6b971` before the Phase 2D production plugin validation closure. |
| Bug Sweep | Repository marker audit found no actionable runtime TODO/FIXME/HACK/XXX, `@ts-ignore`, `console.log`, or debugger code. Three React hook suppression comments were removed safely by making dependencies explicit. Remaining broad hits are docs, lockfiles, CLI script logging, or intentional user-facing copy. |
| Route Audit | Static App Router audit found `100` pages, `73` API route handlers, `21` route loading files, `12` error boundaries, and the generated Next `_not-found` route. Loading, retry, empty, auth, permission, and error states remain present across the major customer, owner, admin, POS, and Kitchen surfaces. Full authenticated browser route smoke remains manual. |
| Operational Audit | Customer, Owner, Kitchen, POS, and Admin workflows were reviewed statically against existing route, component, repository, and API paths. No business workflow or API contract change was introduced. |
| Firestore / Realtime Audit | No Firestore collection, schema, rule, index, or repository contract was changed. Kitchen remains the only checked EventSource path, and no duplicate fetch interval or duplicate API family was found by static scan. Firebase rules/index deployment remains manual. |
| Deployment Config Audit | Env references for Firebase, Cloudinary, SMTP, Google OAuth, Razorpay, WhatsApp, SMS, Mapbox, Meta, and diagnostics remain env-driven. No secrets were changed. Local `validate:prod-env` failed for expected missing production-only values. |
| Firebase Warning | Build/analyze still report `@protobufjs/inquire` dynamic dependency through Firebase Firestore/Admin diagnostics. This is accepted and documented because it originates in upstream Firebase/protobuf server dependency code; replacing it is not safe during certification. |
| Validation | Passed: `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run profile:runtime`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, `cmd /c npm run test:enhancements`, and `git diff --check`. |
| Env Validation | `cmd /c npm run validate:prod-env` failed locally for missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`; these require Hostinger/Firebase/provider values. |
| Release Readiness | Repository code is certified as Release Candidate `v1.0.0-rc3` for deployment testing. Production signoff remains No-Go until Hostinger production env/redeploy/cache, Firebase rules/index deployment, authenticated browser smoke, provider checks, Lighthouse/Core Web Vitals, Chrome profiling, and hardware/printer checks pass. |

## Quality Enhancement Program Phase 1 - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Added the extension architecture lane for future quality enhancements without touching stable Customer, POS, Kitchen, Owner, Admin, QR, payments, inventory, realtime orders, notifications, reports, authentication, or settings business logic. |
| Feature ID | `PH1-QD-001` |
| Feature | Quality Diagnostics plugin foundation. |
| Priority | `P1` |
| Status | Implemented, disabled by default, local validation passed. |
| Owner | Codex |
| Dependencies | Existing `IdleMount`, shell composition, browser Performance APIs. No third-party dependency added. |
| Feature Flag | `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false` in committed env examples. |
| Database Impact | None. No collection, schema, field, index, or Firestore read/write change. |
| API Impact | None. No endpoint or API contract change. |
| Performance Impact | Disabled path loads no plugin runtime. Enabled path mounts after idle and samples only client Performance APIs. |
| Bundle Size Impact | Disabled path does not import the plugin runtime chunk. Enabled path lazy-loads an isolated diagnostics chunk. |
| Realtime Impact | None. No realtime listener added. |
| Memory Impact | Enabled path uses one bounded interval and one PerformanceObserver with cleanup on unmount. Disabled path has no runtime allocation beyond static flag metadata. |
| Risk Level | Low. Rollback is flag-off or removing `src/plugins/quality-diagnostics` and the shell mount. |
| Testing Status | Passed `npm run test:enhancements`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run analyze`, `npm run audit:release`, `npm run smoke:operational`, and `git diff --check`. |
| QA Status | Manual QA not required while disabled; controlled profiling QA required before enabling in any hosted environment. |
| Release Version | `v1.0.0-rc3` extension-only follow-up. |
| Rollback Strategy | Keep `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false`; if needed, revert plugin files and the two shell mount lines. |
| Documentation Status | Added `docs/enhancement-plugin-architecture.md` and `src/plugins/quality-diagnostics/docs/README.md`. |
| Deployment Status | Not production-enabled. Requires explicit env flag to activate. |

Required feature package:

| Requirement | Status |
| --- | --- |
| Business Objective | Documented in plugin README. |
| Technical Design | Documented with runtime architecture diagram in plugin README. |
| Architecture Diagram | Documented in plugin README. |
| Performance Analysis | Documented; disabled path has no startup runtime. |
| Risk Analysis | Documented as low risk with flag rollback. |
| Acceptance Criteria | Documented in plugin README. |
| Unit Tests | `npm run test:enhancements` audits registry and disabled defaults. |
| Integration Tests | Shell mount is flag-gated and idle-mounted; typecheck covers import boundaries. |
| Regression Tests | No business workflow files changed. |
| Accessibility Validation | Dev-only panel uses `output` with polite live updates. |
| Performance Benchmark | No startup benchmark needed while disabled; enabled profiling remains manual. |
| Rollback Plan | Flag off or revert plugin/shell mount. |
| Documentation | Completed. |

## Enterprise Performance Sprint Phase 3 - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Final runtime smoothness pass for Customer, Owner, Kitchen, and POS only. Existing Customer, Owner, POS, Kitchen, QR, inventory, accounting, Menu Library, notifications, payment, repository, API, Firestore collection, schema, auth, UI, and business workflows were preserved. |
| Reports | Added `RUNTIME_PROFILE.md`, `PERFORMANCE_PHASE3_REPORT.md`, `RENDER_ANALYSIS.md`, `MEMORY_ANALYSIS.md`, `STRESS_TEST_REPORT.md`, `PERFORMANCE_BUDGET.md`, `FINAL_PERFORMANCE_REPORT.md`, `FINAL_RUNTIME_REPORT.md`, `FINAL_BUNDLE_REPORT.md`, `FINAL_BUG_REPORT.md`, `FINAL_FIRESTORE_AUDIT.md`, `FINAL_RENDER_REPORT.md`, `FINAL_NETWORK_REPORT.md`, `FINAL_MEMORY_REPORT.md`, and `FINAL_RELEASE_READINESS.md`; added `npm run profile:runtime` to regenerate them from `.next` manifests and synthetic operational stress measurements. |
| Final Task Check | The final optimization sprint attachment was checked against the current implementation. Browser-only flame graphs, Lighthouse/Core Web Vitals, Chrome Coverage/Memory, authenticated smoke, provider checks, and hardware checks remain manual because the required browser tooling, credentials, provider dashboards, and devices are not available in this workspace. |
| Kitchen Runtime | Kitchen SSE/full-refresh payloads now reconcile unchanged ticket objects, Kitchen cards are memoized by ticket reference and minute bucket, and desktop Kitchen columns use lightweight windowing for long queues. Existing EventSource cleanup, print, sound, status, and drawer workflows were preserved. |
| POS Runtime | POS search is debounced, menu/custom product lists are precomputed per data refresh, product grid/cards are memoized, bill totals/templates are memoized, and cart item handlers use stable refs so quantity changes repaint only changed product cards. |
| Owner Runtime | Owner Orders search is debounced; partner integration dialog/card code loads only when the hidden operations panel/dialog is used. Owner Settings now dynamically loads Mapbox, Cloudinary upload, push permission, fullscreen, and loyalty rules tab dependencies. |
| Customer/Profile Runtime | Profile no longer statically imports `react-hot-toast`; App Preferences loads dynamically from the settings surface. Customer home remains at the Phase 2 startup shape; the larger server-component/data-island conversion remains a separate architecture pass. |
| Stress Result | Synthetic Node stress for 100 Kitchen orders and 1000 POS products stayed under the runtime CPU budgets: Kitchen filter/sort p95 `0.40ms`, Kitchen reconciliation p95 `0.03ms`, POS category switch p95 `0.07ms`, POS search p95 `0.11ms`. |
| Budget Result | Route-owned JS remains over the aspirational budgets: `/` `455 KB`, `/profile` `544 KB`, `/owner` `556 KB`, `/owner/orders` `1188 KB`, `/owner/settings` `667 KB`. This sprint improved runtime behavior more than total route ownership. |
| Validation | Passed: `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run profile:runtime`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check`. Build/analyze retain the known Firebase/protobuf dynamic dependency warning; `git diff --check` retained Git line-ending normalization warnings only. |
| Remaining Manual Gates | Production Chrome Performance/Coverage/Memory, 30-minute heap stability, authenticated owner/POS/Kitchen/customer browser smoke, hosted Lighthouse/Core Web Vitals, and provider/hardware gates remain manual before production signoff. |
| Release Readiness | Code readiness remains `99%`; production-release readiness remains `85%` until manual infrastructure/provider/hardware/browser and Lighthouse gates pass. Recommendation remains No-Go before those gates. |

## Enterprise Performance Sprint Phase 2 - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Route-level bundle splitting and React startup optimization only. Existing Customer, Owner, POS, Kitchen, QR, inventory, accounting, Menu Library, notifications, payment, repository, API, Firestore collection, schema, auth, UI, and business workflows were preserved. |
| Reports | Added `BUNDLE_DEEP_ANALYSIS.md`, `DEPENDENCY_AUDIT.md`, `ROUTE_LOAD_ANALYSIS.md`, and `PERFORMANCE_PHASE2_REPORT.md`. |
| Firebase Config | Added `src/firebase/config.ts`; `src/firebase/client.ts`, FCM support checks, auth hooks, and profile actions now use config-only checks before loading Firebase SDK accessors. |
| Auth / Profile Split | `useAuthUser` dynamic-loads `auth-service` inside the browser effect; profile save/logout dynamically loads Firebase Auth and Stack/customer sign-out helpers only on action. |
| App Store Split | `src/lib/app-store.ts` no longer statically imports owner/menu production Firestore mutation services. Menu, offer, staff, owner profile, and inventory persistence helpers load only when their mutation actions run. |
| Bundle Result | `/` RSC route JS reduced from `1017 KB` to `455 KB`; `/profile` reduced from `1714 KB` to `562 KB`; Firestore/Auth ownership reduced from `94` route manifests to `10`. |
| Initial Chunk Probe | Local production HTML for `/`, `/profile`, and `/owner/pos` has no initial Firestore/Auth/Stack/XLSX/Mapbox flagged chunks. `/login` keeps auth chunks as expected. |
| Validation | Passed: `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, local production initial-chunk probe, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check`. Build/analyze retain the known Firebase/protobuf dynamic dependency warning. |
| Remaining Manual Gates | Redeploy current performance commit with `NEXT_PUBLIC_APP_ENV=production`, rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory on hosted production, run authenticated browser smoke, and keep provider/hardware/Firebase manual gates from rc3 certification. |
| Release Readiness | Code readiness remains `99%`; production-release readiness remains `85%` until manual infrastructure/provider/hardware/browser and Lighthouse gates pass. Recommendation remains No-Go before those gates. |

## Enterprise Performance Recovery Sprint - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Runtime performance recovery only. Existing Customer, Owner, POS, Kitchen, QR, inventory, accounting, Menu Library, notifications, payment, repository, API, Firestore collection, schema, auth, UI, and business workflows were preserved. |
| Report First | Added root `PERFORMANCE_REPORT.md` before implementation with current bottlenecks, LCP/CLS causes, provider, Firestore, network, hydration, bundle, and dependency findings. |
| Measurement Limits | PageSpeed Insights returned quota `429 RESOURCE_EXHAUSTED`; local Lighthouse/Chrome/Edge executables were unavailable. Saved Lighthouse artifacts were used only for root-cause direction, and final Lighthouse/Core Web Vitals remain manual after production-env redeploy. |
| LCP Finding | Saved Lighthouse identified the home explanatory paragraph as LCP; the dominant issue was render/main-thread delay rather than image loading. |
| CLS Finding | Saved Lighthouse identified large customer shell/footer movement; the home loading fallback did not reserve enough final page height. |
| Provider Deferral | Google Analytics now loads with `lazyOnload`; customer auth session bridge, Firestore hydrator, toaster, PWA, push, and analytics diagnostics mount behind `IdleMount`. |
| Firebase / Firestore | Public header no longer statically imports Firestore/client collections for saved addresses; it lazy-loads the listener only while the location picker is open for a signed-in customer. Firebase compatibility exports are non-eager and accessor functions remain the initialization path. |
| Home Runtime | Favorite write helpers load only on favorite action, logout auth modules load only on logout, and home menu preview data waits for browser idle because those cards are below the initial LCP area. |
| CLS Stabilization | Customer home loading state now uses a route-shaped skeleton with reserved mobile/desktop height instead of a full-screen splash overlay. |
| Bundle Evidence | Current largest client chunks after analyze: Mapbox `1.75 MB`, shared/app `788 KB`, account/auth/profile `589 KB`, owner/admin menu-library `412 KB`, customer/public shared `266 KB`, main CSS `183 KB`. |
| Validation | Passed: `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check`. Build/analyze retain the known Firebase/protobuf dynamic dependency warning. |
| Remaining Manual Gates | Redeploy current performance recovery commit with `NEXT_PUBLIC_APP_ENV=production`, rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory on hosted production, run authenticated browser smoke, and keep provider/hardware/Firebase manual gates from rc3 certification. |
| Release Readiness | Code readiness remains `99%`; production-release readiness remains `85%` until manual infrastructure/provider/hardware/browser and Lighthouse gates pass. Recommendation remains No-Go before those gates. |

## Final Production Hardening and Release Certification - 2026-07-08

| Field | Result |
| --- | --- |
| Scope | Final repository-side release certification only. Existing Customer, Owner, POS, Kitchen, QR, inventory, accounting, Menu Library, notifications, payment, repository, API, Firestore collection, schema, UI, and business workflows were preserved. |
| Release Candidate | Active candidate advanced to `v1.0.0-rc3` with package metadata `1.0.0-rc.3`; existing `v1.0.0-rc1` and published `v1.0.0-rc2` tags remain immutable. |
| Git / Tag Evidence | `v1.0.0-rc3` resolves to runtime release commit `cd1c81435a1e535483b94d66ffa1b1bf63494c0b`; final branch commit is reported in the release handoff after the docs-only certification commit is pushed. |
| Health Endpoints | Added public no-store `/health/live`, `/health/ready`, and `/health/startup` route handlers returning application version, git SHA, deployment environment, Firestore/storage status, SMTP/Cloudinary/Razorpay/Firebase configuration status, runtime status, memory, CPU estimate, build timestamp, and public request id only. |
| Diagnostics | Owner and Admin diagnostics now include `operationalDiagnostics` with realtime listener ownership, cache status, pending queue state, notification queue, Kitchen/POS queue state, Firestore status, tenant/open-order/kitchen-load counts where authenticated, memory, CPU estimate, and slow-query signal. |
| Firestore / Data | Public health uses a bounded `restaurants.limit(1)` readiness probe; Admin diagnostics use Firestore count aggregation for tenant, open-order, Kitchen, and unread-notification counts. No full collection scan, collection, schema, rule, or index change was added. |
| Provider Readiness | Health and diagnostics report provider configuration shape only. No live SMTP send, Cloudinary upload, Razorpay payment/refund, WhatsApp/SMS send, Mapbox call, Google OAuth flow, or FCM push was executed from the repository. |
| Security | Health responses expose booleans/status values and request ids only; provider secrets, private keys, OTPs, tokens, cookies, authorization headers, raw payment ids, and stack traces remain hidden. |
| Documentation | Release notes, changelog, environment matrix, deployment package, runbook, API certification note, final repository certification report, and release report were aligned to rc3 and the new health/diagnostics surfaces. |
| Local Release / Health Probe | Local `next start` on port `3099` returned `/api/release-info` `200` with `applicationVersion: v1.0.0-rc3`, `deploymentEnvironment: production`, and branch `release/production-nammude`; `/health/live` returned `200`; `/health/ready` and `/health/startup` returned safe `503` degraded responses because local Firebase Admin production env is not configured. |
| Validation | Passed: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run smoke:operational`, `cmd /c npm run audit:release`, and `git diff --check`. `cmd /c npm run validate:prod-env` failed locally for missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`; these require Hostinger/Firebase/provider values. |
| Remaining Manual Gates | Hostinger production env/redeploy/cache, Firebase rules/index deploy, authenticated browser smoke, provider console smoke, printer/device/multi-device smoke, Lighthouse/Core Web Vitals, and final hosted metadata/health verification. |
| Release Readiness | Code readiness remains `99%`; production-release readiness remains `85%` until manual infrastructure/provider/hardware/browser gates pass. Recommendation remains No-Go before those gates. |

## Repository Observability Hardening and Release Audit Closure - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Production observability and repository-side release audit hardening only. Existing Customer, Owner, POS, Kitchen, QR, payment, provider, repository, Firestore collection, schema, UI, and business workflows were preserved. |
| Trace Context | Added `src/lib/server/request-trace.ts` for server request ids, correlation ids, internal trace ids, transaction ids, tenant ids, restaurant ids, and user ids. Public API responses expose request ids only; internal trace ids stay in logs. |
| Central Logger | Added `src/lib/server/production-logger.ts` with INFO, DEBUG, WARN, ERROR, SECURITY, AUDIT, PERFORMANCE, PAYMENT, QR, KITCHEN, POS, OWNER, and ADMIN categories plus production log-level filtering and automatic masking for passwords, JWTs, Firebase tokens, API keys, secrets, cookies, authorization headers, OTPs, card fields, and payment ids. |
| Error Framework | Added `src/lib/server/api-response.ts` with unified API error classes for validation, business rule, authorization, payment, printer, Firestore, network, rate-limit, and unknown failures. |
| Operational Logging | Existing `logOperationalEvent` and `logOperationalFailure` now delegate through the centralized production logger and allow trace/correlation/transaction/user/table context while continuing to filter unsafe fields. |
| Routes Hardened | Owner Orders, POS, Kitchen, Kitchen stream, system diagnostics, owner master templates, loyalty rules, tables, analytics, customers, Razorpay order/verify/refund/webhook, auth session, email OTP, module auth, public order notification, public reviews, customer account/orders, public Firestore/cache/outage alerts, and push dispatch logs now use centralized masked server logging where touched. |
| Owner Access Errors | `requireOwnerFeature` now returns safe request metadata on permission, rate-limit, and same-origin failures. |
| Payment Observability | Razorpay create, verify, refund, webhook receive/process/duplicate/deferred, invalid signature, and push-dispatch paths now write sanitized payment/security logs without exposing provider secrets or raw payment ids. |
| Diagnostics | Owner and Admin diagnostics now include safe request metadata and use centralized failure logging; no new diagnostics route or duplicate dashboard was added. |
| Release Audit Automation | Added `npm run audit:release` and `scripts/release/repository-hardening-audit.mjs`; generated `scripts/release/repository-hardening-audit.md`. Current static result: `0` debt markers, `0` matching unbounded Firestore collection reads, remaining runtime console hits limited to client/browser diagnostic paths, and listener/API-envelope sites recorded for review. |
| Runbook | Added `docs/production-operational-runbook.md` covering operational logging, disaster recovery, security checklist, performance checklist, provider checklist, and infrastructure checklist. |
| Validation | Passed: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run smoke:operational`, `cmd /c npm run audit:release`, and `git diff --check`. `cmd /c npm run validate:prod-env` failed locally for missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`; these require Hostinger/Firebase/provider values. |
| Tag Note | `v1.0.0-rc2` is already published at `6272d7edfdc7299a728cb0e606b523a55b1248ee`; do not move it without explicit approval. If this follow-up hardening pass is committed for deployment, create the next immutable release-candidate tag or explicitly approve retagging. |
| Remaining Manual Gates | Hostinger production env/redeploy/cache, Firebase rules/index deploy, authenticated browser smoke, provider console smoke, printer/device/multi-device smoke, Lighthouse/Core Web Vitals, and final hosted metadata verification. |
| Release Readiness | Code readiness remains `99%`; production-release readiness is `85%` until manual infrastructure/provider/hardware/browser gates pass. Recommendation remains No-Go before those gates. |

## RC2 Release Certification and Manual Deployment Package - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Completed every repository-side release item that does not require Hostinger dashboard, Firebase Console, third-party provider dashboards, authenticated production browser sessions, or physical devices. |
| Release Strategy | Existing `v1.0.0-rc1` tag points to `54ef88c27676ed9d7de8b4c8982d8266ad5918ae`; do not rewrite it. Use new `v1.0.0-rc2` tag for the final committed release candidate. |
| Package Metadata | `package.json` and `package-lock.json` now report `1.0.0-rc.2`. |
| Release Metadata | `/api/release-info`, client build info, owner diagnostics, `.env*` examples, release notes, and deployment docs now align on `v1.0.0-rc2`. |
| Environment Matrix | Added `docs/production-environment-matrix.md` with Required, Optional, Development Only, Deprecated, and Build Metadata classifications. |
| Env Validation | `scripts/release/validate-production.js` now delegates to the canonical `scripts/validate-production-env.mjs`; production validation now checks `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc2` and requires `TABLE_QR_SECRET`. |
| Production Fallbacks | Removed current runtime `0.1.0`/rc1 fallbacks from release metadata, client build info, and owner diagnostics. Historical docs retain historical rc1 references. |
| QR Signing | `TABLE_QR_SECRET` is now required for production QR token signing; development keeps the local fallback only outside production. |
| Security Hardening | Customer orders/account logs, public reviews, order notification, public cache/firestore/outage diagnostics, Razorpay webhook failure records, and admin diagnostics no longer log or return raw exception messages in the touched paths. |
| Firestore Review | `firestore.rules` includes release collections and catch-all deny; `firestore.indexes.json` includes current operational owner/customer/menu/payment/notification indexes. Firebase deployment remains manual. |
| Provider Readiness | Provider docs now require real SMTP, Firebase, Cloudinary, Google OAuth, Mapbox, VAPID, and optional Razorpay/WhatsApp credentials before launch-specific smoke. |
| Deployment Package | Added `docs/final-manual-deployment-package.md` with changed files, configuration, env, Firebase commands, Hostinger sequence, cache clearing, verification, rollback, browser/printer/QR/provider/Lighthouse, and certification checklists. |
| Local Release Info Probe | Passed from `next start` on a temporary local port: `applicationVersion: v1.0.0-rc2`, `deploymentEnvironment: production`, branch `release/production-nammude`, final tag-target commit reported in release handoff, and HTTPS public app URL. |
| Validation | Passed: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run smoke:operational`, local `/api/release-info` probe, and `git diff --check`. Build warning remains the known Firebase/protobuf dynamic dependency warning. |
| Env Validation | `cmd /c npm run validate:prod-env` failed locally for missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, and local non-HTTPS `NEXT_PUBLIC_APP_URL`; these require Hostinger/Firebase/provider values. |
| Remaining Manual Gates | Hostinger env/redeploy/cache, Firebase rules/index deploy, authenticated browser smoke, provider console smoke, printer/device/multi-device smoke, and final release tag creation after commit. |
| Release Readiness | Code readiness remains `99%`; production-release readiness is `84%` until manual infrastructure/provider/hardware/browser gates pass. Recommendation remains No-Go before those gates. |

## Enterprise Production Hardening and Release Closure Audit - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Production-readiness audit and safe error/metadata hardening only. Completed owner workflows, POS, Kitchen, QR, Inventory, Accounting, Payment Gateway, Master Menu, Owner Settings, repositories, APIs, Firestore collections, and schemas were preserved. |
| Local Commit Audited | Started from `f5cf3fe5faadad5a68821a4e1a0d7e19f085e393`; final hardening commit reported in release handoff. |
| Rollback SHA | `f5cf3fe5faadad5a68821a4e1a0d7e19f085e393` is the pre-hardening local owner runtime commit to roll back to if the hardening handoff is rejected. |
| Hosted Metadata | Hostinger `/api/release-info` currently reports `fe069b609009b8a042f58d1143407998407f3c64`, `deploymentEnvironment: development`, and `applicationVersion: 0.1.0`; it is behind local release HEAD and not production-configured. |
| Local Production Metadata | RC2 local build/start verification must confirm `/api/release-info` reports `deploymentEnvironment: production` and `applicationVersion: v1.0.0-rc2`; final deployed commit must be verified after the handoff commit is pushed and rebuilt. |
| Owner Route Probe | Local production server verified `/owner/login` returns `200`; 25 protected owner routes redirect unauthenticated users with `307` to `/owner/login?next=...`. |
| Owner API Probe | Local production server checked 58 owner API method/path combinations. Result: 56 expected unauthenticated `403` responses and 2 expected auth validation `400` responses; no unexpected 2xx/5xx response was found. |
| Hosted Route Probe | Hosted unauthenticated probe found public/auth pages returning `200`, protected owner routes returning expected `307`, owner APIs returning expected `403`/`405`, provider endpoints returning expected validation/auth statuses, and no unexpected `404`/`500` in checked routes. |
| Provider Reachability | Hosted Cloudinary signature POST returns `200`; Razorpay order/verify require auth (`401`), Razorpay webhook rejects missing signature (`400`), WhatsApp send requires auth (`401`), WhatsApp webhook rejects invalid verification token (`403`), OTP/phone/order-notification empty payloads return safe `400`. Real provider sends/uploads/payments remain manual. |
| Firestore Review | Local `firestore.rules` now includes `masterMenuTemplates`, `communicationSettings`, `communicationHistory`, `supportIssues`, `user_preferences`, `phoneVerificationSessions`, `emailOtps`, `modulePasswordOtps`, `paymentIntents`, `paymentWebhooks`, `whatsappEvents`, and `whatsappWebhooks`; catch-all deny remains. `firestore.indexes.json` includes current operational owner indexes. Deployment remains manual. |
| Safe Error Hardening | Owner tables, owner sync, owner profile access, owner offers access, owner POS logging, auth session verification logs, and owner offline sync conflict responses now avoid returning/logging raw exception details or full document snapshots. |
| Release Metadata Hardening | `/api/release-info` now reports `applicationVersion` from `NEXT_PUBLIC_APP_VERSION` or falls back to `v1.0.0-rc2`, aligning the local release build with tracker release metadata. |
| Tenant Validation | Owner APIs either use `requireOwnerFeature` plus `tenantScope`, direct owner session role checks plus `tenantScope`, or endpoint-specific allowed restaurant checks. Repository write/read paths continue to enforce tenant/restaurant ownership. |
| Duplicate Request Audit | Owner fetch scan found bounded route bootstrap/action calls and the existing Kitchen SSE path; no new duplicate polling loop, duplicate Firestore listener, or duplicate owner endpoint family was introduced. |
| Authenticated Workflow Limit | Full login-to-logout owner workflow remains manual because this workspace does not have production owner credentials, provider consoles, real devices, or printer hardware. Logout path is wired through `/api/auth/session?surface=owner` and records logout audit when a session exists. |
| Release Readiness | `99%` code-ready and `82%` production-release ready. Recommendation is No-Go until Hostinger production env/redeploy, authenticated browser smoke, provider validation, Firestore deploy verification, and printer/device smoke are complete. |

### Owner Workflow Verification Matrix

| Workflow | Local Verification | Remaining Manual Smoke |
| --- | --- | --- |
| Login / Logout | `/owner/login` 200; empty owner login returns expected 400; logout endpoint/code path reviewed. | Real owner credential login, view switch, and logout audit in hosted browser. |
| Dashboard / Analytics / Reports | Protected routes redirect unauthenticated; analytics API returns expected 403 without owner session. | Authenticated dashboard metrics, reports range fetch, and chart accuracy. |
| Orders / Notifications | `/owner/orders` protected; orders API GET/PATCH expected 403; topbar notification read/ack path reviewed. | New order alert, notification center filters/read state, and order action smoke. |
| Kitchen | `/owner/kitchen` and history protected; Kitchen API GET/POST/PATCH/stream expected 403. | Realtime SSE, sound, KOT preview/print/reprint, tablet/TV smoke. |
| POS | `/owner/pos` protected; POS API GET/PATCH/POST/DELETE expected 403; POS safe logging hardened. | Draft, payment, KOT, bill/receipt, offline recovery, and cashier device smoke. |
| Tables / QR Ordering | `/owner/tables` protected; tables API GET/POST/PATCH/DELETE expected 403; table errors hardened. | QR generate/rotate/session/transfer/end and real device table order smoke. |
| Customers | `/owner/customers` protected; customers API expected 403. | Customer profile/detail/search workflow with owner session. |
| Menu / Master Menu | `/owner/menu` protected; owner menu and master template APIs expected 403. | Owner menu CRUD, template picker/import, image upload, import/export browser smoke. |
| Inventory / Accounting | Routes protected; inventory/accounting APIs expected 403. | Authenticated stock, adjustment, purchase, expense, ledger, and export smoke. |
| Offers | `/owner/offers` protected; offers API expected 403 and access errors hardened. | Offer create/edit/delete, active/inactive visibility, checkout applicability. |
| Settings / Payment / Communication / QR Settings | Routes protected; payment, communication, QR, diagnostics APIs expected 403. | Razorpay settings test, provider settings save, QR settings, diagnostics. |
| Staff | `/owner/employees` protected; staff API expected 403. | Staff create/update/delete, permissions, role-specific navigation smoke. |
| Printer | `/owner/printers` protected; printer API expected 403. | 58mm/80mm/A4 bill, receipt, KOT, split receipt, duplicate, reprint hardware smoke. |

### Enterprise Hardening Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `npm run smoke:operational` | Passed |
| Local owner route probe | Passed: `/owner/login` 200 and 25 protected routes 307 to owner login. |
| Local owner API probe | Passed: 58 checked owner API methods returned expected unauthenticated/auth-validation statuses. |
| Hosted route probe | Passed reachability/security expectations for checked unauthenticated routes: public/auth routes 200, protected owner routes 307, owner APIs 403/405, provider routes safe validation/auth responses, and no unexpected 404/500. |
| Hosted provider reachability | Partial only: Cloudinary signature route reachable; Razorpay/WhatsApp/OTP/order-notification routes reject unauthenticated or invalid requests safely. Real send/upload/payment/webhook smoke remains manual. |
| Firestore rules/index review | Passed local static review: release collections have explicit allow/deny rules and operational indexes are present. Firebase project deploy/diagnostics remain manual. |
| Local `/api/release-info` | Passed after build/start: `deploymentEnvironment: production` and `applicationVersion: v1.0.0-rc2`. |
| Hosted `/api/release-info` | Blocked for signoff: reports `fe069b609009b8a042f58d1143407998407f3c64`, `applicationVersion: 0.1.0`, not local hardening HEAD, and env is still `development`. |
| `cmd /c npm run validate:prod-env` | Failed locally: missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `DATABASE_ALERT_EMAIL`; `NEXT_PUBLIC_APP_URL` must use `https://`. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

### Release Closure Blockers

| Gate | Status | Next Action |
| --- | --- | --- |
| GitHub / Hostinger current commit | Blocked | Push hardening HEAD, redeploy Hostinger, clear cache, and verify `/api/release-info` matches final commit. |
| Production env | Blocked | Set `NEXT_PUBLIC_APP_ENV=production`, HTTPS `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc2`, Firebase Admin, VAPID, `TABLE_QR_SECRET`, and `DATABASE_ALERT_EMAIL` in Hostinger/production. |
| Release metadata | Blocked on redeploy | Hosted `/api/release-info` must report final hardening commit, `deploymentEnvironment: production`, and `applicationVersion: v1.0.0-rc2`. |
| Authenticated owner workflow | Manual | Run login to dashboard/orders/Kitchen/POS/tables/menu/inventory/accounting/settings/staff/printer/notifications/logout with real owner credentials. |
| Providers | Manual/provider | Smoke SMTP, Razorpay, WhatsApp/SMS/push, Cloudinary, Mapbox, Google OAuth with real credentials. |
| Hardware/device | Manual | Smoke printers, cashier tablet, Kitchen tablet/TV, mobile QR, and multi-device realtime. |

## Owner Module Operational Excellence - Runtime Ownership - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Owner/admin runtime optimization only. Existing owner orders, Kitchen, POS, menu, settings, staff, offers, admin, support, offline sync, Cloudinary upload, WhatsApp share, APIs, repositories, Firestore collections, schema, and business workflows were preserved. |
| Tracker Gate | First unfinished owner gate `MAN-001` remains manual because password-protected view-switch verification requires owner credentials and an authenticated browser session. |
| Toast Runtime | Added `src/lib/client-toast.ts` as a lazy client toast facade. Owner/admin action-only toast calls now load `react-hot-toast` only when a toast action executes. |
| Sarva Notifications | Owner Orders and Kitchen now lazy-load `showSarvaNotification` from the existing toaster module on notification display, preserving existing notification payloads/actions without adding a listener or provider. |
| Shared Helpers | Owner/admin shared helpers for Cloudinary upload, offline sync, support inbox, loyalty rules, operational view switching, POS, tables, menu, settings, and WhatsApp share now use the lazy toast facade where safe. |
| Analyzer Probe | Initial `react-hot-toast` is absent from checked owner/admin operational initial chunks; remaining initial toast ownership is limited to unrelated customer/auth routes. Initial `xlsx` and Mapbox probes remain absent. |
| Validation | `npm run typecheck`, `npm run lint`, `npm run build`, `npm run analyze`, and `git diff --check` passed. Build retains the existing Firebase/protobuf dynamic dependency warning. |
| Remaining Work | Hosted browser smoke, owner password view-switch verification, provider checks, hardware/printer checks, and Hostinger production env/redeploy remain manual gates. |

## RC Performance Phase 3 Runtime and Core Web Vitals Optimization - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Runtime/Core Web Vitals optimization only. Existing UI, APIs, repositories, Firestore collections, schema, auth, payment, POS, Kitchen, owner, admin, and customer workflows were preserved. |
| Route Streaming | Added route-level skeleton loading files for major customer, owner, Kitchen, POS, and admin routes. Full-screen splash fallbacks were replaced with layout-matching skeletons to reserve final space and reduce CLS risk. |
| Client Boundaries | Customer home, restaurant listing, restaurant menu, checkout form/summary, owner orders, owner menu, and POS now load through page-level dynamic boundaries with scoped skeleton fallbacks. |
| Runtime Deferral | Added `IdleMount`; PWA registration, push provider, and analytics diagnostics now initialize after idle while auth/session, Firestore hydration, alerts, and toasts remain route-owned. |
| Diagnostics | Runtime diagnostics now respect `NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS`; LCP/CLS final reporting, INP event timing, hydration warning detection, slow fetch/long-task monitoring, and development-only memory sampling are cleanup-safe. |
| Owner/Admin Toasts | Owner/admin action-only toast imports now route through the lazy `client-toast` facade; Owner Orders and Kitchen lazy-load Sarva notifications on demand. |
| Images / Network | Added targeted preconnects for Cloudinary/Firebase image origins and conditional Google Analytics; removed duplicate above-the-fold hero preloads from customer home and restaurant desktop carousel paths. |
| Render Work | Added `content-visibility` and `contain` utilities for repeated restaurant cards, home cards, dish cards, and shared table scroll regions. |
| Large Lists | Shared `AdvancedDataTable` now memoizes searchable columns and uses deferred search input to reduce synchronous table filtering/sorting work. |
| Realtime Audit | Public customer data already uses cached fetch/in-flight dedupe, not direct realtime listeners. No realtime listener, polling loop, API route, or Firestore collection was added. |

### Phase 3 Bundle Results

| Entry / Route | Phase 2 Parsed | Phase 3 Parsed | Result |
| --- | ---: | ---: | --- |
| `app/layout` | `9.4 KB` | `9.4 KB` | Root shell stayed minimal. |
| `/` | `951.8 KB` | `936.6 KB` | Initial home route no longer includes initial `react-hot-toast`. |
| `/restaurants` | `938.4 KB` | `923.1 KB` | Route flow split with skeleton fallback. |
| `/restaurant/[slug]` | `1057.4 KB` | `1053.9 KB` | Detail route skeleton boundary added; flow remains interactive-heavy. |
| `/restaurant/[slug]/menu` | Not separately recorded in Phase 2 | `288.1 KB` | Menu flow now loads outside the initial route shell. |
| `/checkout` | `1015.3 KB` | `1000.2 KB` | Checkout form/summary split. |
| `/profile` | `1540.1 KB` | `1536.4 KB` | Still the largest customer route. |
| `/owner/layout` | `225.2 KB` | `209.7 KB` | Dashboard runtime defers idle-only providers. |
| `/admin/layout` | `225.2 KB` | `209.7 KB` | Same dashboard runtime deferral. |
| `/owner/menu` | `992.8 KB` | `985.3 KB` | Import/export isolation preserved. |
| `/owner/pos` | `70.6 KB` | `30.5 KB` | POS shell remains light while the flow stays client-only. |
| `/owner/kitchen` | `128.0 KB` | `128.4 KB` | KDS isolation preserved. |
| `/admin/menu-library` | `91.6 KB` | `91.9 KB` | Initial route still excludes `xlsx`. |

### Phase 3 Validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `npm run analyze` | Passed and regenerated analyzer reports. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| Initial Mapbox probe | Passed for checked public/customer and dashboard routes. |
| Initial `xlsx` probe | Passed for checked public/customer routes, `/owner/menu`, and `/admin/menu-library`. |
| Initial public toast probe | Passed for `/`, `/restaurants`, `/restaurant/[slug]/menu`, and `/checkout`. |
| Initial owner/admin toast probe | Passed for checked owner/admin operational routes; remaining initial toast chunks are customer/auth scoped. |

### Phase 3 Remaining Work

| Area | Next Action |
| --- | --- |
| Lighthouse | Redeploy current commit with production env and rerun Lighthouse/Core Web Vitals. Hosted baseline remains stale and cannot validate Phase 3 until Hostinger serves current code. |
| Profile | Split profile by existing tabs/actions without redesign. |
| Owner Menu | Continue splitting heavy sections/actions after import/export browser smoke. |
| Browser Smoke | Verify skeleton CLS, route transitions, PWA/push idle startup, diagnostics flag, and first-input responsiveness on target mobile devices. |

## RC Performance Phase 2 Enterprise Performance Optimization - 2026-07-07

| Field | Result |
| --- | --- |
| Scope | Performance optimization only. Existing UI, APIs, repositories, Firestore collections, schema, auth flows, payment flows, POS, Kitchen, owner, admin, and customer business workflows were preserved. |
| Root Runtime | `src/app/layout.tsx` now keeps only theme/i18n and route children; Mapbox, PWA, push, auth bridge, Firestore hydrator, sync, toaster, alert, and analytics are no longer mounted globally from the root layout. |
| Route Runtime | Customer and dashboard shells now own runtime providers; non-visual providers load through dynamic client chunks so route shells are no longer forced through the root app shell. |
| Fonts | Google Fonts CSS `@import` was removed from `themes/shared-typography.css`; Inter and Plus Jakarta Sans now load through `next/font/google` with matching weights, subsets, CSS variables, and `display: swap`. |
| Mapbox | Global `mapbox-gl` CSS was removed. Mapbox map canvas and stylesheet now load only through the map component path, and checked public/customer/owner/admin non-map route entrypoints do not include initial Mapbox. |
| Heavy Imports | Client `xlsx` usage in Owner Menu and Admin Menu Library now loads only during import/export actions; checked `/owner/menu` and `/admin/menu-library` entrypoints do not include initial `xlsx`. |
| Profile | Address autocomplete/map lookup is now lazy-loaded inside the profile address surface instead of carrying map runtime ownership across the whole profile page. |
| Runtime Images | Shared loading logo and Admin CMS preview now use `next/image`; print-window QR HTML remains intentionally raw. |
| Client Boundaries | Removed unnecessary `use client` from pure printing/POS/admin presentational files; client-marked file count is now `172`, down from the Phase 1 `175`. |
| Stack Auth | Dependency review found a single installed `@stackframe/*` version family, so the Phase 1 duplicate signal was treated as analyzer aggregation and auth behavior was left unchanged. |

### Phase 2 Bundle Results

| Entry / Route | Phase 1 Parsed | Phase 2 Parsed | Result |
| --- | ---: | ---: | --- |
| `app/layout` | Not recorded | `9.4 KB` | Root provider cost removed. |
| `/owner/layout` | Not recorded | `225.2 KB` | Dashboard runtime route-scoped. |
| `/admin/layout` | Not recorded | `225.2 KB` | Dashboard runtime route-scoped. |
| `/owner/menu` | `1391.1 KB` | `992.8 KB` | Reduced by `398.3 KB` parsed and `134.9 KB` gzip. |
| `/owner/pos` | `70.6 KB` | `70.6 KB` | Good isolation preserved. |
| `/owner/kitchen` | `128.0 KB` | `128.0 KB` | Good isolation preserved. |
| `/admin/menu-library` | Not recorded | `91.6 KB` | Initial route excludes `xlsx`. |
| `/profile` | `1404.6 KB` | `1540.1 KB` | Still the highest customer route; deeper tab splitting remains. |

### Phase 2 Validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `npm run analyze` | Passed and regenerated analyzer reports. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| Initial Mapbox probe | Passed for checked non-map routes. |
| Initial `xlsx` probe | Passed for checked customer routes, `/owner/menu`, and `/admin/menu-library`. |

### Phase 2 Remaining Work

| Area | Next Action |
| --- | --- |
| Lighthouse | Redeploy current commit with production env and rerun Lighthouse; hosted baseline remains stale and cannot validate Phase 2 until Hostinger serves current code. |
| Profile | Split profile by existing tabs/actions without redesign. |
| Owner Menu | Continue splitting heavy sections/actions after import/export browser smoke. |
| Shared Chunks | Review broad customer/auth chunks, `framer-motion`, `react-hot-toast`, and lucide route ownership in the next performance pass. |
| Build Warning | Existing Firebase/protobuf warning remains tracked separately from this performance optimization. |

## RC Performance Phase 1 Enterprise Performance Audit - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Audit/tooling only. No UI/UX redesign, feature removal, business logic change, API duplication, repository creation, Firestore collection change, or schema change. |
| Analyzer | Added `@next/bundle-analyzer` and gated it in `next.config.ts` behind `ANALYZE=true`; added `npm run analyze` wrapper for future reports. |
| Analyzer Reports | Generated locally under `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html`; parsed audit notes are documented in `docs/performance-audit.md`. |
| Hosted Lighthouse | Mobile score `10`, desktop score `52` on `https://violet-squid-380447.hostingersite.com`; this is a stale-deploy baseline because Hostinger serves `83885e01585510f8c833436e964b0d76002f6516` with env `development`. |
| Main Lighthouse Risks | Mobile LCP `12.8s`, CLS `0.863`, TBT `1900ms`, TTI `12.9s`, Speed Index `7.6s`, main-thread work `6.4s`, JS bootup `4.0s`, and unused JS savings about `529 KiB`. |
| Largest Client Chunk | Mapbox chunk `static/chunks/c36f3faa...js` at `1704.4 KB` parsed / `459.9 KB` gzip. |
| Largest Shared Customer Chunk | `static/chunks/02df5fe5...js` at `238.5 KB` parsed / `70.5 KB` gzip, used across public/customer pages. |
| Heaviest Route | `/profile` at `1404.6 KB` parsed / `402.5 KB` gzip and `/owner/menu` at `1391.1 KB` parsed / `443.3 KB` gzip. |
| Best Isolated Operational Routes | `/owner/pos` at `70.6 KB` parsed / `24.8 KB` gzip and `/owner/kitchen` at `128.0 KB` parsed / `38.0 KB` gzip. |
| Package Hotspots | `@stackframe/*`, `mapbox-gl`, `react-hot-toast`, `lucide-react`, `rrweb`, `framer-motion`, `xlsx`, `@firebase/firestore`, and `firebase`. |
| Duplicate Candidates | Lockfile scan found duplicate-version candidates for `@stackframe/*`, several `@radix-ui/*` packages, `qrcode`, Google Cloud dependencies, and tooling-only packages; treat as directional until dependency tree review. |
| Source Hotspots | Global providers in `src/app/layout.tsx`, global `mapbox-gl` CSS import, Google Fonts CSS import in `themes/shared-typography.css`, 175 client-marked files, and runtime React `<img>` in `page-state` and Admin CMS preview. |
| Validation | `npm run typecheck` passed; `npm run lint` passed; `npm run build` passed with existing Firebase/protobuf dynamic dependency warning; `git diff --check` passed with Git line-ending normalization warnings only; `node --check scripts/release/run-bundle-analysis.mjs` passed. |

### Phase 1 Route Bundle Matrix

| Route | Chunks | Parsed JS | Gzip JS | Finding |
| --- | ---: | ---: | ---: | --- |
| `/` | 18 | `807.8 KB` | `251.3 KB` | Heavy for customer landing. |
| `/restaurants` | 17 | `783.0 KB` | `242.8 KB` | Heavy shared customer shell. |
| `/restaurant/[slug]` | 21 | `915.4 KB` | `281.7 KB` | Restaurant detail route plus shared chunks. |
| `/checkout` | 22 | `860.0 KB` | `270.4 KB` | High but expected to stay interactive. |
| `/orders` | 16 | `783.5 KB` | `243.5 KB` | Heavy shared customer shell. |
| `/profile` | 22 | `1404.6 KB` | `402.5 KB` | Highest customer/account route. |
| `/owner` | 19 | `928.5 KB` | `292.5 KB` | Heavy owner entry. |
| `/owner/dashboard` | 1 | `0.5 KB` | `0.3 KB` | Very light route shell. |
| `/owner/orders` | 15 | `735.0 KB` | `228.1 KB` | Moderate-heavy operational route. |
| `/owner/pos` | 6 | `70.6 KB` | `24.8 KB` | Good isolation. |
| `/owner/kitchen` | 6 | `128.0 KB` | `38.0 KB` | Good isolation. |
| `/owner/menu` | 23 | `1391.1 KB` | `443.3 KB` | Highest owner route. |
| `/admin` | 6 | `209.5 KB` | `69.4 KB` | Reasonable admin shell. |

### Phase 2 Optimization Queue

| Priority | Work | Notes |
| --- | --- | --- |
| P0 | Redeploy current branch with production env and rerun Lighthouse. | Current hosted measurements are stale and env reports `development`. |
| P0 | Route-scope global providers only where safe. | Preserve PWA, auth, offline, push, toast, and analytics behavior. |
| P0 | Replace CSS Google Fonts import with `next/font`. | Keep the same Inter and Plus Jakarta Sans families/weights. |
| P1 | Dynamically import `xlsx` for import/export actions. | Owner Menu and Admin Menu Library smoke required. |
| P1 | Audit `@stackframe/*` usage and duplicate versions. | Auth and handler routes must not regress. |
| P1 | Keep Mapbox runtime/CSS off non-map critical routes if safe. | Map widgets and location flows need browser smoke. |
| P1 | Reduce broad `framer-motion` initial usage or use route-local lazy motion. | Preserve existing animations/accessibility; no redesign. |
| P2 | Review icon import/package optimizer behavior. | Keep lucide icons; reduce route chunk weight only if safe. |
| P2 | Split profile and owner menu code by existing tab/action boundaries. | No UI redesign or workflow change. |
| P2 | Review main CSS output. | Requires visual regression checks. |

### Performance Manual Gates

| Gate | Required Before Performance Signoff |
| --- | --- |
| Hostinger | Correct env to production, redeploy current branch, clear cache, and rerun Lighthouse on the current commit. |
| Browser Smoke | Recheck customer landing, restaurants, restaurant detail, checkout, orders, profile, owner, POS, Kitchen, menu, and admin after any optimization. |
| Provider/Device | Keep provider, auth, maps, PWA, push, and printer behavior unchanged during performance work. |

## RC Phase 1 Production Deployment Verification - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Production deployment validation only. No application code, UI, repository, API route, Firestore collection, or business feature was changed. |
| Local Commit | `73a8a04c43a74f208dbaaefc83086940a0c4170a` on `release/production-nammude`. |
| Hosted Commit | `/api/release-info` reports `83885e01585510f8c833436e964b0d76002f6516`. |
| Deployment Status | Blocked. Hostinger is not serving local HEAD and `deploymentEnvironment` is still `development`. |
| Environment Validation | Failed locally. Missing `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, and `DATABASE_ALERT_EMAIL`; `NEXT_PUBLIC_APP_URL` is not HTTPS locally. |
| Provider Validation | Route reachability checked where possible, but real SMTP, Cloudinary upload/signature, Google OAuth sign-in, Razorpay order/verify/webhook/refund, WhatsApp send/webhook, and SMS provider validation require production credentials/provider consoles and authenticated browser smoke. |
| Production Result | Phase 1 cannot be signed off until Hostinger env is corrected, latest commit is redeployed, cache is cleared, `/api/release-info` reports `73a8a04c43a74f208dbaaefc83086940a0c4170a`, robots is rechecked, and provider smoke passes. |

### Phase 1 Validation Matrix

| Area | Status | Evidence / Next Action |
| --- | --- | --- |
| Hostinger | Blocked | Hosted release metadata serves `83885e01585510f8c833436e964b0d76002f6516`, not `73a8a04c43a74f208dbaaefc83086940a0c4170a`; redeploy current branch and clear cache. |
| Environment variables | Failed local validation | `cmd /c npm run validate:prod-env` failed for missing production app env, Firebase VAPID, Firebase Admin credentials, database alert email, and HTTPS app URL. |
| Firebase Admin credentials | Failed local validation / manual hosted check required | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` are missing locally; verify real Hostinger values and Admin diagnostics after redeploy. |
| Firebase Client configuration | Partial / manual hosted check required | Public Firebase vars are present locally except `NEXT_PUBLIC_FIREBASE_VAPID_KEY`; verify hosted client config, VAPID, authorized domains, and rules/index deploy. |
| SMTP | Env present locally / send smoke manual | Local validator did not flag SMTP vars, but OTP, owner credential, order, and outage email sends require real provider smoke. |
| Cloudinary | Route reachable / upload smoke manual | `/api/cloudinary/signature` returns expected wrong-method `405`; verify real signature and upload flow with production credentials. |
| Google OAuth | Env present locally / browser smoke manual | Public/server OAuth ids are configured locally; verify hosted authorized domains and sign-in. |
| Razorpay | Route reachable / provider smoke manual | `/api/payments/razorpay/order` returns expected wrong-method `405`; verify order, checkout, signature verify, webhook, refund, and settlement with Razorpay dashboard. |
| WhatsApp | Routes reachable / provider smoke manual | `/api/whatsapp/send` returns expected wrong-method `405`; `/api/whatsapp/webhook` returns expected unauthenticated `403`; verify Meta token, phone id, webhook verify token, send, and webhook logging. |
| SMS | Provider/manual gated | No production SMS provider smoke can be completed from this workspace; select/configure provider before launch. |

### Hosted Route Checks

| Route / Check | Result |
| --- | --- |
| `/api/release-info` | Fail for release signoff: commit `83885e01585510f8c833436e964b0d76002f6516`, env `development`. |
| `/` | 200 OK with no-store and security headers. |
| `/restaurants` | 200 OK with no-store and security headers. |
| `/checkout` | 200 OK with no-store and security headers. |
| `/owner/login` | 200 OK. |
| `/admin/login` | 200 OK. |
| `/owner/dashboard` | Expected 307 redirect to owner login. |
| `/owner/kitchen` | Expected 307 redirect to owner login. |
| `/owner/pos` | Expected 307 redirect to owner login. |
| `/api/owner/orders` | Expected unauthenticated 403. |
| `/api/owner/kitchen` | Expected unauthenticated 403. |
| `/api/customer/orders` | Expected unauthenticated 403. |
| `/robots.txt` | Fail for release signoff: hosted body still blocks Googlebot; recheck after Hostinger redeploy/cache clear. |
| `/sitemap.xml` | 200 OK, XML content type. |
| `/manifest.json` | 200 OK, JSON content type. |

### Phase 1 Manual Gates

| Gate | Required Before Signoff |
| --- | --- |
| Hostinger | Set production env, restart/redeploy, clear cache, and verify `/api/release-info` serves `73a8a04c43a74f208dbaaefc83086940a0c4170a` with `deploymentEnvironment: production`. |
| Firebase | Verify Admin SDK credentials, client config, VAPID key, authorized domains, Firestore rules, and indexes in the target project. |
| Providers | Smoke SMTP, Cloudinary, Google OAuth, Razorpay, WhatsApp, and SMS only with real production/sandbox provider credentials. |
| Browser / Device | Run authenticated owner/customer/admin/POS/Kitchen/QR checks after the corrected deployment. |

## UI/UX Optimization Sprint - 2026-07-06

| Area | Status | Notes |
| --- | --- | --- |
| Active Orders redesign | Complete | Owner Active Orders now use compact operational rows with priority order number, kitchen status, ETA, items, payment, type/table, placed time, Open, and lazy More actions. |
| Kitchen redesign | Complete | Kitchen cards are denser, four-column desktop board remains, mobile/tablet cards are compact, and customer/payment/waiter/station/timeline details are collapsed by default. |
| Shared SarvaNotification | Complete | Existing `SarvaNotification` remains the single toast component; new-order and waiter-ready alerts reuse it with native-style motion and reduced-motion support. |
| Order number consistency | Complete in touched surfaces | Shared display helper now returns `#0000` style numbers and print/bill/KOT/search/owner/POS/kitchen touched surfaces avoid displaying Firestore document IDs. |
| Waiter notification workflow | Complete | Kitchen `ready` status triggers a top-right `Order Ready` notification with order number, table/type, and View action without adding listeners. |
| Push notification readiness | Code-ready / provider pending | FCM foreground/background handlers, permission UI, token storage in `user_preferences`, token refresh, invalid-token cleanup, notification click deep links, sounds, badges, and server dispatch hooks are implemented. Production requires Firebase Web Push VAPID key, rules deploy, and device smoke. |
| Performance optimization summary | Complete | No new Firestore listeners, route families, collections, or subscriptions were added; Active Orders search and ready sorting use the existing memoized read model, long history remains paged, and incremental KOT merge runs only on status update. |
| Responsive verification | Code-ready | Owner/POS rows collapse to stacked mobile rows; Kitchen keeps 4 desktop columns, mobile compact cards, and touch-size controls. Manual device smoke remains required. |
| Files modified | Complete | `src/lib/order-state-machine.ts`, `src/lib/server/operation-idempotency.ts`, `src/lib/server/operational-logging.ts`, `src/repositories/order-repository.ts`, `src/repositories/kitchen-repository.ts`, `src/app/api/owner/orders/route.ts`, `src/app/api/owner/kitchen/route.ts`, `src/types/firebase.ts`, `src/types/entities.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/components/flows/printer-settings-flow.tsx`, `scripts/release/operational-hardening-smoke.mjs`, `package.json`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`, plus prior pass files `src/lib/order-display.ts`, `src/lib/print-engine.ts`, `src/lib/operational-api-mappers.ts`, `src/components/flows/owner-order-management-flow.tsx`, `src/components/flows/kitchen-display-flow.tsx`, `src/components/ui/app-toaster.tsx`, `src/components/layout/dashboard-topbar.tsx`, and `src/app/globals.css`. |

## Final Operational Workflow and UX Stabilization - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Targeted UX/workflow patch only. Existing POS, Kitchen, owner orders, repositories, APIs, Firestore collections, realtime listeners, print engine, timeline, audit, and incremental KOT logic were preserved. |
| Active Orders | Complete. Active Orders now has a compact header with segmented Operations/Waiter/Cashier/Manager controls, no descriptive subtitle, compact rows, status progress, waiter/table/payment/item summary, expandable details, and a 30-order active cap. |
| More Menu | Complete. Active Order More actions now render through a fixed portal with edge repositioning, high z-index, desktop/tablet contextual menu, mobile bottom sheet, Escape/outside close, and icons for open, kitchen, print bill, print receipt, print KOT, add items, collect payment, serve, split, merge, transfer, timeline, history, reminder, complete, and cancel. |
| Payment / Incremental KOT | Verified code path. Continue payment uses the existing owner orders payment action and does not call the Kitchen send path. Existing `incrementalLines` remains the only add-items-after-ready Kitchen generation path, so only newly added quantities create a rush incremental KOT. |
| Waiter Ready Flow | Complete. Waiter View opens into Ready To Serve, removes Kitchen Queue navigation, hides broader Kitchen feature navigation for waiter operational view, and shows ready orders as compact green accordions with table/order/ETA/elapsed/payment plus Serve, Open, Collect, Add, Bill, Timeline, and History actions. |
| Notifications | Complete. Kitchen ready status now triggers a persistent green SarvaNotification with Open, Serve, Collect, and Dismiss actions; duplicate ready notifications reuse the same toast id. Persistent SarvaNotification cards no longer render invalid progress timing. |
| Kitchen Density | Complete. Desktop Kitchen cards keep customer/payment/waiter/station/timeline inside Details, reduce padding and item spacing, cap visible items with a small `+n more` expander, and preserve the four-column board and existing SSE cleanup. |
| Navigation / History | Complete. POS Past Orders is renamed to Order History, the Past Orders badge is removed, Waiter View no longer shows Kitchen Queue, and Order History now has Today, Yesterday, Week, Month, Custom date range, search, and status filters. |
| Known Limitation | Completed-bill correction is now implemented through the existing owner orders API/repository with immutable correction versions; production smoke with authenticated owner/manager sessions remains manual. |
| Verification | `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Build retains the known Firebase/protobuf dynamic dependency warning. |
| Production Readiness | 98% production-release ready pending Hostinger env correction/redeploy, authenticated browser smoke, provider checks, Firebase rules/indexes, and printer/device validation. |

## Final Operational Stabilization, Audit, and Payment Safety - 2026-07-06

### Completed Features

| Area | Result |
| --- | --- |
| Bill Correction | Completed. Owner/manager-only completed bill correction now uses the existing owner orders API and `OrderRepository`, requires a reason, stores immutable correction versions, captures before/after/diff snapshots, and mirrors corrected totals to `orders` and `customerOrders` without adding collections. |
| Audit Flow | Completed. Correction, payment start, payment unlock, payment complete, print, split, merge, transfer, and incremental KOT merge events write existing audit timeline/status history/audit log records with user, role, device/terminal, IP when available, timestamp, reason, and operational metadata. |
| Payment Safety | Completed. Active payment now opens a verify step before collection, writes a payment-start lock, validates Kitchen readiness, and never calls Kitchen send/reopen paths. |
| Payment Lock | Completed. Once payment starts, POS edit reopening is blocked; owner-only unlock requires a reason and writes `payment_unlock` history before edits are allowed. |
| Incremental KOT Merge | Completed. Add-items-after-ready still sends only newly added lines as rush incremental KOT; when the child KOT reaches `ready`, the Kitchen repository merges those lines once into the parent ticket and linked canonical/customer order with audit history. |
| Order Details Drawer | Completed. Active Order Open now uses a right-side drawer with summary, customer, items, kitchen/payment/audit timeline, corrections, print history, notes, and actions. |
| Print History | Completed. Bill/KOT/receipt print records now include print number, reason, user, device, and browser printer marker in the existing `printLogs` and timeline paths. |
| Active Order Search | Completed. Active Orders now search order number, invoice/bill number, table, customer, phone, item, waiter/staff, source/type, delivery partner, vehicle, and QR table fields against the existing memoized read model. |
| Status Colors | Completed in touched POS surfaces. New blue, Accepted orange, Preparing yellow, Ready green, Served teal, Billing purple, Paid dark green, and Cancelled red are standardized through a shared POS status tone helper used by rows and timeline entries. |
| Waiter Ready Panel | Completed. Ready orders sort longest-waiting first, show ready since/SLA/payment pending/priority, blink for the first minute, then fall back to pulse, and retain Serve/Open/Collect/Add/Bill/Timeline/History actions. |

### Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

### Workflow Diagram

```text
Active/Past Order
  -> Open Details Drawer
  -> Inspect summary, items, timeline, payments, corrections, prints
  -> Add Items / Print / Collect / Correct based on role and order state
```

### Audit Flow

```text
Operational action
  -> Existing owner/kitchen API
  -> Repository transaction
  -> order auditTimeline + statusHistory
  -> auditLogs record
  -> optional notification / printLog / paymentTransaction
```

### Correction Flow

```text
Order History
  -> Open completed order
  -> Correct Bill
  -> Mandatory reason
  -> Preview original -> corrected totals and item changes
  -> Confirm
  -> Correction #n stored immutably with before/after/diff
```

### Payment Lock Flow

```text
Ready/served order
  -> Collect
  -> Verify order/table/customer/items/total/method
  -> payment_started lock
  -> Record payment
  -> payment_completed or partial_payment
  -> Owner unlock with reason only if edits are needed
```

### Known Limitations

| Area | Limitation |
| --- | --- |
| Production Smoke | Authenticated owner/manager/waiter/cashier browser smoke remains manual. |
| Hardware | Real 58mm/80mm/A4 print output, KOT reprint, and browser print behavior remain device/printer dependent. |
| Permissions UI | Bill-correction permission is enforced by role/API and optional permission string; a dedicated owner settings toggle remains future enhancement. |
| Provider Gates | Razorpay, SMTP, WhatsApp/SMS/push, Firebase rules/index deploy, and Hostinger env/redeploy remain external/manual. |

### Future Enhancements

| Area | Future Work |
| --- | --- |
| Correction UX | Add a richer line-add/remove editor and manager approval queue if restaurant policy requires multi-step approval. |
| Print Profiles | Attach real selected printer profile names to print history when browser/printer adapter selection is available. |
| Analytics | Add correction/refund/payment-lock aggregate reporting after the aggregate analytics design is approved. |
| E2E | Add focused Playwright coverage for correction, payment lock, incremental KOT merge, and drawer history after test strategy approval. |

## Production Hardening, Consistency, Security, and Observability - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Production hardening only. No workflow redesign, new Firestore collection, duplicate API, duplicate repository, or new realtime listener was added. |
| Architecture Status | Existing POS, Owner Orders, Kitchen, print, audit, payment, notification, and customer history paths remain repository-first. Shared validation now lives in `src/lib/order-state-machine.ts`; idempotency and structured logs live under `src/lib/server`. |
| State Validation | Completed. Order/Kitchen transitions now use a shared state machine for legal status flow, payment-start readiness, refund/correction constraints, and illegal transition blocking. |
| Idempotency | Completed. Owner order and Kitchen create/update actions accept deterministic `operationKey` values and persist them in existing order/Kitchen documents through `operationKeys`, so double-clicks, retries, and multi-tab submits safely return the current result. |
| Firestore Transactions | Completed. Payment, refund, payment lock/unlock, correction, print, split, transfer, merge, order status, operational events, Kitchen updates, and incremental KOT parent/order/customer merge now use transaction paths for coordinated writes. |
| Offline / Recovery | Completed in POS. POS shows Synchronizing, Retrying, Offline, and Changes Pending states, refreshes after reconnect, stores interrupted payment collection in session storage, and avoids duplicate retry side effects through operation keys. |
| Print Lifecycle | Completed. Print records now track queued, printing, success, failed, retry, and cancelled-compatible lifecycle states, printer response metadata, print number, user/device, timeline, audit log, and print log in existing collections. |
| Observability | Completed. Owner order and Kitchen mutations write sanitized structured logs with action, tenant/order/kitchen ids, role, duration, outcome, and safe failure reason. |
| Security Review | Completed for touched APIs. Owner order/Kitchen mutations keep server-side auth, feature permission checks, tenant scoping, input validation, safe error mapping, and sanitized logs. |
| Performance Review | Completed. No new listeners, polling loops, collection scans, routes, or collections were introduced. POS reconnect uses the existing bounded POS read model refresh. |
| Firestore Index Review | No new composite index required. Existing single-document updates and the existing `orders.where("kitchenOrderId", "==")` lookup remain within current query patterns; production index deploy state remains manual. |
| Automated Smoke | Added `npm run smoke:operational` for static release smoke of state-machine, idempotency, transaction, logging, and POS recovery guardrails. |
| Production Readiness | 99% code-ready; 98% production-release ready pending external env, hosted redeploy, Firestore deploy verification, provider, authenticated browser, multi-device, and printer smoke. |

### Operational State Diagram

```text
New / Created
  -> Accepted
  -> Preparing
  -> Ready
  -> Served
  -> Payment Started
  -> Paid
  -> Completed / Delivered

Allowed side states:
  Cancelled / Rejected before payment
  Refunded after paid payment record
  Corrected only after completed or delivered bill
```

### Repository Flow

```text
POS / Owner / Kitchen UI
  -> Existing owner POS / orders / kitchen API
  -> Shared order state machine
  -> Repository transaction
  -> orders + customerOrders + kitchenOrders when linked
  -> auditLogs + statusHistory + auditTimeline
  -> printLogs / paymentTransactions / notifications when applicable
```

### Transaction Boundaries

| Operation | Transaction / Boundary |
| --- | --- |
| Payment / refund | `orders`, `customerOrders`, linked `kitchenOrders`, `paymentTransactions`, receipt print queue, audit, notification. |
| Payment lock / unlock | `orders`, `customerOrders`, audit timeline, status history, audit log. |
| Bill correction | `orders`, `customerOrders`, immutable correction record, audit timeline, status history, audit log, notification. |
| Print | `orders`, `customerOrders`, `printLogs`, audit timeline, payment timeline for bill/receipt, audit log. |
| Split / transfer / merge | Existing order/customer/Kitchen documents plus payment, print, audit, and notification records. |
| Incremental KOT merge | Parent `kitchenOrders`, linked `orders`, and linked `customerOrders` merge once through `incrementalKitchenOrderIds`. |

### Release Checklist

| Area | Status |
| --- | --- |
| Local validation | Passed: `npm run smoke:operational`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. |
| Hosted deploy | Manual pending after commit push. |
| Firestore rules/indexes | Manual deploy verification required; no new collection or composite index added. |
| Provider smoke | Razorpay, SMTP, WhatsApp/SMS/push, Cloudinary, Mapbox, Google OAuth remain external/manual. |
| Device/printer smoke | Manual hardware checks remain required for 58mm/80mm/A4, browser print dialogs, and recovery after printer offline. |

### Known Limitations

| Area | Limitation |
| --- | --- |
| Browser-only print recovery | Browser print APIs do not expose real hardware ACK/NACK; printer response is a browser marker until a printer adapter provides hardware response. |
| Authenticated E2E | Automated smoke is static/local. Full customer-owner-Kitchen-POS E2E still requires authenticated fixtures and provider/hardware access. |
| Production ops | Hostinger env, cache clear/redeploy, Firebase rules/index deploy, provider dashboards, and real-device validation remain manual. |

### Release Notes

| Area | Note |
| --- | --- |
| Operators | POS now visibly reports sync/retry/offline/pending states and restores interrupted payment collection after refresh. |
| Kitchen | Incremental KOT merge is idempotent and transaction-backed, so child tickets merge into parent/customer history once. |
| Owners / Managers | Payment, correction, print, split, transfer, merge, and status actions are safer against double-submit and concurrent updates. |
| Support | Structured logs now include action, ids, role, duration, outcome, and safe failure reason for faster release triage. |

### Definition of Done

| Requirement | Result |
| --- | --- |
| No redesign / no duplication | Met. Existing modules, APIs, repositories, and collections were reused. |
| State validation centralized | Met through `src/lib/order-state-machine.ts`. |
| Idempotent risky operations | Met for payment, print, correction, incremental KOT, status, split, transfer, merge, and timeline event paths. |
| Safe errors and logs | Met for touched owner order/Kitchen APIs. |
| Validation commands | Passed: `npm run smoke:operational`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. |

## Sprint 1 Production Readiness and Feature Completion - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Production readiness only. No completed UI was redesigned and no completed Owner, Kitchen, POS, Waiter, QR Ordering, Dashboard, Analytics, or Printing business flow was rewritten. |
| Firebase Cloud Messaging | Code-ready. Added foreground message handling, background service-worker notifications, click/deep-link routing, app badges, foreground sounds, owner notification permission control, multi-device token storage in existing `user_preferences`, token refresh, invalid-token cleanup, and server dispatch from existing notification writes. |
| Performance | Code-ready. FCM and monitoring are idle/deferred, POS/Kitchen routes avoid unrelated inventory/loyalty listeners, insecure production image URLs fall back safely, API slow/failure events are monitored, and service-worker static-only cache behavior remains Hostinger-compatible. |
| Security | Code-ready pending deploy. Firestore rules now explicitly cover approved support collections, keep OTP/payment/webhook collections server-only, restrict `user_preferences` to the signed-in user, tighten direct order/Kitchen write roles, and owner feature APIs now apply same-origin mutation checks plus rate limiting. |
| Production Monitoring | Code-ready. Client errors, unhandled rejections, slow/failing API calls, long tasks, route performance, web vitals, push delivery status, and route-level error boundaries now use the existing analytics/Sentry path. |
| Printing Verification | Code paths preserved. Bill, KOT, receipt, GST invoice, thermal, PDF export, and A4 printing paths were not redesigned; real hardware verification remains manual. |
| Known Limitations | Firebase Web Push VAPID key must be configured; Firestore rules/indexes must be deployed; Lighthouse, authenticated browser, Android/iPhone/tablet/desktop, offline, provider, and printer hardware smoke remain manual in this workspace. |
| Verification | `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Build retains the known Firebase/protobuf dynamic dependency warning. |
| Production Readiness | 96% code-ready; production release remains blocked by manual env, VAPID/provider, Firestore deploy, hosted redeploy, Lighthouse, device, offline, and printer checks. |

## Enterprise Project Dashboard

This file is now the single source of truth. `docs/TASK_TRACKER.md` is archived as a compatibility pointer and must not receive new task history.

| Field | Status |
| --- | --- |
| Overall Completion | 99% code-ready; 98% production-release ready pending manual env correction, rules, provider, hardware, and authenticated browser smoke validation. |
| Current Commit SHA | Sprint 1 production-readiness commit created locally from base `8a0315c37228918e82498ae0d7c78317d616da45`; exact final SHA reported in release handoff. |
| Production SHA | `6823c15e5a7906decf179e329b7bee1f9617dd28` currently served on Hostinger |
| Hostinger SHA | `6823c15e5a7906decf179e329b7bee1f9617dd28` verified by `/api/release-info` |
| Validation Status | Local typecheck, lint, build, and diff check passed; hosted metadata matches branch head; full authenticated browser/provider/hardware smoke and production env readiness remain blocked/manual. |
| Last Updated | 2026-07-06 |
| Next Sprint | Do not start Enterprise Hardening until latest code is pushed, Hostinger serves branch head, production smoke passes, and no P0/P1 bugs remain. |
| Estimated Remaining Work | 2-4 days manual/provider validation for release confidence; future roadmap work remains out of release scope. |
| Priority Owner | Manual for production access tasks; Codex only for confirmed bugs discovered during testing. |

### Phase Completion

| Phase | Completion | Status | Remaining Work |
| --- | --- | --- | --- |
| Architecture and repository migration | 100% | Completed | Maintain repository-first rules. |
| Customer module stabilization | 96% | Code-ready | Manual mobile/browser/provider smoke. |
| Owner operations | 98% | Code-ready | Manual view-switch and hosted session smoke. |
| Kitchen Operations Center | 99% | Code-ready | Manual tablet/TV, SSE, sound, swipe gesture, and printer smoke. |
| POS and printing | 98% | Code-ready | Manual device/printer and cashier permission smoke. |
| QR ordering and phone verification | 97% | Code-ready | Manual device, OTP, table-session smoke. |
| Enterprise Menu Master Library | 94% | Code-ready | Manual Admin library and owner template import smoke after redeploy. |
| Admin/CMS/platform operations | 94% | Code-ready | Provider/env and admin workflow smoke. |
| Production deployment | 75% | Manual pending | Hostinger env, cache clear, redeploy, hosted route validation. |
| Provider integrations | 55% | Gated | Razorpay, WhatsApp Cloud API, SMS, Meta, push, GPS remain provider-gated. |

### Module Completion

| Module | Completion | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Customer | 96% | Stabilized | Codex + Manual | Manual browser/device and provider validation remains. |
| Restaurant public pages | 96% | Stabilized | Codex + Manual | Public cache and profile completeness guards implemented. |
| Owner | 98% | Stabilized | Codex + Manual | View-switch password verification remains manual. |
| Kitchen | 99% | Stabilized | Manual | Mobile/tablet responsive board is optimized; real printer, TV, SSE, gestures, and sound checks remain. |
| POS | 98% | Stabilized | Manual | Hardware printer/device and permission smoke remains. |
| Admin | 94% | Stabilized | Manual | Provider/env-backed workflows need hosted smoke. |
| Staff | 90% | Implemented | Manual | Live staff permission matrix smoke remains. |
| Waiter/Table | 96% | Stabilized | Manual | QR/table device smoke remains. |
| Delivery | 70% | Framework | Future | Live GPS and partner dispatch are future roadmap. |
| Accounting | 85% | Implemented | Codex + Manual | Advanced reconciliation/refund process remains. |
| Inventory | 80% | Implemented | Future | Recipe/BOM auto-deduction remains future roadmap. |
| Offers/Marketing | 94% | Implemented | Manual | WhatsApp/Meta provider hardening remains gated. |
| CRM | 90% | Implemented | Manual | Live CRM/customer workflow smoke remains. |
| Notifications | 88% | Push code-ready | Manual + Codex | Email and in-app paths exist; FCM push is code-ready pending VAPID/device smoke; SMS/WhatsApp provider adapters remain gated. |
| Analytics | 75% | Implemented/Partial | Future | Aggregate analytics strategy remains future work. |
| QR Ordering | 97% | Stabilized | Manual | Device/OTP/table lifecycle smoke remains. |
| Printing | 96% | Stabilized | Manual | Real paper/printer checks remain. |
| Phone Verification | 95% | Implemented | Manual | Firebase phone provider/device validation remains. |
| Master Menu Library | 94% | Implemented | Manual | Admin/owner import smoke remains. |

### Release Status

| Category | Status | Priority | Owner | Estimated Remaining Work |
| --- | --- | --- | --- | --- |
| In Progress | Release stabilization and manual production validation. | P0 | Manual + Codex for confirmed bugs | 2-4 days |
| Blocked | Hostinger env/cache access, SMTP/provider credentials, Firebase Console/rules access. | P0 | Manual | Access-dependent |
| Completed | QR, Kitchen, POS, Printing, Phone Verification, Owner Communication, Enterprise Menu Library, repository migration, documentation consolidation. | Done | Codex | None unless bugs found |
| Pending Features | Provider integrations, GPS, BOM, aggregate analytics, health dashboard, focused e2e suite. | P2-P3 | Manual + Codex | Future roadmap only |

### Architecture / Data / API Status

| Area | Status | Notes |
| --- | --- | --- |
| Architecture Status | Stable | No rebuilds approved; reuse existing modules and repositories. |
| Database Status | Stable with manual rule/index review pending | `masterMenuTemplates` and `phoneVerificationSessions` are now registered; rules/index deployment remains manual. |
| API Status | Stable | Public/customer/owner/admin API families are established; do not add duplicate routes. |
| Repository Status | Stable | Repository-first pattern is required for server Firestore work. |
| Security Status | Code-ready with manual checks | Auth separation, QR validation, and tenant guards are implemented; provider/env/rules validation remains manual. |
| Performance Status | Stable | Main risk is future large-flow bundle/code split work; no duplicate listener issue confirmed by current audit. |
| Testing Status | Local commands pass; focused e2e missing | Manual browser/device smoke and future e2e suite remain. |
| Deployment Status | Last validated SHA is older than current commit | Hostinger must be redeployed and `/api/release-info` verified. |
| Browser Validation Status | Manual pending | Customer, owner, admin, POS, Kitchen, QR, printer, and view-switch browser checks remain. |
| Documentation Status | Consolidated | This file is the single source of truth; `TASK_TRACKER.md` is archived. |

### Consolidated Completed History

History from `docs/TASK_TRACKER.md` has been consolidated here. High-signal completed milestones retained for future planning:

| Date | Completed Work |
| --- | --- |
| 2026-07-02 | Enterprise Menu Master Library; Kitchen Operations Center stabilization; tracker consolidation. |
| 2026-07-01 | QR session lifecycle, phone verification, menu image management, POS stabilization, bill printing, QR/table/search stabilization. |
| 2026-06-30 | QR table ordering baseline, operational view switch hardening, owner communication, customer reorder/contact workflows. |
| 2026-06-26 | Final enterprise production release baseline validated on Hostinger at SHA `35017398773ba04efbdc3ab37d250cfa547c0675`. |
| 2026-06-25 | Owner/admin/customer repository migration and production validation. |
| 2026-06-22 | Owner critical gap batch, pricing rules, Kitchen Operations Center redesign, owner labels, tracker/roadmap/changelog. |
| 2026-06-10 to 2026-06-15 | Theme system, public cache consistency, schedule later redesign, owner menu/API stability, service worker no-store guards. |
| 2026-06-01 to 2026-06-09 | Customer restaurant/menu stabilization, legal/CMS fixes, Firebase Admin key hardening, hosted Cafe diagnostics, mobile restaurant redesign. |
| 2026-05-31 | Auth session separation, baseline owner/customer/admin guardrails, public outage alert framework. |

### Unfinished Implementation Audit

Marker search performed on 2026-07-02 using `rg` for TODO/FIXME/HACK/TEMP/MOCK/STUB/PLACEHOLDER/NOT IMPLEMENTED/COMING SOON/DEMO/HARDCODED/console.log/fake/sample/dummy/legacy/deprecated/unused with build/dependency folders excluded. Many hits are intentional labels, UI placeholders, compatibility type names, or scripts. Actionable findings are:

| Severity | Finding | Evidence | Owner | Next Action |
| --- | --- | --- | --- | --- |
| Critical | Production deployment still points to older Hostinger SHA. | Metadata shows Hostinger `35017398773ba04efbdc3ab37d250cfa547c0675`, current Git `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6`. | Manual | Complete Hostinger env/cache/redeploy and verify `/api/release-info`. |
| Critical | Production env/provider access remains unverified. | MAN-002, MAN-003, MAN-004, MAN-006, MAN-007, MAN-008. | Manual | Validate Hostinger env, SMTP, Firebase domains, rules/indexes. |
| High | Cloud Functions remain placeholder-level for order confirmation, OTP hash comparison, and payment gateway secret calls. | `functions/src/index.ts` placeholder comments. | Manual + Codex | Keep disabled/gated until Cloud Functions provider review is requested. |
| High | Payment provider implementation remains partial/gated. | `src/services/payment-service.ts` placeholder; PAY-001/PAY-002. | Manual + Codex | Validate Razorpay order/verify/webhook before live launch. |
| High | Help page has a disabled “Coming soon” support action. | `src/app/help/page.tsx`. | Codex if requested | Replace only if confirmed as release-blocking UX bug. |
| Medium | Third-party delivery integration dialog appears configuration-only. | `src/components/orders/integration-dialog.tsx`. | Future | Treat as provider roadmap unless restaurant delivery aggregator launch is requested. |
| Medium | Compatibility names still include `DemoOrder`/`MockUser` and legacy mappers. | `src/types/entities.ts`, `src/lib/operational-api-mappers.ts`, owner/admin/POS compatibility paths. | Codex | Do not rename during release; plan only as future compatibility cleanup. |
| Medium | Production seed scripts retain demo/sample data paths behind flags. | `scripts/seed-firebase-production.mjs`, `SEED_SAMPLE_MENU_ITEMS`. | Manual | Keep sample flags off in production; dry-run cleanup if stale data appears. |
| Low | Dev scripts use `console.log` heavily. | `scripts/*.mjs`, HTTPS/dev utilities. | None | Acceptable for CLI scripts; not a user-facing runtime issue. |
| Low | Documentation still contains historical mock/placeholder language. | Older architecture docs. | Codex | Treat this master tracker as planning authority; update old docs only when touched. |

### Enterprise Gap Analysis

| Module | Missing / Pending Work | Priority | Owner |
| --- | --- | --- | --- |
| Customer | Manual mobile/tablet/desktop smoke; Google authorized-domain verification; SMTP/password reset provider smoke. | P1 | Manual |
| Restaurant/Public | Hosted cache/redeploy validation; stale demo/test-owner production data cleanup only if found. | P0 | Manual |
| Owner | Password-protected operational view switch browser verification. | P0 | Manual |
| Kitchen | Tablet/TV/SSE/sound/real KOT printer validation. | P1 | Manual |
| POS | Real 58mm/80mm/A4 printer output, cashier tablet ergonomics, permission smoke. | P1 | Manual |
| Admin | Hostinger/Admin CMS env and alert recipient validation; temporary password workflow provider email smoke. | P1 | Manual |
| Staff | Live role/permission matrix smoke across owner/kitchen/POS. | P2 | Manual + Codex if bug found |
| Waiter/Table | QR lifecycle smoke on real devices; session timeout/device replacement validation. | P1 | Manual |
| Delivery | Live partner GPS tracking is not implemented. | P3 | Future |
| Accounting | Refund/settlement process documentation and payment reconciliation review. | P2 | Manual + Codex |
| Inventory | Recipe/BOM auto-deduction remains future work. | P3 | Future |
| Offers/CRM | WhatsApp/Meta provider hardening and template policy remain gated. | P2 | Manual + Codex |
| Notifications | SMS, push, and WhatsApp Cloud API production adapters remain future/provider-gated. | P2-P3 | Manual + Codex |
| Analytics | Aggregate analytics collection/query strategy remains future work. | P2 | Codex |
| QR Ordering | Manual device and OTP provider smoke remains. | P1 | Manual |
| Printing | Hardware/paper/printer profile smoke remains. | P1 | Manual |
| Phone Verification | Firebase phone auth provider/device smoke remains. | P1 | Manual |
| Master Menu Library | Admin Menu Library and owner template import browser smoke remains after redeploy. | P1 | Manual |

### Next Enterprise Implementation Queue

Only unfinished work is listed. Do not start any item unless the user explicitly requests it or testing confirms it as a release blocker.

| Priority | ID | Work | Type | Owner | Estimate |
| --- | --- | --- | --- | --- | --- |
| P0 | MAN-002 | Validate Hostinger production env values. | Manual | Manual | 2-4 hours |
| P0 | MAN-006 | Clear cache, redeploy current Git SHA, verify hosted release info/routes. | Manual | Manual | 1-2 hours |
| P0 | MAN-001 | Browser-verify password-protected operational view switch. | Manual | Manual | 30 minutes |
| P0 | MAN-004 | Confirm SMTP sends for OTP, credentials, order/outage mail. | Manual | Manual | 1-2 hours |
| P1 | MAN-008 / SEC-001 | Review and deploy Firestore rules/indexes. | Manual + Codex | Manual + Codex | 0.5-1 day |
| P1 | RELEASE-SMOKE-001 | Manual customer/owner/admin/POS/Kitchen/QR/printer browser smoke after redeploy. | Manual | Manual | 0.5-1 day |
| P1 | PAY-001 | Razorpay sandbox/live order/verify/webhook validation. | Provider | Manual + Codex | 0.5 day |
| P2 | WA-001 / WA-002 | WhatsApp Cloud API provider hardening and template fallback policy. | Provider | Manual + Codex | 0.5-1 day |
| P2 | TEST-001 | Focused e2e smoke suite design. | Codex | Codex | 0.5 day |
| P2 | REPORT-001 | Aggregate analytics design. | Codex | Codex | 0.5-1 day |
| P3 | SMS/PUSH/META/DEL/INV | SMS, push, Meta, GPS delivery, inventory BOM. | Future roadmap | Manual + Codex | Later |

## 1. Executive Summary

Nammude is a Next.js App Router restaurant management and direct ordering platform with customer, owner, kitchen, waiter/table, POS, admin, delivery, marketing, accounting, printing, QR ordering, PWA, Firebase, and Hostinger deployment surfaces.

Current status: production release baseline is implemented and validated. The remaining final-release work is mostly manual deployment/configuration and external provider access.

This tracker exists to prevent duplicate implementation, duplicate APIs, duplicate repositories, duplicate Firestore collections, and accidental rewrites.

Authoritative implementation rules:

| Rule | Requirement |
| --- | --- |
| Planning source | Use this file before implementation. |
| Existing features | Document and reuse existing features; do not rewrite them. |
| Database | Do not add collections without checking `src/firebase/collections.ts`, repositories, APIs, and `docs/firestore-schema.md`. |
| APIs | Do not create a new API when an existing `/api/public`, `/api/customer`, `/api/owner`, `/api/admin`, `/api/payments`, or `/api/whatsapp` route covers the domain. |
| Repositories | Prefer `src/repositories/*` for owner/admin/server Firestore data access. |
| Services | Prefer `src/services/*` and `src/lib/server/*` for shared data/service logic. |
| UI | Reuse `src/components/ui`, `src/components/layout`, `src/components/flows`, and module components. |
| Verification | Run typecheck, lint, build, and `git diff --check` for implementation changes. |

## 2. Architecture Overview

Audit snapshot:

| Area | Count / Notes |
| --- | --- |
| `src/app` files | 190 |
| `src/components` files | 143 |
| `src/lib` files | 68 |
| `src/services` files | 31 |
| `src/modules` files | 23 |
| `src/repositories` files | 16 |
| `src/hooks` files | 15 |
| `src/stores` files | 9 |
| API route files | 65 |
| App page files | 98 |

Primary framework and runtime:

| Layer | Existing implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript 6 |
| Styling | Tailwind CSS 4, module theme tokens, shared typography |
| State | Zustand compatibility stores in `src/lib/app-store.ts`, `src/lib/cart-store.ts`, and facade exports in `src/stores` |
| Firebase client | `src/firebase/client.ts`, `src/firebase/index.ts`, `src/firebase/collections.ts` |
| Firebase admin/server | `src/firebase/admin.ts`, `src/lib/server/*`, repository classes |
| Validation | Zod schemas under `src/lib/schemas` |
| PWA | `public/sw.js`, `public/manifest.json`, `src/components/pwa/*`, offline queue utilities |
| Hosting | Hostinger production target with Firebase and Cloudinary integrations |

### Customer Module

Existing routes:

| Surface | Routes / files |
| --- | --- |
| Home and discovery | `/`, `/restaurants`, `/restaurant/[slug]` |
| Menu and item detail | `/restaurant/[slug]/menu`, `/restaurant/[slug]/item/[itemId]` |
| Cart and checkout | `/cart`, `/checkout`, `/order-success`, `/order/[id]` |
| Orders and tracking | `/orders`, `/track-order` |
| Account | `/profile`, `/account/profile`, `/account/support`, `/login`, `/signup`, `/forgot-password` |
| Offers and loyalty | `/offers`, `/loyalty` |
| Legal/help | `/terms`, `/privacy`, `/refund-policy`, `/cancellation-policy`, `/delivery-policy`, `/cookie-policy`, `/help` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Discovery | `src/components/flows/customer-discovery-home.tsx`, `src/components/flows/restaurant-browser-flow.tsx` |
| Restaurant detail/menu | `src/components/flows/restaurant-detail-flow.tsx`, `src/components/flows/customer-menu-flow.tsx` |
| Item detail | `src/components/flows/food-item-detail-flow.tsx` |
| Cart sync | `src/components/commerce/customer-cart-sync.tsx`, `src/app/api/customer/cart/route.ts` |
| Public data | `src/hooks/use-public-data.ts`, `src/services/public-data-service.ts`, `src/lib/server/public-firestore.ts` |
| Customer auth | `src/hooks/auth/use-customer-auth.ts`, `src/modules/shared/auth/customer-auth.ts` |

### Owner Module

Existing routes:

| Surface | Routes |
| --- | --- |
| Dashboard | `/owner`, `/owner/dashboard` |
| Operations | `/owner/orders`, `/owner/kitchen`, `/owner/pos`, `/owner/tables`, `/owner/printers` |
| Menu/business | `/owner/menu`, `/owner/menu/print`, `/owner/offers`, `/owner/settings`, `/owner/profile` |
| People/customers | `/owner/employees`, `/owner/customers`, `/owner/loyalty` |
| Finance/inventory | `/owner/inventory`, `/owner/accounting`, `/owner/reports` |
| Admin-like owner tools | `/owner/audit-logs`, `/owner/support`, `/owner/social-posts`, `/owner/digital-menu`, `/owner/onboarding` |
| Auth | `/owner/login`, `/api/owner/auth/login`, `/api/owner/auth/password-otp` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Owner shell/topbar | `src/components/layout/dashboard-shell.tsx`, `src/components/layout/dashboard-topbar.tsx`, `src/components/owner/topbar.tsx` |
| View switch | `src/components/owner/operational-view-switcher.tsx`, `src/hooks/use-operational-view.ts`, `src/app/api/owner/view-mode/route.ts` |
| Menu | `src/components/flows/owner-menu-management-flow.tsx`, `src/repositories/menu-repository.ts`, `src/app/api/owner/menu/route.ts` |
| Orders | `src/components/flows/owner-order-management-flow.tsx`, `src/repositories/order-repository.ts`, `src/app/api/owner/orders/route.ts` |
| Settings | `src/components/flows/owner-settings-flow.tsx`, `src/app/api/owner/profile/route.ts`, `src/app/api/owner/qr-settings/route.ts` |
| Tables/QR | `src/components/flows/restaurant-tables-flow.tsx`, `src/repositories/table-repository.ts`, `src/lib/server/table-qr.ts`, `src/app/api/owner/tables/route.ts` |
| Communication | `src/repositories/communication-repository.ts`, `src/app/api/owner/communication/route.ts` |

### Kitchen Module

Existing implementation:

| Concern | Existing files |
| --- | --- |
| KDS UI | `src/components/flows/kitchen-display-flow.tsx`, `/owner/kitchen` |
| Kitchen repository | `src/repositories/kitchen-repository.ts` |
| APIs | `src/app/api/owner/kitchen/route.ts`, `src/app/api/owner/kitchen/stream/route.ts` |
| Realtime | SSE stream and Firestore kitchen order snapshots |
| Print handoff | Existing KOT printing components and print engine |

### Waiter / Table Module

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Table management | `src/components/flows/restaurant-tables-flow.tsx`, `/owner/tables` |
| Customer QR ordering | `src/components/flows/table-qr-ordering-flow.tsx` |
| QR session APIs | `/api/public/table-order/session`, `/api/public/table-order/order`, `/api/public/table-order/request` |
| Table repository | `src/repositories/table-repository.ts` |
| QR signing | `src/lib/server/table-qr.ts` |

### POS

Existing implementation:

| Concern | Existing files |
| --- | --- |
| POS route | `/owner/pos`, legacy `/pos`, `/pos/tables`, `/pos/invoice` |
| POS flow | `src/components/flows/pos-billing-flow.tsx` |
| POS components | `src/modules/owner/pos/components/*` |
| POS state | `src/modules/owner/pos/pos-store.ts`, `src/stores/pos-store.ts` |
| POS API | `src/app/api/owner/pos/route.ts` |

### Admin

Existing routes:

| Surface | Routes |
| --- | --- |
| Dashboard/auth | `/admin`, `/admin/login` |
| CMS/master data | `/admin/cms`, `/admin/categories`, `/admin/cuisines`, `/admin/featured-menu-items` |
| Platform operations | `/admin/restaurants`, `/admin/users`, `/admin/roles`, `/admin/plans`, `/admin/subscriptions` |
| Support/diagnostics | `/admin/support`, `/admin/system/diagnostics`, `/admin/system/firebase-diagnostics` |
| Campaigns/social | `/admin/campaigns`, `/admin/social-queue`, `/admin/meta` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Admin auth | `src/modules/shared/auth/admin-auth.ts`, `src/app/api/admin/auth/*` |
| Admin data | `src/repositories/admin-repository.ts`, `src/app/api/admin/data/route.ts` |
| CMS | `src/app/api/admin/cms/route.ts`, `src/app/api/public/cms/route.ts`, `src/services/cms/*` |
| Diagnostics | `src/app/api/admin/firebase-diagnostics/route.ts`, `src/services/firebase-diagnostics-service.ts` |

### Repository Layer

Canonical repositories:

| Repository | Domain |
| --- | --- |
| `accounting-repository.ts` | Accounting entries and reports |
| `admin-repository.ts` | Admin resource CRUD |
| `audit-repository.ts` | Audit logs and user sessions |
| `communication-repository.ts` | Communication settings/history |
| `customer-account-repository.ts` | Customer account profile/address/order data |
| `customer-repository.ts` | Owner customer records |
| `inventory-repository.ts` | Inventory, suppliers, purchases, audits |
| `kitchen-repository.ts` | Kitchen orders |
| `loyalty-repository.ts` | Loyalty rules/customers/transactions |
| `menu-repository.ts` | Owner menu writes |
| `offer-repository.ts` | Owner offer writes |
| `order-repository.ts` | Customer/owner orders and order consistency |
| `printer-repository.ts` | Printer profiles, receipt templates, print logs |
| `staff-repository.ts` | Staff and permissions |
| `table-repository.ts` | Restaurant tables, QR sessions, table actions |

### Firebase / Firestore

Canonical collection registry: `src/firebase/collections.ts`.

Do not add a collection without checking this list first:

```text
tenants, users, tenantUsers, branchUsers, userSessions, auditLogs,
restaurants, appCategories, appCuisines, roles, branches, tables,
menus, menuCategories, menuItems, deliveryMenus, dineInMenus, parcelMenus,
cuisines, menuVariants, modifierGroups, taxSettings, comboOffers,
menuSchedules, orders, orderItems, kitchenOrders, customers,
loyaltyAccounts, customerProfiles, customerOrders, customerLoyalty,
customerTransactions, customerPaymentMethods, customerSavedRestaurants,
customerCoupons, customerReviews, loyaltyCustomers, loyaltyRules,
offers, coupons, inventory, inventoryItems, inventoryTransactions,
purchaseEntries, purchaseOrders, suppliers, deliveries, deliveryAgents,
customerAddresses, campaigns, socialTemplates, socialPosts,
cateringRequests, callbackRequests, subscriptions, billTemplates,
kotTemplates, printerProfiles, printLogs, receipts, receiptTemplates,
paymentTransactions, reports, permissions, accountingTransactions,
expenseEntries, purchaseExpenses, salaryEntries, ledgerAccounts,
deliveryZones, accountingEntries, expenses, notifications,
staffActivityLogs, settings, kotPrintQueue, restaurantSettings,
restaurantTables
masterMenuTemplates, phoneVerificationSessions
```

Additional live collections found through API/repository scans:

```text
communicationSettings, communicationHistory, user_preferences,
supportIssues, paymentIntents, paymentWebhooks, whatsappEvents,
whatsappWebhooks, restaurant_stats, admin_restaurant_leads,
onboarding_checklists, emailOtps, modulePasswordOtps
```

These should be reconciled into documentation/registry before any future schema expansion.

### Authentication

Existing implementation:

| Surface | Existing files |
| --- | --- |
| Shared module session | `src/lib/server/module-auth.ts`, `src/lib/server-auth.ts` |
| Customer auth | `src/modules/shared/auth/customer-auth.ts`, `src/hooks/auth/use-customer-auth.ts` |
| Owner auth | `src/modules/shared/auth/owner-auth.ts`, `/api/owner/auth/*` |
| Admin auth | `src/modules/shared/auth/admin-auth.ts`, `/api/admin/auth/*` |
| Session bridge | `/api/auth/session`, `/api/auth/email-otp`, `/api/auth/test-session` |

### Storage / Images

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Cloudinary signing | `src/app/api/cloudinary/signature/route.ts`, `src/lib/server/cloudinary.ts` |
| Upload widget | `src/components/media/cloudinary-upload-widget.tsx` |
| Safe image handling | `src/components/media/safe-image.tsx`, `src/lib/image-optimization.ts` |
| Brand assets | `public/brand/*`, `public/icons/*`, `src/lib/brand-assets.ts` |
| Firebase Storage | Config/rules present; product images primarily use Cloudinary |

### Shared Components / Hooks / Utilities

Use these before creating new components:

| Concern | Existing files |
| --- | --- |
| UI primitives | `src/components/ui/*` |
| Layout | `src/components/layout/*` |
| State feedback | `src/components/state/*` |
| Commerce widgets | `src/components/commerce/*` |
| Printing | `src/components/printing/*`, `src/lib/print-engine.ts` |
| Schedule | `src/components/schedule/*`, `src/lib/schedule-slots.ts` |
| Maps/location | `src/components/maps/*`, `src/hooks/use-location-commerce.ts` |
| Auth hooks | `src/hooks/use-auth-user.ts`, `src/hooks/auth/use-customer-auth.ts` |
| Public data hooks | `src/hooks/use-public-data.ts`, `src/hooks/use-public-app-name.ts` |
| Owner data hooks | `src/hooks/use-owner-repository-data.ts`, `src/hooks/use-operational-view.ts` |

### Caching / Realtime / Offline

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Public cache | `src/lib/server/public-cache.ts`, `src/lib/public-cms-cache.ts`, `src/lib/cache.ts` |
| Service worker | `public/sw.js` |
| Offline queue | `src/lib/offline/*`, `src/components/offline/*` |
| Realtime order hooks | `src/hooks/use-restaurant-orders.ts`, `src/hooks/use-realtime-order.ts` |
| Public listeners | `src/hooks/use-public-data.ts`, `src/services/public-data-service.ts` |
| Kitchen stream | `/api/owner/kitchen/stream` |

### Communication / Notifications

Existing implementation:

| Concern | Existing files |
| --- | --- |
| SMTP / OTP | `src/lib/server/module-auth.ts`, `/api/auth/email-otp`, `/api/public/order-notification` |
| Owner communication settings | `/api/owner/communication`, `communication-repository.ts` |
| WhatsApp browser handoff | `src/services/whatsapp-service.ts`, `src/hooks/useWhatsAppShare.ts`, `src/components/WhatsAppShareModal.tsx` |
| WhatsApp Cloud API | `/api/whatsapp/send`, `/api/whatsapp/webhook` |
| Public outage alerts | `src/lib/server/public-outage-alert.ts`, Admin CMS alert settings |
| Push notifications | Framework/placeholder only; not production implemented |

### Printing

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Print engine | `src/lib/print-engine.ts` |
| Bill/KOT components | `src/components/printing/restaurant-bill.tsx`, `src/components/printing/kot-ticket.tsx` |
| Printer API/repository | `/api/owner/printers`, `src/repositories/printer-repository.ts` |
| POS bill preview | `src/components/flows/pos-billing-flow.tsx` |

### Analytics / Settings / SEO / Theme

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Analytics | `src/services/analytics-service.ts`, `/api/owner/analytics`, Admin analytics pages |
| Settings | Owner/Admin settings routes, `restaurantSettings`, `settings`, `user_preferences` |
| SEO | `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, item OpenGraph route |
| Theme | `themes/*`, `src/themes/*`, `src/lib/theme-provider.tsx`, `npm run theme:contrast` |

## Architecture Decision Records (ADR)

| ADR | Decision | Reason | Alternative | Tradeoffs |
| --- | --- | --- | --- | --- |
| ADR-001 Repository Pattern | Use `src/repositories/*` as the preferred server-side Firestore domain layer. | Keeps owner/admin/server writes centralized, tenant-aware, and easier to audit. | Direct Firestore calls in every API route. | Repositories add indirection, but reduce duplicate reads/writes and schema drift. |
| ADR-002 Repository-first Firestore | New server mutations should reuse repositories before adding route-local database logic. | Existing migration validated repository-backed owner/admin/customer data paths. | Build new services per route. | Requires checking existing repository contracts before coding. |
| ADR-003 QR Device Binding | QR sessions bind table, device/session metadata, expiry, idle timeout, and request/order validation. | Reduces table hijacking, stale QR use, and cross-device order/request spoofing. | Token-only QR links without session checks. | More session state and stricter customer flow, but safer dine-in operations. |
| ADR-004 Operational View Protection | Owner operational view switching requires guarded session handling and password confirmation for protected switches. | Prevents accidental or unauthorized switching into Kitchen/POS/Owner workspaces. | Plain client-side mode toggle. | Adds a manual verification requirement and recovery states. |
| ADR-005 Shared Public Cache | Public restaurants/menu/offers/CMS use shared cache helpers with no-store guards where dynamic freshness matters. | Prevents stale customer catalog data while reducing repeated Firestore reads. | Browser/local-only cache or no cache. | Cache invalidation must remain carefully scoped. |
| ADR-006 Theme System | Customer, owner, and admin use separate theme token files with shared typography. | Keeps each surface independently branded while preserving consistency. | One global theme for every surface. | More token files, but fewer cross-surface visual regressions. |
| ADR-007 Offline Strategy | Offline queue and sync are scoped to owner/POS operational routes. | Avoids customer/admin side effects and limits retries to operational writes. | Global offline sync across all modules. | Narrower offline support, but safer module boundaries. |
| ADR-008 Service Worker Strategy | Service worker caches only safe static assets and bypasses dynamic customer catalog, RSC, and Next router data. | Prevents stale page/RSC bugs and stale restaurant/menu data. | Aggressive app-shell caching. | Less offline page caching, but production data freshness is safer. |
| ADR-009 Realtime Strategy | Realtime listeners and SSE are used for operational data with explicit cleanup. | Kitchen, orders, public data, and auth need live updates without leaks. | Polling everywhere. | Listener lifecycle must be audited; lower latency and fewer repeated reads. |
| ADR-010 Cloudinary-first Images | Product/banner/profile uploads use Cloudinary signing and URLs; Firebase Storage remains mostly diagnostic/fallback. | Better image CDN/transformation support and simpler public delivery. | Firebase Storage for all images. | Requires Cloudinary env and provider health monitoring. |
| ADR-011 Module Session Isolation | Admin, owner, and customer sessions are scoped separately. | Prevents same-browser role leakage and cross-module redirects. | One shared role/session cookie. | More auth routes/cookies, but safer multi-role workflows. |
| ADR-012 Print Engine Reuse | Bill/KOT/receipt printing extends one print engine and printer API/repository. | Prevents duplicate print templates, logs, and printer settings. | Separate print paths per screen. | Shared engine needs careful option handling, but keeps audit and paper sizing consistent. |

## 3. Current Project Status

| Area | Status | Notes |
| --- | --- | --- |
| Customer ordering | Implemented | Public catalog, cart, checkout, scheduled ordering, order history, reviews, support. |
| Owner operations | Implemented | Dashboard, orders, menu, offers, kitchen, tables, POS, printers, staff, inventory, accounting, settings. |
| Admin | Implemented | CMS, master data, restaurant/user/subscription management, support, diagnostics. |
| QR ordering | Implemented | Signed table QR, customer session/order/request flow, owner session actions. |
| Printing | Implemented | Bill/KOT, paper sizes, duplicate/customer/cashier/kitchen copies, logs. |
| Communication | Implemented | Owner communication settings, SMTP/WhatsApp handoff, outage alerts. |
| Payments | Partially implemented | Razorpay order/verify/webhook routes exist; live credentials/provider review remain manual. |
| Push/SMS | Placeholder | SMS and browser push are framework/planning only. |
| Delivery live tracking | Partially implemented | Delivery routes and status flows exist; real partner GPS tracking is framework-level. |
| Meta integration | Placeholder/partial | Admin Meta page and marketing flows exist; production OAuth/publishing needs provider hardening. |
| Production deployment | Partially manual | Hostinger release validated previously; latest env/cache/redeploy tasks remain manual. |

## Feature Flags

Feature flags are documented control points for future implementation and rollout planning. Do not add runtime flags without checking existing env parsing in `src/lib/env.ts`, owner/admin settings, and this tracker.

| Feature | Suggested Flag / Setting | Current State | Source of Truth | Rollout Notes |
| --- | --- | --- | --- | --- |
| QR Ordering | `qrOrdering.enabled` in `restaurantSettings` | Implemented | Owner QR settings and table repository | Keep enabled per restaurant/table; preserve signed token validation. |
| Push Notifications | `notifications.push.enabled` | FCM code-ready / provider pending | Existing service worker, owner notification settings, `user_preferences` token storage | Requires Firebase Web Push VAPID key, production rules deploy, and real-device opt-in/background smoke. |
| Offline Mode | `offline.ownerPos.enabled` | Implemented for owner/POS scope | Existing offline queue/sync scope | Keep scoped to owner/POS unless a separate customer offline design is approved. |
| Bill Printing | `printing.enabled` and printer profile settings | Implemented | Printer profiles, receipt templates, print engine | Disable by printer profile or UI action, not by deleting print engine paths. |
| Payments | `payments.razorpay.enabled` | Partially implemented | Env keys and payment settings | Must remain off/limited until live keys and webhook validation pass. |
| SMS | `communication.sms.enabled` | Placeholder | Owner communication settings | Requires provider adapter and manual provider setup. |
| WhatsApp | `communication.whatsapp.enabled` | Partial | Owner communication settings and env keys | Browser handoff works; Cloud API requires provider hardening. |
| Delivery | `delivery.enabled` | Partial/framework | Delivery routes/settings | Live GPS and partner dispatch require separate launch readiness. |
| Loyalty | `loyalty.enabled` | Implemented | Loyalty rules/API/repository | Future changes should reuse existing loyalty rules. |
| Reviews | `reviews.enabled` | Implemented | Public reviews API and customer reviews collection | Preserve completed-order constraints. |
| Marketing | `marketing.social.enabled` | Partial | Studio/admin marketing settings | Meta publishing remains provider-gated. |
| Database Alerts | `operations.databaseAlerts.enabled` | Implemented | Admin CMS and `DATABASE_ALERT_EMAIL` | Manual env and CMS recipient setup required. |

## Notification Architecture

Future notification work must use one reusable framework instead of separate per-channel implementations.

```text
Notification Service
  -> Notification Policy
  -> Channel Adapter
    -> Email
    -> SMS
    -> WhatsApp
    -> Push
    -> In-App
  -> Delivery Log
  -> Retry / Dead-letter Queue
```

| Layer | Responsibility | Existing / Future Anchor |
| --- | --- | --- |
| Notification Service | Accepts domain events, resolves recipients, applies preferences, chooses channels. | Future shared service; reuse owner communication settings and public outage alert patterns. |
| Notification Policy | Decides allowed channel, priority, throttling, quiet hours, and fallback order. | Owner communication settings, Admin CMS alert settings. |
| Channel Adapter | Normalizes provider-specific send, status, retry, and error mapping. | Future adapters under `src/services` or `src/lib/server`. |
| Email Adapter | SMTP send for OTP, owner credentials, order/outage alerts. | Existing SMTP code in module auth, email OTP, owner credentials, order notification. |
| SMS Adapter | Provider-backed SMS send and delivery status. | Future `SMS-001`; no production provider yet. |
| WhatsApp Adapter | WhatsApp Cloud API send/webhook and browser handoff. | Existing `/api/whatsapp/*`, WhatsApp services, share modal. |
| Push Adapter | Web Push subscription send and unsubscribe cleanup. | Future `PUSH-001`; service worker exists but push is not implemented. |
| In-App Adapter | Stored user/role notifications and read state. | Existing `notifications` collection seed paths; needs productized contract. |
| Delivery Log | Stores attempt id, channel, recipient hash/reference, status, provider id, error code. | Reuse/audit `communicationHistory`, `whatsappEvents`, future notification logs. |
| Retry Queue | Retries transient failures and dead-letters permanent failures. | Future queue; do not overload customer/order writes. |

Notification standards:

| Standard | Requirement |
| --- | --- |
| Privacy | Never log raw secrets, OTP values, provider tokens, or full private customer data. |
| Idempotency | Every event should have a deterministic notification key to avoid duplicate sends. |
| Tenant isolation | Every restaurant-scoped notification must include tenant/restaurant context. |
| Fallback | Channel fallback order must be policy-driven, not hardcoded in screens. |
| Audit | Every provider send attempt needs a non-sensitive delivery record. |

## 4. Completed Features

Protected completed features:

| Feature | Status |
| --- | --- |
| Production release baseline | Completed and validated on Hostinger on 2026-06-26 |
| Enterprise Menu Master Library | Completed 2026-07-02 |
| Global search autofill regression | Completed 2026-07-01 |
| Enterprise bill printing stabilization | Completed 2026-07-01 |
| Enterprise QR customer/session workflow | Completed 2026-07-01 |
| QR/table/search stabilization | Completed 2026-07-01 |
| Production QR table ordering baseline | Completed 2026-06-30 |
| Operational view switch hardening | Completed 2026-06-30; manual password verification remains |
| Firestore-backed owner communication | Completed 2026-06-30 |
| Owner repository migration batch | Completed 2026-06-24 through 2026-06-25 |
| Admin/customer repository validation | Completed 2026-06-26 |
| Owner critical gap batch | Completed 2026-06-22 |
| Theme system redesign | Completed 2026-06-10 |
| Public catalog/cache consistency | Completed 2026-06-10 |
| Legal/CMS rendering repair | Completed 2026-06-09 |
| Hostinger Firebase Admin private-key hardening | Completed 2026-06-09 |
| Dependency maintenance | Completed 2026-06-08 |
| Owner menu enterprise wizard/list | Completed 2026-06-01 through 2026-06-03 |
| Customer restaurant mobile/tablet redesign | Completed 2026-06-03 |
| Auth session separation | Completed 2026-05-31 |
| PWA/service worker cache guards | Completed |

## 5. Protected Features

Future tasks must not rebuild these modules:

| Protected module | Reuse / extension point |
| --- | --- |
| Owner Dashboard and topbar | Extend `dashboard-shell`, `dashboard-topbar`, owner widgets. |
| Operational View Switch | Patch `operational-view-switcher`, `use-operational-view`, `/api/owner/view-mode`. |
| Owner Menu | Extend existing flow, repository, and owner menu API. |
| Owner Orders | Extend existing flow, repository, and owner orders API. |
| Kitchen Display System | Extend `kitchen-display-flow`, kitchen repository/API/stream. |
| POS Billing | Extend `pos-billing-flow`, `src/modules/owner/pos/*`, `/api/owner/pos`. |
| Table/QR Ordering | Extend `restaurant-tables-flow`, `table-qr-ordering-flow`, table repository, QR APIs. |
| Printing | Extend `print-engine`, printing components, printer repository/API. |
| Owner Communication | Extend communication repository/API/settings flow. |
| Public Catalog | Extend public data service/server Firestore helpers; preserve no-store/cache guards. |
| Customer Cart Sync | Extend customer cart API and cart sync component. |
| Auth Session Scoping | Extend module-auth/session APIs; preserve role cookie separation. |
| Theme System | Extend token files and run contrast validation. |
| Service Worker | Preserve static-only/dynamic no-store guards. |
| Legal/CMS | Extend Admin CMS and sanitized legal renderer. |
| Cloudinary Uploads | Use signing route and upload widget. |

## 6. Do Not Modify List

Do not modify unless the task explicitly requires a bug fix in that area:

| Area | Reason |
| --- | --- |
| Firestore collection names | Existing data and repositories depend on them. |
| Existing API route contracts | Customer/owner/admin flows depend on stable response shapes. |
| `src/firebase/collections.ts` | Registry must remain stable unless schema work is approved. |
| `src/lib/app-store.ts` and `src/lib/cart-store.ts` persistence keys | Existing client data depends on them. |
| `src/stores/*` facades | Migration-safe compatibility layer. |
| `/api/public/*` no-store behavior | Prevents stale customer catalog data. |
| `public/sw.js` dynamic route bypasses | Prevents stale RSC/page cache bugs. |
| Owner/admin/customer auth separation | Prevents cross-role session leakage. |
| Hostinger env private-key normalization | Production stability dependency. |
| QR token signing/verification | Security and table-session consistency dependency. |
| Printer log/write paths | Operational audit dependency. |

## 7. Remaining Features

Remaining work is split into Codex implementation tasks and Manual/external tasks. Manual tasks must not be mixed with Codex implementation tasks.

Task review result: no application feature work is approved by this documentation pass. Provider tasks were split from broad integration tasks, manual deployment tasks remain separate, and all remaining tasks now carry explicit dependencies, acceptance criteria, verification, and ownership.

| ID | Priority | Description | Dependencies | Complexity | Status | Acceptance Criteria | Verification Checklist | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAN-001 | P0 | Manually verify owner password-protected operational view switch in browser. | Owner credentials; hosted or local app. | Low | Pending | Wrong password is rejected; correct password switches view; retry/cancel recovery works. | Browser check Owner to Kitchen/POS/Owner; verify no console errors. | Manual |
| MAN-002 | P0 | Add/confirm required production environment variables in Hostinger. | Hostinger hPanel access; real provider credentials. | Medium | Pending | Production-equivalent env satisfies `scripts/validate-production-env.mjs`. | Confirm Firebase Admin/public, Cloudinary, SMTP, Mapbox, Google OAuth, Razorpay, alert values. | Manual |
| MAN-003 | P0 | Set `DATABASE_ALERT_EMAIL` and save matching Admin CMS alert recipient. | MAN-002; Admin access. | Low | Pending | Hosting and Admin CMS have the same outage recipient. | Inspect Hostinger env and Admin CMS; confirm customer outage copy stays non-technical. | Manual |
| MAN-004 | P0 | Confirm SMTP credentials and outbound email delivery. | MAN-002; SMTP provider access. | Medium | Pending | OTP, owner credentials, order notification, and outage alert paths can send. | Test representative SMTP sends and inspect sanitized logs. | Manual |
| MAN-005 | P1 | Run production seed/cleanup only if hosted Firestore still contains old `test-owner` records. | Firebase Admin credentials; backup/review. | Medium | Conditional | No stale demo/test owner records leak into production. | Dry-run first; apply only exact reviewed cleanup; verify public APIs after cleanup. | Manual |
| MAN-006 | P0 | Clear Hostinger cache and redeploy latest GitHub commit. | MAN-002; Hostinger deployment access. | Medium | Pending | Hosted app serves latest release metadata and current UI copy. | Verify `/api/release-info`, `/`, `/owner/login`, `/owner/pos`, `/admin/login`. | Manual |
| MAN-007 | P1 | Confirm Firebase authorized domains for Google sign-in. | Firebase Console access; final domain. | Low | Pending | Hosted and final custom domains are authorized for Google/Firebase auth. | Google sign-in smoke on hosted domain. | Manual |
| MAN-008 | P1 | Deploy Firestore rules and indexes when changed. | Firebase Console/CLI access; SEC-001 output. | Medium | Pending | Rules/indexes match current queries and deployed project. | Firebase deploy output; admin diagnostics; protected route smoke. | Manual |
| PAY-001 | P1 | Validate Razorpay live/sandbox order, verify, and webhook flow. | MAN-002; Razorpay account; payment env. | Medium | Not started | Payment order creation, verification, webhook signature, and `paymentIntents` persistence are verified. | Sandbox/live smoke, invalid signature test, paymentIntent inspection. | Manual + Codex |
| PAY-002 | P2 | Document and validate refund/settlement operational process. | PAY-001; business refund policy. | Medium | Not started | Refund responsibility, support workflow, and reconciliation notes are documented. | Policy review, owner/admin workflow review, accounting impact notes. | Manual + Codex |
| WA-001 | P2 | Harden WhatsApp Cloud API provider configuration. | MAN-002; Meta app; token; phone number id; webhook token. | Medium | Placeholder/partial | `/api/whatsapp/send` and webhook are provider-verified with safe error handling. | Send test message/template; inspect `whatsappEvents` and `whatsappWebhooks`. | Manual + Codex |
| WA-002 | P2 | Define WhatsApp template approval and fallback policy. | WA-001; Meta template approval. | Low | Not started | Template names, fallback to browser handoff, and failure handling are documented. | Template review, fallback smoke, communication settings review. | Manual + Codex |
| SMS-001 | P2 | Select and document SMS gateway requirements. | Provider decision; budget; compliance. | Low | Not started | Provider, sender id, OTP/transactional rules, and env needs are documented. | Provider checklist and env checklist reviewed. | Manual |
| SMS-002 | P2 | Implement future SMS channel adapter. | SMS-001; notification architecture. | Medium | Placeholder | SMS tests and order notifications use configured provider adapter. | Provider test send, failure handling, no secret leakage. | Manual + Codex |
| PUSH-001 | P2 | Browser push notification subscriptions. | Firebase Web Push VAPID key; notification architecture; service worker review. | High | Code-ready / manual smoke pending | Customers/staff can opt in; tokens are stored per device and removable; server dispatch cleans invalid tokens. | Configure VAPID key, deploy rules, device permission flow, foreground/background notification, click deep link, unsubscribe, server send test. | Manual + Codex |
| META-001 | P3 | Harden Meta/Instagram OAuth and publishing. | Meta app review/access; marketing settings. | High | Placeholder/partial | Admin Meta page can connect, refresh tokens, and publish approved campaigns. | OAuth, token refresh, publish, error-state validation. | Manual + Codex |
| DEL-001 | P3 | Implement future delivery partner GPS tracking. | Delivery app/provider decision; maps settings; privacy policy review. | High | Framework | Live locations are scoped securely and visible only to eligible views. | Permission flow, throttling, map rendering, privacy review. | Codex |
| INV-001 | P3 | Add future recipe/BOM auto-deduction from inventory. | Final inventory accounting rules; owner recipe data model review. | High | Placeholder | Completed orders decrement mapped ingredients and write auditable movements. | Unit tests, order completion smoke, inventory transaction audit. | Codex |
| REPORT-001 | P2 | Design aggregate analytics collections and query strategy. | Firestore index/cost strategy; current report parity. | Medium | Not started | Aggregate schema and update sources are documented before implementation. | Query count estimate, index list, migration/rollback notes. | Codex |
| REPORT-002 | P2 | Implement future aggregate analytics population. | REPORT-001; SEC-001. | High | Not started | Owner/admin reports avoid scanning high-volume raw collections. | Load test query counts, report parity, index deployment. | Codex |
| HEALTH-001 | P2 | Design future operational health dashboard. | Operational health section in this tracker. | Medium | Not started | Firebase, Functions, SMTP, SMS, WhatsApp, Push, Printer, Storage, Payments, Queues health sources are defined. | Health source checklist and manual/provider access checklist. | Codex |
| RBAC-001 | P2 | Audit role-specific dashboards/navigation before any new dashboard work. | Existing RBAC; operational view; staff permissions. | Medium | Pending audit | No duplicate dashboards; role routing reuses owner/kitchen/POS surfaces. | Permission matrix check, protected route smoke. | Codex |
| TEST-001 | P2 | Design focused e2e smoke suite for core release flows. | Stable test runner decision; auth fixture strategy. | Medium | Not started | Customer, owner, admin, QR, POS, printing smoke scope is documented. | Proposed `npm run test:e2e` or equivalent command and route matrix. | Codex |
| TEST-002 | P2 | Implement future focused e2e smoke suite. | TEST-001. | Medium | Not started | Core release flows run repeatably in local/staging. | Test command, CI/local output, screenshots where applicable. | Codex |
| PERF-001 | P2 | Audit large flow components and route bundles. | Current production behavior stable. | Medium | Not started | Highest-risk large flows and candidate splits are documented. | Build, route smoke, bundle comparison. | Codex |
| KDS-001 | P3 | Improve future kitchen board virtualization and TV styling. | PERF-001; current KDS baseline. | Medium | Deferred | Large kitchen queues render smoothly on TV/tablet. | Browser performance check, fullscreen visual check. | Codex |
| ORDER-001 | P3 | Continue future owner Order Desk mobile redesign. | Existing owner order flow; RBAC-001. | Medium | Deferred | Mobile order management is dense, readable, and action-complete. | Mobile viewport screenshot, lint/build. | Codex |
| SEC-001 | P1 | Review Firestore rules/indexes against current collections and query patterns. | Firebase Console/CLI access; collection registry reconciliation. | Medium | Manual pending | Rules/indexes match current collections and protected paths. | Deploy rules/indexes in target project; Firebase diagnostics pass. | Manual + Codex |
| DOC-001 | P1 | Keep this master tracker current after every future task. | None. | Low | Active | New tasks/completions update this file. | Review diff contains tracker update for project changes. | Codex |

## Feature Dependency Graph

| ID | Dependencies | Prerequisites | Blocked By | Unlocks | Future Dependencies |
| --- | --- | --- | --- | --- | --- |
| MAN-001 | Owner credentials; app access | Existing operational view implementation | Manual browser access | Final release confidence | None |
| MAN-002 | Hostinger access | Real provider credentials | External hosting/provider access | MAN-003, MAN-004, MAN-006, PAY-001, WA-001 | SEC-001, HEALTH-001 |
| MAN-003 | MAN-002 | Admin CMS access | Missing alert recipient decision | Outage alert readiness | Notification service policy |
| MAN-004 | MAN-002 | SMTP provider access | Invalid SMTP credentials | OTP/email production readiness | Notification email adapter |
| MAN-005 | Firebase Admin access | Dry-run cleanup review | Unverified production data state | Cleaner public production data | SEC-001 |
| MAN-006 | MAN-002 | Hostinger deployment access | Deployment/cache access | Hosted release validation | MAN-001, PAY-001, WA-001 |
| MAN-007 | Firebase Console access | Final domain decision | Missing domain/SSL | Google sign-in production readiness | MAN-006 |
| MAN-008 | SEC-001 | Firebase CLI/Console access | Rules/index review not complete | Secure production data access | REPORT-002 |
| PAY-001 | MAN-002 | Razorpay env and account | Provider credentials/webhook access | Live payment readiness | PAY-002, HEALTH-001 |
| PAY-002 | PAY-001 | Business refund policy | Payment flow not validated | Payment support/reconciliation process | Accounting/reporting refinements |
| WA-001 | MAN-002 | Meta app and WhatsApp credentials | Provider access/template state | WhatsApp API readiness | WA-002, notification adapter |
| WA-002 | WA-001 | Approved templates | Meta approval | Customer/owner communication fallback rules | Notification policy |
| SMS-001 | Provider decision | Compliance and sender rules | No SMS provider selected | SMS implementation scope | SMS-002 |
| SMS-002 | SMS-001 | Notification architecture | Provider credentials | SMS notification channel | HEALTH-001 |
| PUSH-001 | Notification architecture | VAPID/provider decision | Push provider/design not selected | Browser push channel | HEALTH-001 |
| META-001 | Meta app access | OAuth app review | Provider access/app approval | Social publishing | Marketing analytics |
| DEL-001 | Maps/settings/privacy | Delivery tracking design | Delivery app/provider decision | Live delivery tracking | Notification ETA alerts |
| INV-001 | Inventory accounting rules | Recipe/BOM data design | Business rules not finalized | Auto stock deduction | Reporting/accounting refinements |
| REPORT-001 | Firestore cost/index strategy | Current report parity | Data volume model | REPORT-002 | HEALTH-001 |
| REPORT-002 | REPORT-001, SEC-001 | Aggregate schema | Index/rules not ready | High-volume reports | Scheduled reports |
| HEALTH-001 | MAN-002, provider tasks | Monitoring source list | Missing provider access | Operational dashboard implementation | Alert routing, notification service |
| RBAC-001 | Existing RBAC/staff permissions | Permission matrix | None | Role-safe dashboard work | ORDER-001 |
| TEST-001 | Test runner decision | Auth fixture strategy | No test stack decision | TEST-002 | CI checks |
| TEST-002 | TEST-001 | Test environment | Test design not approved | Repeatable release smoke | CI gating |
| PERF-001 | Stable baseline | Build/bundle inspection | None | KDS-001, future code splitting | TEST-002 |
| KDS-001 | PERF-001 | KDS performance target | Deferred priority | Better TV/large-queue KDS | TEST-002 |
| ORDER-001 | RBAC-001 | Mobile order UX target | Deferred priority | Better mobile owner order desk | TEST-002 |
| SEC-001 | Collection registry review | Firebase access | External access | MAN-008, REPORT-002 | Security hardening |
| DOC-001 | None | Tracker read/update discipline | None | All future tasks | Always active |

## 8. Technical Debt

Audit findings:

| ID | Category | Finding | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| DEBT-001 | Duplicate compatibility state | `src/lib/cart-store.ts` and `src/stores/cart-store.ts`; `src/lib/app-store.ts` and domain facades coexist. | Accidental edits in wrong layer. | Treat `src/lib/*` as compatibility roots and `src/stores/*` as facades until a planned migration. |
| DEBT-002 | Duplicate components by name | `restaurant-card.tsx`, `sound-settings.tsx`, `useAlert.ts` exist in different domains. | Import confusion. | Document ownership; consolidate only in a dedicated refactor with visual checks. |
| DEBT-003 | Menu data duplication | `menus`, `menuItems`, `dineInMenus`, `parcelMenus`, `deliveryMenus` are all live/legacy-compatible. | Inconsistent reads/writes if one path is skipped. | Any menu task must check owner repository, public Firestore fallback, seed/cleanup scripts, and channel menus. |
| DEBT-004 | Collection registry drift | Some live collections are used outside `COLLECTIONS`. | Schema docs can fall behind code. | Reconcile additional live collections before schema expansion. |
| DEBT-005 | API/repository overlap | Some route handlers still directly access Firestore while repositories also exist. | Duplication and uneven validation. | New server writes should prefer repositories; migrate direct access only as scoped refactor. |
| DEBT-006 | Placeholder provider integrations | WhatsApp, SMS, push, delivery GPS, Meta, and parts of payment/provider flows need production provider review. | False sense of completeness. | Keep as tracked future tasks, not release blockers unless provider launch is requested. |
| DEBT-007 | Large flow components | Several high-value flows are large (`restaurant-detail-flow`, `owner-menu-management-flow`, `pos-billing-flow`, `restaurant-tables-flow`). | Harder maintenance and higher regression risk. | Split only behind tests/visual checks and without behavior changes. |
| DEBT-008 | Console logging | Operational scripts and some runtime paths log warnings/errors. | Noise if user-facing logs leak detail. | Keep server logs sanitized; audit client logs before production support hardening. |
| DEBT-009 | QR secret fallback | `TABLE_QR_SECRET` falls back to other env/dev default. | Token stability/security depends on env hygiene. | Set explicit `TABLE_QR_SECRET` in production if long-lived QR security is required. |
| DEBT-010 | Old docs conflicts | Older docs still mention mock/Firebase migration states that are partially outdated. | Future duplicate work. | Treat this file as planning authority; update older docs only when directly touched. |

## 9. Known Bugs

| ID | Priority | Bug / Concern | Status | Owner |
| --- | --- | --- | --- | --- |
| BUG-001 | P0 | Owner password-protected operational view switch still requires manual browser verification. | Pending manual | Manual |
| BUG-002 | P0 | Hostinger may still serve stale metadata/copy until cache clear/redeploy. | Pending manual | Manual |
| BUG-003 | P1 | Production env may still be incomplete for SMTP/database alerts/provider integrations. | Pending manual | Manual |
| BUG-004 | P2 | Provider-backed WhatsApp/SMS/push flows are incomplete by design. | Tracked | Manual + Codex |

## 10. Production Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing Hostinger env vars | Auth, Firebase Admin, Cloudinary, SMTP, maps, payments, alerts fail. | Complete MAN-002 and run `npm run validate:prod-env`. |
| SMTP misconfiguration | OTP/owner credentials/order/outage emails fail. | Complete MAN-004. |
| Stale Hostinger cache | Users see old metadata/copy/routes. | Complete MAN-006. |
| Firestore rules/index drift | Production API or realtime reads fail. | Complete SEC-001. |
| Provider placeholder launch | SMS/push/WhatsApp/Meta expectations exceed implementation. | Keep provider tasks explicitly tracked. |
| Menu collection duplication | Customer menu may miss owner changes if write/read path diverges. | Use existing repository/API/public mapping before edits. |
| Service worker caching regression | Stale customer/owner/admin pages. | Preserve `public/sw.js` bypass/no-store rules. |
| QR token env fallback | QR tokens may become invalid across env changes. | Pin production QR secret before broad QR print rollout. |

## 11. Manual Deployment Tasks

Manual tasks must be run by someone with external access:

| ID | Task |
| --- | --- |
| MAN-001 | Owner password-protected view switch browser verification. |
| MAN-002 | Add/confirm Hostinger production environment variables. |
| MAN-003 | Set `DATABASE_ALERT_EMAIL` and Admin CMS alert recipient. |
| MAN-004 | Confirm SMTP settings and delivery. |
| MAN-005 | Run production seed/cleanup if old test-owner records remain. |
| MAN-006 | Clear Hostinger cache, redeploy latest commit, and verify hosted routes. |
| MAN-007 | Confirm Firebase authorized domains for Google sign-in. |
| MAN-008 | Deploy Firestore rules and indexes when changed. |
| MAN-009 | Configure Razorpay live keys/webhook before live payment launch. |
| MAN-010 | Configure Meta/WhatsApp/SMS provider accounts before provider launch. |
| MAN-011 | Confirm domain, SSL, and final `NEXT_PUBLIC_APP_URL`. |

## 12. Future Roadmap

Roadmap items are not approved for implementation unless the user explicitly requests them:

| Area | Future work |
| --- | --- |
| Payments | Live Razorpay validation, refunds, settlement reporting. |
| Notifications | Browser push, SMS gateway, WhatsApp template automation. |
| Delivery | Live partner GPS, route optimization, delivery proof. |
| Inventory | Recipe/BOM auto-deduction and wastage analytics. |
| Reporting | Aggregate analytics collections and scheduled reports. |
| Meta/social | OAuth, token refresh, campaign publishing, attribution. |
| Testing | Focused Playwright or equivalent smoke coverage. |
| Performance | Bundle/route-level splitting for large flows. |
| Security | Rules/index review, QR secret rotation policy, provider secret audit. |

## 13. Task Tracker

Active tasks:

| ID | Priority | Status | Owner | Summary |
| --- | --- | --- | --- | --- |
| MAN-001 | P0 | Pending | Manual | Verify password-protected operational view switch. |
| MAN-002 | P0 | Pending | Manual | Hostinger env variables. |
| MAN-003 | P0 | Pending | Manual | Database alert email and Admin CMS alert recipient. |
| MAN-004 | P0 | Pending | Manual | SMTP delivery confirmation. |
| MAN-006 | P0 | Pending | Manual | Hostinger cache clear/redeploy/route verification. |
| MAN-007 | P1 | Pending | Manual | Firebase authorized domains for Google sign-in. |
| MAN-008 | P1 | Pending | Manual | Deploy Firestore rules/indexes when changed. |
| SEC-001 | P1 | Pending | Manual + Codex | Firestore rules/index review. |
| DOC-001 | P1 | Active | Codex | Keep this tracker current. |
| PAY-001 | P1 | Not started | Manual + Codex | Razorpay order/verify/webhook validation. |
| PAY-002 | P2 | Not started | Manual + Codex | Refund and settlement process documentation. |
| REPORT-001 | P2 | Not started | Codex | Aggregate analytics design. |
| REPORT-002 | P2 | Not started | Codex | Future aggregate analytics implementation. |
| RBAC-001 | P2 | Pending audit | Codex | Role-specific dashboards/navigation audit. |
| TEST-001 | P2 | Not started | Codex | Focused e2e smoke suite design. |
| TEST-002 | P2 | Not started | Codex | Future focused e2e smoke implementation. |
| HEALTH-001 | P2 | Not started | Codex | Operational health dashboard design. |
| WA-001 | P2 | Placeholder/partial | Manual + Codex | WhatsApp Cloud API provider hardening. |
| WA-002 | P2 | Not started | Manual + Codex | WhatsApp template/fallback policy. |
| SMS-001 | P2 | Not started | Manual | SMS gateway requirements. |
| SMS-002 | P2 | Placeholder | Manual + Codex | Future SMS channel adapter. |
| PERF-001 | P2 | Not started | Codex | Large component/code split audit. |
| PUSH-001 | P2 | Code-ready / manual smoke pending | Manual + Codex | Browser push notifications require VAPID, rules deploy, and device smoke. |
| META-001 | P3 | Placeholder/partial | Manual + Codex | Meta/Instagram OAuth/publishing. |
| DEL-001 | P3 | Framework | Codex | Delivery GPS tracking. |
| INV-001 | P3 | Placeholder | Codex | Recipe/BOM auto-deduction. |
| KDS-001 | P3 | Deferred | Codex | KDS virtualization/TV polish. |
| ORDER-001 | P3 | Deferred | Codex | Owner Order Desk mobile redesign. |

Completed baseline tasks:

| ID | Status | Summary |
| --- | --- | --- |
| BASE-001 | Completed | Production release baseline validated on Hostinger. |
| QR-BASE | Completed | QR table ordering and session workflow. |
| PRINT-BASE | Completed | Bill/KOT printing and print logs. |
| OPS-BASE | Completed | Operational view switching and owner operations. |
| SEARCH-BASE | Completed | Owner/admin search autofill hardening. |
| COMM-BASE | Completed | Owner communication settings/history/contact workflow. |
| REPO-BASE | Completed | Owner/admin/customer repository migrations and production validation. |
| THEME-BASE | Completed | Customer/owner/admin theme token system. |
| CACHE-BASE | Completed | Public data no-store/cache/SW guards. |
| MENU-LIB | Completed | Enterprise Menu Master Library repository, admin UI, owner wizard picker, import/export, versioning, and audit metadata. |

## Definition of Done

Every future task must satisfy this checklist before it can move to completed.

| Area | Requirement |
| --- | --- |
| Architecture | Existing tracker sections, ADRs, protected features, repositories, APIs, and collection registry were checked before changes. |
| Scope | No unrelated refactors, duplicate modules, duplicate APIs, or unapproved schema changes. |
| Validation | Inputs, server actions, API payloads, tenant scope, and provider callbacks are validated with existing schemas/helpers where possible. |
| Accessibility | Interactive UI has labels, focus behavior, keyboard support, and readable states on mobile/desktop. |
| Performance | New reads/listeners are bounded, cached where appropriate, cleaned up on unmount, and do not scan high-volume collections unnecessarily. |
| Security | Auth/session/role checks happen server-side for protected reads/writes; secrets stay server-only; logs are sanitized. |
| Documentation | Relevant docs and this master tracker are updated with behavior, risks, and follow-ups. |
| Tracker Update | Task status, acceptance criteria, verification result, and manual follow-ups are recorded here. |
| Verification | Required commands pass or failures are documented with exact reason and next action. |
| Deployment Notes | Env vars, provider setup, rules/indexes, migrations, rollback, and manual deployment tasks are documented. |

Task-specific Definition of Done:

| Task Type | Additional Done Criteria |
| --- | --- |
| API/backend | Existing API contract preserved or versioned; unauthenticated/unauthorized path checked. |
| Firestore | Collection/index/rules impact documented; migration and rollback defined. |
| UI | Responsive checks and accessibility pass for affected surfaces. |
| Provider integration | Sandbox/live mode, webhook verification, retry/failure behavior, and credential ownership documented. |
| Documentation-only | Only docs or non-functional metadata changed; app verification commands pass. |

## Rollback Strategy

Every production feature must define rollback before release.

| Area | Rollback | Recovery | Migration | Backward Compatibility |
| --- | --- | --- | --- | --- |
| Feature flags | Disable feature through env/settings without deleting data. | Restore previous flag state after provider/app recovery. | Avoid irreversible migrations for flag-gated launches. | Existing users keep old flow until flag is enabled. |
| Firestore schema | Preserve old fields/collections during transition. | Re-run backfill or restore from backup if needed. | Use additive migrations first; dry-run before writes. | Readers must tolerate both old and new shapes during rollout. |
| APIs | Keep existing response fields stable. | Revert route handler or switch callers to prior route. | Avoid changing request/response contracts without versioning. | Existing clients continue to work. |
| QR ordering | Disable QR generation/session creation per settings. | Re-enable after token/session issue is fixed. | Do not invalidate existing tokens unless security requires it. | Existing printed QR codes remain valid when possible. |
| Payments | Disable online payment option; keep COD/manual payment. | Reconcile failed/unknown payments with provider dashboard. | Payment records must keep provider ids and statuses. | Existing orders remain readable regardless of provider state. |
| Notifications | Disable failing channel and fallback to next configured channel. | Replay only idempotent notifications after provider recovery. | Delivery logs must distinguish sent/failed/skipped. | Orders/support flows continue without non-critical notification sends. |
| Printing | Fall back to browser print/download where printer adapter fails. | Retry print log/reprint from stored order/bill data. | Print template changes must preserve old bill readability. | Old bills remain printable/reprintable. |
| Offline/sync | Disable queue processing if writes fail repeatedly. | Replay queue after validation; dead-letter unsafe writes. | Queue schema changes must preserve existing queued items. | Existing offline items are either replayed or safely surfaced. |
| Theme/UI | Revert token/component changes. | Restore previous token set and rerun contrast/build checks. | Avoid changing persisted preference keys. | Existing preferences remain valid. |
| Analytics/reports | Fall back to raw/repository-backed reports. | Rebuild aggregates from source collections. | Aggregates must be rebuildable and non-authoritative. | Reports stay available, even if slower. |

Rollback requirements:

| Requirement | Description |
| --- | --- |
| Rollback owner | Every production task identifies Manual, Codex, or provider owner for rollback. |
| Data backup | Any production write/backfill has a dry-run and backup/recovery note. |
| Feature disable path | Every provider or risky feature has an env/settings disable path. |
| Compatibility window | Readers tolerate old and new data until migration is verified. |
| Verification after rollback | Run targeted smoke plus `npm run typecheck`, `npm run lint`, `npm run build` when code changed. |

## Operational Health Dashboard

This section defines future monitoring scope only. Do not implement dashboard UI until `HEALTH-001` is approved.

| System | Health Signals | Source / Future Source | Alert Condition | Owner |
| --- | --- | --- | --- | --- |
| Firebase | Admin SDK init, REST fallback, read/write diagnostics, rules/index errors. | Existing diagnostics APIs, Firebase Console. | Admin init failure, permission denied spike, REST fallback failure. | Manual + Codex |
| Functions | Function deployment status, webhook/function errors, cold start/runtime errors. | Firebase Functions logs. | Repeated provider webhook failures or function crash. | Manual |
| SMTP | SMTP auth, send success/failure, rate limits, outage alert delivery. | Existing SMTP send paths and future notification logs. | Auth failure, repeated send failure, placeholder password. | Manual |
| SMS | Provider auth, send status, delivery callbacks, balance/quota. | Future SMS adapter/provider dashboard. | Provider failure, low balance, delivery failure spike. | Manual + Codex |
| WhatsApp | Token validity, phone id, webhook verification, template status, send failures. | `/api/whatsapp/*`, provider dashboard, event logs. | Token expired, webhook failed, template rejected, rate limited. | Manual + Codex |
| Push | Subscription count, send success/failure, invalid subscriptions. | Future push adapter and service worker events. | High invalid subscription rate or send failure spike. | Codex |
| Printer | Printer profile status, test print, print log failures, reprint count. | Printer repository/API and print logs. | Repeated failed print attempts or missing default printer. | Codex |
| Storage | Cloudinary signing/upload success, asset load failures, quota. | Cloudinary dashboard and signing route. | Upload/signature failures or quota warnings. | Manual + Codex |
| Payments | Order create/verify/webhook success, signature failures, settlement exceptions. | Razorpay dashboard, payment routes, `paymentIntents`. | Webhook signature failure, verification failure, settlement mismatch. | Manual + Codex |
| Queues | Offline queue depth, retry count, dead-letter count, stuck items. | Offline queue and future notification queue. | Queue age/depth exceeds threshold or repeated retry failure. | Codex |

Health dashboard rules:

| Rule | Requirement |
| --- | --- |
| No secrets | Dashboard must never show provider secrets, private keys, OTPs, or raw tokens. |
| Tenant-aware | Restaurant-specific health must be scoped by authenticated owner/admin access. |
| Actionable | Each health card needs status, last checked time, reason, and next action. |
| Manual-aware | External provider failures must clearly say when manual console access is required. |
| Non-blocking | Customer ordering should degrade gracefully when non-critical channels fail. |

## 14. Verification Checklist

Run after documentation-only changes:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

If PowerShell blocks npm scripts, use:

```bat
cmd /c npm run typecheck
cmd /c npm run lint
cmd /c npm run build
git diff --check
```

Implementation verification additions:

| Change type | Additional checks |
| --- | --- |
| Theme/UI | `npm run theme:contrast`, desktop/mobile screenshot checks |
| Firebase schema/rules | Firebase emulator or staging rules/index validation |
| Owner APIs | Authenticated owner route smoke and 403 unauthenticated check |
| Public customer data | No-store headers and stale-cache checks |
| QR | Signed QR session validation and device/session expiry checks |
| Printing | 58mm/80mm/100mm/A4 preview and print log checks |
| Payments | Provider sandbox/live webhook signature checks |

Current documentation-only verification status:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## 15. Deployment Checklist

Before production deployment:

| Step | Required |
| --- | --- |
| Environment | Hostinger env values match `.env.hostinger.example` with real secrets. |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` valid. |
| Public Firebase | `NEXT_PUBLIC_FIREBASE_*` values match production Firebase project. |
| App URL | `NEXT_PUBLIC_APP_URL` uses final HTTPS domain. |
| QR secret | `TABLE_QR_SECRET` set if production QR tokens must survive env changes. |
| Cloudinary | Public cloud name and server API credentials configured. |
| SMTP | Gmail/app SMTP credentials valid and `SMTP_FROM` set. |
| Database alerts | `DATABASE_ALERT_EMAIL` and Admin CMS alert recipient set. |
| Maps/OAuth | Mapbox token and Google OAuth authorized domains configured. |
| Payments | Razorpay keys/webhook secret configured only before live payment launch. |
| Rules/indexes | Firestore rules and indexes deployed when changed. |
| Build | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` pass. |
| Cache | Hostinger cache cleared after redeploy. |
| Smoke routes | `/`, `/api/release-info`, `/owner/login`, `/owner/pos`, `/admin/login` verified. |

## Project Standards

### Repository Pattern

Use `src/repositories/*` for server-side Firestore domain access. Do not duplicate query/write logic in new route handlers when a repository exists.

### Tenant Isolation

Every restaurant-scoped document must include `restaurantId` or canonical tenant id. Owner/admin APIs must validate the session and scope before reading/writing.

### Error Handling

Return safe user-facing errors. Logs may include sanitized diagnostics but must not expose private keys, env values, stack traces, Firestore internals, or provider secrets to customers.

### Logging

Use scoped server logs for diagnostics. Keep client logs minimal and non-sensitive.

### Loading States

Use existing state components, skeletons, and guarded timeout/retry patterns. Preserve abort cleanup for fetches and listener unmounts.

### Toast Rules

Use existing toast/alert infrastructure. Avoid duplicate toasters. Mobile-critical confirmation should use the existing animated alert/provider patterns.

### Dialog Rules

Use existing Radix/shadcn-style dialog/sheet primitives. Preserve focus handling, Escape close, outside-click behavior, and mobile bottom-sheet patterns.

### Accessibility

Buttons need accessible labels. Inputs need labels or ARIA labels. Keyboard close/escape behavior should remain on drawers/dialogs.

### Responsive Design

Maintain mobile-first customer ordering and dense operational owner/POS layouts. Do not add marketing-style hero pages for operational tools.

### Security

Validate sessions server-side. Never rely on client role state for protected writes. Keep provider secrets server-only.

### Validation

Use Zod schemas where present. Do not parse structured data with fragile string logic when schemas/helpers exist.

### Caching

Public customer catalog APIs and restaurant pages must avoid stale CDN/SW cache. Preserve no-store headers and service-worker bypasses.

### Offline

Owner/POS offline queue is scoped to operational routes. Do not mount offline sync globally on admin/customer routes without explicit design.

### Realtime

Always clean up `onSnapshot`, EventSource, intervals, timeouts, event listeners, and AbortControllers on unmount.

### Firestore

Check `src/firebase/collections.ts`, repositories, `docs/firestore-schema.md`, rules, indexes, seed scripts, and cleanup scripts before schema changes.

### Naming Convention

Use domain-specific filenames and route groups. Avoid duplicate generic names outside allowed App Router conventions (`page.tsx`, `route.ts`, `layout.tsx`, `error.tsx`).

### Folder Convention

Routes live in `src/app`. Shared UI in `src/components`. Composite screens in `src/components/flows`. Domain services in `src/services`. Server data repositories in `src/repositories`. Shared server helpers in `src/lib/server`.

### Environment Variables

Environment parsing lives in `src/lib/env.ts`, environment docs in `.env*.example`, and production validation in `scripts/validate-production-env.mjs`.

## Audit Notes

Scans performed on 2026-07-01:

| Scan | Result |
| --- | --- |
| Repository file inventory | Completed with `rg --files`. |
| Existing architecture docs | Reviewed `ARCHITECTURE.md`, `docs/EXISTING_FEATURES.md`, `docs/project-tracker.md`, `docs/firestore-schema.md`, `docs/final-production-readiness-report.md`. |
| API routes | Found 65 route handlers under `src/app/api`. |
| Repositories | Found 16 repository files under `src/repositories`. |
| Services | Found 31 service files under `src/services`. |
| Duplicate filenames | Found expected App Router duplicates and domain duplicates listed in technical debt. |
| Debt markers | Found placeholders for provider integrations, legacy docs, and architecture placeholders. |
| Realtime/listener cleanup | Existing cleanup patterns found across hooks/components; continue enforcing cleanup. |
| Environment variables | Required production env keys documented in examples and validation script. |

## Release Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| Release Readiness | 92% code-ready; remaining blockers are manual deployment/provider checks. |
| Audit Scope | Tracker integrity, dead-route search, QR route wiring, owner API error exposure, offline/listener cleanup patterns, deployment blockers. |
| Bugs Found | 3 confirmed local issues. |
| Bugs Fixed | 3 fixed in this pass. |
| Remaining Bugs | No new local code blocker found; manual production checks remain. |
| Manual Tasks | MAN-001, MAN-002, MAN-003, MAN-004, MAN-006, MAN-007, MAN-008. |
| Next Recommended Task | Complete MAN-002 Hostinger env validation, then MAN-006 cache clear/redeploy and hosted route smoke. |

Fixed issues:

| ID | Area | Fix | Verification |
| --- | --- | --- | --- |
| FIX-2026-07-01-A | Tracker integrity | Removed an embedded pasted prompt from the Current Project Status table. | Markdown structure reviewed; prompt marker search returned no matches. |
| FIX-2026-07-01-B | Customer tracking | `/track-order` now submits the entered order id to `/order/{id}` instead of linking every lookup to `/order/search`. | `npm run typecheck`, `npm run lint`, and `npm run build` passed. |
| FIX-2026-07-01-C | Owner API hardening | Owner customers, analytics, loyalty rules, and system diagnostics now return safe generic errors and sanitized request-id logs. | `npm run typecheck`, `npm run lint`, and `npm run build` passed. |

Performance and lifecycle audit:

| Area | Result |
| --- | --- |
| Offline sync | Existing sync engine is a singleton starter; interval and service-worker listener are app-lifetime operational infrastructure, not component unmount leaks. |
| Realtime | Existing listener cleanup patterns remain the standard; no new listener or polling path was added. |
| Route behavior | QR token route remains wired through `/order/[id]` and table tokens containing `.` route into `TableQrOrderingFlow`. |

Security and accessibility improvements:

| Area | Improvement |
| --- | --- |
| Security | Owner operational APIs patched in this pass no longer echo raw exception messages to clients. |
| Logging | New logs include request ids and error class only, not stack traces, provider secrets, or Firestore internals. |
| Accessibility | Track order lookup is now a real labeled form with disabled empty submit state. |

Production risks still open:

| Risk | Owner | Next Action |
| --- | --- | --- |
| Hostinger env incompleteness | Manual | Complete MAN-002 and run production-equivalent env validation. |
| Stale hosted cache/deployment | Manual | Complete MAN-006 after env validation. |
| SMTP/provider delivery | Manual | Complete MAN-004 before relying on OTP/outage/order mail. |
| Firestore rules/index drift | Manual + Codex | Complete SEC-001 and MAN-008 with Firebase access. |
| Provider placeholders | Manual + Codex | Keep WA/SMS/PUSH/META/DEL tasks gated until provider launch is explicitly requested. |

## Customer Module Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| Customer Readiness | 96% code-ready for customer flows; remaining risk is manual browser/device verification and production provider/env access. |
| Screens Audited | Home, restaurants, restaurant detail/menu/item, cart, checkout, order success, track order, recent orders, reorder, reviews, offers, loyalty, profile, saved addresses, support entry points, authentication, forgot password, Google login. |
| Bugs Found | 9 confirmed customer-facing issues. |
| Bugs Fixed | 9 fixed in this pass. |
| Remaining Customer Bugs | No confirmed local customer blocker remains after static/code audit; manual mobile/browser smoke still required. |
| Known Risks | Production Firebase rules/env, Google authorized domains, SMTP/provider access, and real-device layout/autofill behavior require manual validation. |
| Next Sprint Recommendation | Run manual customer smoke on mobile/tablet/desktop, then complete Hostinger env/cache deployment tasks before provider-roadmap work. |

Customer bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| CUST-FIX-001 | Track Order | `/track-order` now routes the entered order id to `/order/{id}` instead of the dead literal `/order/search` path. |
| CUST-FIX-002 | Saved Address | Customer account API no longer returns raw repository/Firebase errors to the browser; duplicate/not-found/invalid cases map to friendly copy. |
| CUST-FIX-003 | Saved Address | Profile address save/delete catches network/API failures, logs details to console, and shows friendly customer messages. |
| CUST-FIX-004 | Customer Account Loading | `useCustomerData` now handles fetch/network failures instead of leaving profile/orders/addresses stuck in loading. |
| CUST-FIX-005 | Order Tracking | `useRealtimeOrder` now handles missing order ids, failed fetches, and retry polling errors with safe error state and interval cleanup preserved. |
| CUST-FIX-006 | Order Success | Missing/failed order receipt load now shows a recoverable empty state instead of an infinite receipt loader. |
| CUST-FIX-007 | Cart | Empty cart checkout no longer navigates to `/checkout`; the disabled state is now a real disabled button, not a disabled `Link`. |
| CUST-FIX-008 | Checkout Mobile | Checkout form now has mobile bottom padding so the sticky submit button does not cover lower validation/actions. |
| CUST-FIX-009 | Reviews/Reorder | Review edits preserve original `createdAt` so the 24-hour edit window cannot be extended; review/reorder dialogs now support Escape close and labelled modal semantics. |

Customer UX and accessibility improvements:

| Area | Improvement |
| --- | --- |
| Error Handling | Customer account, order, address, favorite, review, and tracking failures show safe user copy while logging diagnostic reason to console/server. |
| Validation | Address duplicate/invalid cases, empty cart checkout, missing order id, and missing receipt all have explicit recoverable states. |
| Mobile Layout | Checkout sticky action has spacing protection for one-hand mobile usage. |
| Accessibility | Track-order form, review dialog, and reorder dialog have clearer labels/modal semantics; Escape closes review/reorder dialogs. |
| Performance | Existing order polling interval cleanup remains intact; failed customer data fetches no longer spin indefinitely. |

Customer verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Manual customer smoke still recommended:

| Flow | Manual Check |
| --- | --- |
| Saved Address | Add/edit/delete home and work addresses; verify duplicate-friendly error and checkout autofill. |
| Review Flow | Submit review for a completed order, edit within 24 hours, verify one review per completed order and average rating. |
| Reorder | Reorder with empty cart, same-restaurant cart, other-restaurant cart, unavailable items, and price changes. |
| Checkout | Mobile sticky checkout, scheduled order slot, immediate order default, delivery validation, and order success redirect. |
| Tracking | `/track-order`, `/order/{id}`, recent orders, invoice link, help link, and missing order state. |
| Authentication | Email login, forgot password, Google login, phone-required profile redirect, and saved cart/account continuity. |

## POS Module Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| POS Readiness | 98% code-ready for day-to-day restaurant POS operations; remaining risk is manual browser, printer, and hardware-device validation. |
| Audit Scope | Order creation, customer lookup, walk-in orders, dine-in/table, parcel, delivery, QR settlement handoff, discount, coupon-style discount entry, GST/tax toggles, service/packing charge, quantity changes, hold/resume, payment capture, bill preview, kitchen dispatch, print/reprint, download, destructive actions, loading/error states, accessibility, and cleanup patterns. |
| POS Bugs Found | 10 confirmed POS stability issues. |
| POS Bugs Fixed | 10 fixed in this pass. |
| Remaining POS Bugs | No confirmed local POS blocker remains after code/static audit; split bill, merge bill, wallet, refund, and hardware drawer flows remain placeholders/future operational scope unless already supported by restaurant process. |
| Remaining Risks | Real 58mm/80mm/A4 printer output, cashier tablet ergonomics, live staff permissions, and production owner session behavior need manual smoke testing. |
| Manual Tasks | Verify POS on tablet/desktop, run real printer checks for bill/KOT/reprint/download, test owner/cashier permission paths, and validate Hostinger production session after MAN-002/MAN-006. |
| Next Sprint | Manual POS device/printer smoke, then complete Hostinger env/cache deployment tasks before provider-roadmap work. |

POS bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| POS-FIX-001 | Duplicate Orders | POS processing now ignores repeat submits while an order is already saving/syncing. |
| POS-FIX-002 | Button State | Send KOT, Checkout & Place, Hold, Save, and Clear are disabled during processing. |
| POS-FIX-003 | Kitchen Dispatch | KOT create/update now requires successful owner kitchen API responses instead of silently creating local fallback tickets. |
| POS-FIX-004 | Checkout Settlement | Checkout after new KOT creation now passes the created kitchen order id so the linked kitchen ticket can be completed reliably. |
| POS-FIX-005 | POS Bootstrap | POS data loading now checks API status, shows friendly failure copy, and logs only sanitized reason metadata. |
| POS-FIX-006 | Discount Validation | Negative discounts are blocked and percentage discounts are clamped to 100%. |
| POS-FIX-007 | Customer Lookup | The customer selector action now performs lookup instead of rendering a dead Add Customer button. |
| POS-FIX-008 | Clear Order | Clearing the current order now uses a confirmation dialog and resets the full draft safely. |
| POS-FIX-009 | Held Orders | Removing held orders now requires confirmation; resuming a held order over an active cart asks before replacing the cart. |
| POS-FIX-010 | Printing UX | Print-log failures no longer expose raw error objects, bill preview supports Escape close and modal labels, and PDF-ready downloads delay URL cleanup for browser reliability. |

POS workflow coverage:

| Workflow | Result |
| --- | --- |
| Order Creation | Stable with duplicate-submit guard and friendly failure handling. |
| Customer / Walk-in | Walk-in remains default; phone lookup button is wired to existing customer lookup. |
| Dine-in / Table | Dine-in still requires a valid table before KOT/checkout. |
| Parcel / Delivery | Parcel and delivery remain supported; delivery address validation remains required for delivery. |
| Discounts / Coupons | Existing discount entry supports percentage, flat, item, and coupon-style values with clamping. |
| Tax / GST / Charges | Existing GST, service charge, and parcel charge controls remain in the POS bill calculation path. |
| Hold / Resume | Hold/save/resume uses existing local held-order store with replace/remove confirmations. |
| Payment Methods | Cash, UPI, card, and credit/manual tender remain existing local payment markers; no payment provider work was added. |
| Kitchen Dispatch | Existing kitchen API path is reused; failed dispatch now blocks success state. |
| Printing | Existing 58mm/80mm/100mm/A4 preview, customer/cashier/kitchen/duplicate copies, reprint, and PDF-ready download were preserved. |
| Cancel / Refund | No new refund implementation added; destructive local clear/remove paths are guarded. |

POS verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active; existing protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Kitchen Operations Center Stabilization Audit - 2026-07-02

| Field | Result |
| --- | --- |
| Kitchen Readiness | 98% code-ready for day-to-day kitchen operations; remaining risk is manual tablet/TV, browser audio, realtime, and physical printer validation. |
| Audit Scope | Kitchen order bootstrap, realtime SSE, status lifecycle, cancelled/served mapping, card actions, bulk actions, KOT print/reprint/preview, sound alerts, timers, filters, fullscreen, accessibility, friendly error handling, and cleanup patterns. |
| Kitchen Bugs Found | 12 confirmed Kitchen stability issues. |
| Kitchen Bugs Fixed | 12 fixed in this pass. |
| Remaining Kitchen Bugs | No confirmed local Kitchen blocker remains after code/static audit; physical KOT printer behavior, TV/tablet ergonomics, production SSE behavior, and browser audio policy still need manual smoke testing. |
| Remaining Risks | Real 58mm/80mm/A4 KOT output, long-running TV mode, hosted owner session permissions, and live order handoff from POS/QR need staging or production validation. |
| Manual Tasks | Verify `/owner/kitchen` on tablet/desktop/TV, test realtime updates from POS/QR/order desk, print/reprint/preview KOT on real printers, test browser sound mute/unmute, and validate bulk cancel/complete against staging data. |
| Next Sprint | Manual Kitchen/POS integrated smoke, then complete Hostinger env/cache deployment tasks before starting any new roadmap feature. |

Kitchen bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| KITCHEN-FIX-001 | API Errors | Kitchen list/create/update routes now return friendly generic errors and log sanitized diagnostics only. |
| KITCHEN-FIX-002 | Realtime SSE | Kitchen stream snapshot failures now emit safe client messages instead of raw Firestore errors. |
| KITCHEN-FIX-003 | Status Mapping | Cancelled Kitchen tickets stay cancelled instead of being displayed as completed; served is now a distinct step before completion. |
| KITCHEN-FIX-004 | Bootstrap Loading | Kitchen and table bootstrap fetches now use abort guards, response validation, friendly failure toast, and sanitized console diagnostics. |
| KITCHEN-FIX-005 | Status Rollback | Failed status updates now roll back the affected card and show safe toast feedback. |
| KITCHEN-FIX-006 | Shared Actions | Kitchen cards now share status, cancel, preview, print, and reprint helpers instead of duplicating local action logic. |
| KITCHEN-FIX-007 | Cancel Confirmation | Ticket cancel now requires an accessible confirmation dialog with Escape close and focus return. |
| KITCHEN-FIX-008 | Bulk Actions | Bulk Ready, Serve Ready, Complete Served, and Bulk Cancel are wired with rollback on partial failure and confirmation for destructive actions. |
| KITCHEN-FIX-009 | KOT Printing | Print, reprint, and preview reuse the existing KOT window path, avoid duplicate auto-print generation, and hide print-log internals from users. |
| KITCHEN-FIX-010 | Sound Alerts | New-order sound alerts play once per new ticket, skip initial bootstrap spam, and respect mute/settings state. |
| KITCHEN-FIX-011 | Timers | Kitchen timers now guard invalid dates, avoid negative elapsed values, and keep the single interval cleanup pattern. |
| KITCHEN-FIX-012 | Filters and TV Mode | Status, priority, table, source, station, and search filters now work with empty states; fullscreen supports Escape and wider TV board columns. |

Kitchen workflow coverage:

| Workflow | Result |
| --- | --- |
| Order Intake | Existing owner Kitchen API and SSE paths are reused; no new API or collection was added. |
| Status Lifecycle | New, accepted, preparing, ready, served, completed, billed, and cancelled states render explicitly. |
| Bulk Operations | Non-destructive ready/serve actions run directly; complete/cancel require confirmation. |
| KOT | Existing print/reprint/logging flow is preserved with safe preview and error handling. |
| Sound | Alerts are one-time per new order after initial load and respect the mute toggle. |
| Filters | Search, status, priority, table, source, station, QR/POS/parcel/delivery source filtering, and empty states are covered. |
| Accessibility | Card actions have labels; confirmation dialog has modal semantics, Escape close, and focus return. |
| Performance | Bootstrap abort, EventSource cleanup, singleton timer cleanup, and no duplicate realtime listeners were preserved. |

Kitchen verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Initial run was blocked by the active Next dev-server guard; passed with `SARVA_ALLOW_BUILD_WITH_DEV=1`. Existing protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Master Menu Library Import Stabilization - 2026-07-02

| Field | Result |
| --- | --- |
| Master Library Readiness | 98% code-ready; remaining validation is manual import smoke with production admin credentials. |
| Master Menu Bugs Found | 1 confirmed import compatibility issue. |
| Master Menu Bugs Fixed | 1 fixed in this pass. |
| Remaining Risks | Admin must manually import the provided JSON/CSV/XLSX dataset into production before owners can see live master templates. |
| Manual Tasks | Admin import provided Kerala JSON, verify owner template picker, import one template into owner menu wizard, and confirm images/fallbacks. |

Master Menu bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| MENU-LIB-FIX-001 | Import Compatibility | Master template import now accepts the uploaded `keralaFoods` JSON shape, maps `itemName`, channel prices, packing charge, descriptions, cuisines, ingredients, nutrition, modifiers, add-ons, availability, ratings, and images, and supports JSON/CSV/XLSX loading from the existing Admin Menu Library screen. |

Master Menu verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Master Menu Final Stabilization - 2026-07-02

| Field | Result |
| --- | --- |
| Master Library Readiness | 99% code-ready; remaining validation is manual production admin/owner smoke after redeploy. |
| Master Menu Bugs Found | 8 production-readiness gaps. |
| Master Menu Bugs Fixed | 8 fixed in this pass. |
| Remaining Risks | Firestore rules/deployment and real admin/owner browser credentials still require manual production validation. |
| Manual Tasks | Import provided Kerala JSON/CSV/XLSX in Admin, verify dashboard counts, export samples, refresh Owner picker, and import one template into owner menu wizard. |

Master Menu bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| MENU-LIB-FIX-002 | Import Summary | Admin import now refreshes UI/counts and reports imported, skipped, merged, duplicates, and failed rows. |
| MENU-LIB-FIX-003 | Empty Library UX | Empty library state now shows an illustration, import actions, and sample downloads for JSON, CSV, and Excel. |
| MENU-LIB-FIX-004 | Owner Picker | Owner picker uses no-store masterMenuTemplates reads, cache-busting refresh, and a manual Refresh action. |
| MENU-LIB-FIX-005 | Search and Filters | Master template search covers item name, keywords, category, cuisine, tags, ingredients, and descriptions; filters now include subcategory, availability, rating, price, prep time, popular, and newest. |
| MENU-LIB-FIX-006 | Duplicate Protection | Admin import detects duplicates by item name, category, cuisine, and food type; owner template import blocks duplicate restaurant menu drafts by name, category, and variant. |
| MENU-LIB-FIX-007 | Import Preview | Admin import shows a preview table with image, item, category, cuisine, price, and New/Merged/Duplicate/Skipped status before import. |
| MENU-LIB-FIX-008 | Export and Samples | Admin library supports JSON, CSV, and Excel export for entire, selected, or filtered records plus schema-based sample downloads. |
| MENU-LIB-FIX-009 | Dashboard Counts | Admin library top cards now show total items, categories, cuisines, recently imported, and duplicate counts. |

Master Menu final verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Production Release Readiness Audit - 2026-07-03

| Field | Result |
| --- | --- |
| Production Readiness | 92% release-ready; local code passes, production access/configuration blockers remain. |
| Code Readiness | 97% code-ready across completed Customer, Owner, Kitchen, POS, QR Ordering, and Master Menu modules. |
| Audit Scope | Codebase markers, API/session patterns, Firestore/rules/index coverage, env validation, provider readiness, runtime logs, listener/timer hotspots, bundle/component size, UX state coverage, and deployment metadata. |
| Files Changed | Documentation only: `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Release Recommendation | Hold production release until P0 blockers are cleared; app is a release candidate after Hostinger env/cache/redeploy, Firestore rules/index review, and browser/provider smoke pass. |

Audit commands and results:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning from Firebase/protobuf loader path. |
| `npm run validate:prod-env` | Failed locally: missing `NEXT_PUBLIC_APP_ENV`, Firebase Admin values, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| Private API auth scan | No unauthenticated private API route file was listed by the scan; public/auth/payment/cloudinary/release routes remain intentionally separate. |
| Firestore rules/index scan | `masterMenuTemplates`, `phoneVerificationSessions`, `emailOtps`, and `modulePasswordOtps` are used by code but were not found in `firestore.rules`; deployment review remains required. |

Critical issues found:

| ID | Area | Finding | Evidence | Owner | Required Action |
| --- | --- | --- | --- | --- | --- |
| PROD-AUDIT-CRIT-001 | Production Env | Production-equivalent env validation fails locally. | `npm run validate:prod-env` reports missing `NEXT_PUBLIC_APP_ENV`, Firebase Admin credentials, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`. | Manual | Complete MAN-002/MAN-003 and rerun validation with real Hostinger env. |
| PROD-AUDIT-CRIT-002 | Deployment | Hostinger still points to older validated SHA than current audited code. | Tracker metadata: current Git `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6`; Hostinger `35017398773ba04efbdc3ab37d250cfa547c0675`. | Manual | Complete MAN-006, clear cache, redeploy, verify `/api/release-info` and smoke routes. |
| PROD-AUDIT-CRIT-003 | Firestore Rules | Newer live collections are not matched in local rules scan. | `masterMenuTemplates`, `phoneVerificationSessions`, `emailOtps`, `modulePasswordOtps` found in code but not in `firestore.rules`. | Manual + Codex | Complete SEC-001/MAN-008 before release; add or confirm server-only intent, deploy rules/indexes, smoke protected flows. |

Medium issues found:

| ID | Area | Finding | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| PROD-AUDIT-MED-001 | API Errors | Some route handlers still return raw `error.message` for domain failures. | `src/app/api/owner/tables/route.ts`, `src/app/api/owner/sync/route.ts`, `src/app/api/owner/profile/route.ts`, `src/app/api/owner/offers/route.ts`, `src/app/api/auth/phone-verification/route.ts`. | Keep as targeted release hardening if testing confirms user-visible technical messages. |
| PROD-AUDIT-MED-002 | Runtime Logging | Runtime logs remain in selected server/client paths. | `rg console.*` found sanitized logs plus raw error logging in notification/session/table/profile/public paths. | Audit high-traffic production logs after deployment; keep diagnostics sanitized and non-sensitive. |
| PROD-AUDIT-MED-003 | Bundle / Maintenance | Large client flow components remain maintenance and route-bundle risks. | Largest flows: `owner-menu-management-flow.tsx` ~164 KB, `restaurant-detail-flow.tsx` ~140 KB, `owner-settings-flow.tsx` ~95 KB, `pos-billing-flow.tsx` ~79 KB. | Defer code splitting to PERF-001 after release smoke; do not refactor during release freeze. |
| PROD-AUDIT-MED-004 | Provider Readiness | Razorpay, WhatsApp Cloud API, SMTP, Google/Firebase auth domains, Cloudinary, and Mapbox remain production-access dependent. | Existing MAN/PAY/WA tasks and failed env validation. | Complete provider smoke with real credentials before enabling live launch expectations. |
| PROD-AUDIT-MED-005 | UX / Browser Smoke | Code-level loading/empty/error states are improved, but full browser/device smoke is still manual. | Tracker module notes for Customer, Owner, Kitchen, POS, QR, Printing, Master Menu. | Run RELEASE-SMOKE-001 on mobile/tablet/desktop/TV/printer after redeploy. |

Low priority improvements:

| ID | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| PROD-AUDIT-LOW-001 | Compatibility Naming | Legacy/demo/mock compatibility names remain in type names, mappers, and seed/cleanup paths. | Keep until a planned cleanup; do not rename during release. |
| PROD-AUDIT-LOW-002 | Dev Scripts | CLI scripts contain expected `console.log`/sample/legacy labels. | Accept for scripts; keep production sample flags off. |
| PROD-AUDIT-LOW-003 | XSS Surface | Legal rendering uses sanitizer and CMS editor uses controlled admin HTML editing. | Keep legal sanitizer tests/manual checks in future e2e suite. |
| PROD-AUDIT-LOW-004 | Listener Hotspots | Listener/timer/EventSource scan found expected operational listeners with existing cleanup patterns; offline sync is app-lifetime infrastructure. | Recheck only if manual long-running TV/POS smoke shows leaks. |

Production audit conclusion:

| Area | Result |
| --- | --- |
| Codebase | No new release-blocking code failure found by typecheck, lint, build, or static scans. |
| Security | Auth/session/tenant patterns are broadly present; release is blocked by env/rules/provider validation, not by a newly confirmed code exploit. |
| Performance | No new duplicate listener blocker confirmed; large flow components remain tracked future debt. |
| UX | Completed modules are code-ready; manual browser/device/printer smoke remains required. |
| Production | Not ready to release until env, Firestore rules/indexes, Hostinger redeploy, and provider smoke are complete. |

## POS and Kitchen Operations Stabilization - 2026-07-03

| Field | Result |
| --- | --- |
| POS/Kitchen Readiness | 98% code-ready for the confirmed P0 workflow fixes; full milestone acceptance still needs manual multi-device restaurant smoke. |
| Scope Completed | Canonical POS draft persistence, kitchen/payment flow decoupling, active order visibility, sidebar count accuracy, incremental KOT generation, and Kitchen mobile layout cleanup. |
| Files Changed | `src/app/api/owner/pos/route.ts`, `src/repositories/order-repository.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/modules/owner/pos/components/cart-panel.tsx`, `src/components/flows/kitchen-display-flow.tsx`, `src/lib/app-store.ts`, `src/lib/operational-api-mappers.ts`, `src/components/flows/order-tracking-flow.tsx`, `src/types/entities.ts`, `src/types/firebase.ts`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Remaining Risk | Browser, tablet, printer, and multi-user realtime smoke remain manual; production env/rules/redeploy blockers from the production audit still apply. |

Fixed issues:

| ID | Area | Fix |
| --- | --- | --- |
| POS-KDS-FIX-001 | Draft Persistence | POS draft order now persists through the owner POS API into the existing `orders` collection as a single deterministic draft document instead of relying on the persisted browser store. |
| POS-KDS-FIX-002 | Remove Item Refresh | Add item, remove item, quantity changes, order type, table, customer, waiter, payment, discount, GST/parcel charge, address, landmark, and notes now commit through the canonical draft write path. |
| POS-KDS-FIX-003 | Empty Draft Cleanup | Removing the last item or clearing/holding/submitting the order deletes the canonical draft so refresh opens an empty Order Desk. |
| POS-KDS-FIX-004 | Kitchen/Payment Independence | Collecting payment updates `paymentStatus` only and no longer forces the Kitchen ticket to `completed`; kitchen status remains its own state machine. |
| POS-KDS-FIX-005 | Send To Kitchen | POS review action now exposes `Send To Kitchen` as the primary action, with payment collection optional. |
| POS-KDS-FIX-006 | Incremental KOT | Adding items after a linked Kitchen ticket exists creates a new rush incremental KOT containing only the newly added quantities instead of resending the full original order. |
| POS-KDS-FIX-007 | Active Orders | POS Active Orders now includes live Kitchen tickets with kitchen status, payment status, table/customer/order type, ETA, waiter, amount, and quick action surface instead of only repository customer orders. |
| POS-KDS-FIX-008 | Sidebar Counts | POS sidebar counts now use active customer orders plus active Kitchen tickets, pending Kitchen queue, today's completed past orders, and held order count instead of broad/demo counts. |
| POS-KDS-FIX-009 | Kitchen Mobile | Kitchen board now removes forced horizontal width on mobile, adds touch-friendly status tabs, and reduces dashboard statistics to live operational counts. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Draft Persistence | Browser-smoke add/remove/refresh/last-item-delete across cashier and waiter devices. |
| Multi-user Realtime | Verify two-device POS/Kitchen updates, incremental KOT visibility, and Kitchen sound behavior in a real browser session. |
| Billing/Printing | Test bill/KOT/receipt output on 58mm and 80mm printers. |
| Production | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, and hosted route smoke before release. |

## Mobile Kitchen Operations Center Redesign - 2026-07-03

| Field | Result |
| --- | --- |
| Kitchen Mobile/Tablet Readiness | 99% code-ready; desktop Kitchen view intentionally unchanged. |
| Scope Completed | Added a mobile/tablet-only Kitchen shell for `0-1024px` with sticky compact header, status chips, collapsible summary, bottom-sheet filters, order-type/staff/printer filters, compact swipe-ready cards, tablet two-column order grid, quick actions, More panel, and bottom navigation. |
| Files Changed | `src/components/flows/kitchen-display-flow.tsx`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Desktop Impact | Existing desktop Kanban/statistics/timeline/history/footer render path is preserved behind `min-[1025px]`; no desktop business logic or API changes were made. |
| Remaining Risk | Manual mobile/tablet browser smoke is required for swipe gestures, one-hand ergonomics, sticky bottom actions, printer selection, sound toggle, and long-running Kitchen sessions. |

Fixed issues:

| ID | Area | Fix |
| --- | --- | --- |
| KITCHEN-MOBILE-FIX-001 | Mobile Layout | Replaced squeezed mobile Kanban with a mobile/tablet-only order-first interface using status chips and one visible queue at a time. |
| KITCHEN-MOBILE-FIX-002 | Statistics | Moved dashboard metrics into a collapsed Today's Summary strip so orders appear first. |
| KITCHEN-MOBILE-FIX-003 | Filters | Moved search, source, order type, priority, table, station, staff, printer, auto-print, and sound controls into an Escape-closeable bottom sheet on mobile/tablet. |
| KITCHEN-MOBILE-FIX-004 | Cards | Added compact order cards with priority left border, hidden overflow item list, sticky action row, and 44px touch targets. |
| KITCHEN-MOBILE-FIX-005 | Gestures | Added swipe right for next status, swipe left for reject/cancel, and long press for KOT preview on compact cards. |
| KITCHEN-MOBILE-FIX-006 | Tablet | Added two-column tablet queue layout without switching to desktop Kanban before `1025px`. |
| KITCHEN-MOBILE-FIX-007 | Navigation | Added mobile/tablet bottom navigation for Orders, Kitchen quick actions, and More with printer/KOT/history tools. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active; existing Firebase/protobuf dynamic dependency warning remains. |

Manual checks still required:

| Area | Task |
| --- | --- |
| Mobile | Verify sticky header/tabs/actions, filter sheet, swipe accept/reject, long-press preview, and bottom navigation on a real phone. |
| Tablet | Verify two-column card grid, touch targets, quick actions, and no desktop Kanban at 769-1024px. |
| Desktop | Verify existing desktop Kitchen remains unchanged above 1024px. |
| Operations | Verify realtime updates, sound, KOT print/reprint, and printer selection in browser after redeploy. |

## POS/Kitchen Production Test Checkpoint - 2026-07-03

| Field | Result |
| --- | --- |
| Checkpoint Status | Stable local production-test checkpoint. |
| Production Readiness | 94% release-ready; remaining blockers are manual deployment, provider, hardware, rules, and browser smoke validation. |
| Code Readiness | 98% code-ready across POS, Kitchen, Customer, Owner, QR, Printing, and Master Menu release surfaces. |
| Scope Frozen | No further implementation for Transfer Table, Merge Table, Split Bill, Payment Timeline, Audit Timeline, or Live Notifications in this sprint. |
| Diff Review | Clean: no sprint task markers, debug statements, commented-out code, merge markers, broken-import evidence, or newly added unused files found in the final diff review. |

Feature checkpoint status:

| Feature | Status | Notes |
| --- | --- | --- |
| Canonical POS Order Promotion | Complete | POS draft promotion is complete and protected for this checkpoint. |
| Payment Transactions | Complete | Existing payment transaction path is complete and protected for this checkpoint. |
| Print History | Complete | Existing print history/audit path is complete and protected for this checkpoint. |
| Kitchen/Order Linking | Complete | POS, order, and Kitchen linking is complete and protected for this checkpoint. |
| Active Orders Dashboard | Complete | Active Orders is the operational center for POS/Kitchen test coverage. |
| Waiter View | Complete | Waiter-focused live metrics and quick actions are available in Active Orders. |
| Cashier View | Complete | Cashier-focused pending bills, payments, collection, and receipt queue metrics are available in Active Orders. |
| Manager View | Complete | Manager-focused kitchen load, delayed order, revenue, and staff status metrics are available in Active Orders. |
| Kitchen Reminder | Complete | Reminder action is available from Active Orders. |
| Bill/KOT/Receipt Printing | Complete | Existing print flows and logging are preserved. |
| Partial Payment | Complete | Partial payment state is supported for checkpoint testing. |
| Transfer Table | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Merge Table | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Split Bill | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Payment Timeline | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Audit Timeline | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Live Notifications | Deferred | Next sprint enhancement; do not implement during this checkpoint. |

Final verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed after stopping active local dev server; existing Firebase/protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Access | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, and hosted route smoke. |
| Browser Smoke | Verify Customer, Owner, Admin, POS, Kitchen, QR, printer, and view-switch flows after redeploy. |
| Hardware | Test bill, receipt, KOT, and reprint output on real 58mm/80mm printers. |
| Multi-device | Verify POS/Kitchen realtime handoff, Kitchen sound, and active-order updates across cashier/waiter/kitchen devices. |

## RC1 Operational Foundation - 2026-07-03

| Field | Result |
| --- | --- |
| Scope Completed | Repository/API foundation only for Payment Timeline, Audit Timeline, and backend notification events. |
| Production Readiness | 95% release-ready; manual deployment, provider, hardware, rules, and browser smoke validation remain. |
| Files Changed | `src/repositories/order-repository.ts`, `src/app/api/owner/orders/route.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/types/firebase.ts`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Scope Still Deferred | Split Bill UI, Merge Table UI, Transfer Table UI, notification center UI, payment provider validation, and hardware validation. |

Completed foundation:

| Feature | Status | Notes |
| --- | --- | --- |
| Payment Timeline | Complete | Existing `orders`/`customerOrders` now store bill printed, payment started, partial payment, payment completed, refund, and receipt printed timeline events; `paymentTransactions` remains the payment transaction log. |
| Audit Timeline | Complete | Existing `auditLogs` and order `auditTimeline` now capture order created, item added, item removed, discount, coupon, kitchen sent, kitchen accepted, kitchen ready, reminder, payment, and completion foundation events. |
| Notification Foundation | Complete | Existing `notifications` collection receives backend events for new order, reminder, ready, payment, and completion. No notification UI was added. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Access | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, and hosted route smoke. |
| Browser Smoke | Verify payment timeline, audit timeline, and notification event writes from POS/Kitchen/Owner flows after redeploy. |
| Hardware | Test bill, receipt, KOT, and reprint output on real 58mm/80mm printers. |
| Provider | Razorpay refund/settlement and live payment provider validation remain manual/provider-gated. |

## RC1 Production Bug and Sprint 2 Operational Pass - 2026-07-03

| Field | Status |
| --- | --- |
| Sprint Status | P0 code stabilization complete; deferred operational UI remains next-release scope. |
| Scope | P0 operational bug fixes plus deferred operational surfaces only where they reuse existing POS, order, kitchen, audit, payment, print, and notification architecture. |
| Do Not Modify | QR Ordering, Menu Library, Customer Module, Authentication, repository architecture, completed API families, and Firestore collection names. |
| Started Tasks | Active Orders consistency, continue-payment diagnostics, parcel workflow sequencing, POS draft lifecycle, WEB order canonical display, Active Order actions, Active Order counters, mobile POS/Kitchen regression checks, notification UX boundaries, Split Bill, Transfer Table, Merge Tables, Payment Timeline, Audit Timeline, Notification Center UI, Order Timeline, Print History, Partial Payment, Operational Dashboard. |
| Completed Tasks | Active Orders canonical read model, order-only WEB card handling, continue-payment actionable errors, kitchen ticket validation, parcel send-to-kitchen sequencing, draft lifecycle verification path, production-ready Active Order actions, deferred action hiding/disabled state, repository-backed payment/audit/print/notification foundations, and operational counters. |
| Blocked Tasks | Split Bill UI, Transfer Table UI, Merge Table UI, Notification Center UI, and full visual Order Timeline remain blocked by the release-scope instruction to keep unfinished features disabled and avoid new screens/dialogs in this pass. |

Root causes fixed:

| ID | Root Cause | Fix |
| --- | --- | --- |
| RC1-P0-001 | Active Orders used two read models: Kitchen tickets rendered one card style while order-only records such as older `WEB-*` entries rendered legacy summary rows. | POS Active Orders now builds one canonical operational read model from existing `orders` and `kitchenOrders`; all active records render the same card component and counters derive from the same model. |
| RC1-P0-002 | Order-only active cards could pass their own order id as a kitchen ticket id during payment/event writes. | Synthetic order-only cards now omit `kitchenOrderId`; real kitchen-linked cards keep kitchen synchronization. |
| RC1-P0-003 | Continue payment failures collapsed stale drafts, missing kitchen tickets, duplicate payment, and server failures into generic copy. | Owner POS/orders APIs now map those failures to actionable safe messages with request ids while detailed diagnostics stay server-side. |
| RC1-P0-004 | POS draft promotion did not validate that the linked kitchen ticket still existed before placing the canonical order. | Repository promotion now verifies the kitchen ticket and tenant scope before deleting the draft and creating the canonical order. |
| RC1-P0-005 | Parcel orders entered Kitchen as a generic new ticket instead of beginning the preparing flow expected by restaurant operations. | Parcel send-to-kitchen now creates the kitchen ticket in `preparing` state while payment remains independent and optional. |
| RC1-P0-006 | Legacy active-order row code remained after the canonical card path was introduced. | Removed the unused row component so Active Orders has one production card surface. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Smoke | Verify hosted POS Active Orders, Kitchen refresh, payment collection, bill/receipt/KOT printing, and WEB order display after redeploy. |
| Multi-device | Verify customer/order-only, waiter, cashier, kitchen, manager, and owner views update from the same canonical read model. |
| Hardware | Test real 58mm/80mm receipt, bill, KOT, and reprint output. |
| Deployment | Complete Hostinger env/cache/redeploy, Firestore rules/index deployment, SMTP/provider checks, and route smoke. |

## RC2 Operational Workflow and Production Readiness - 2026-07-04

| Field | Result |
| --- | --- |
| Sprint Status | RC2 code implementation complete; production smoke remains manual. |
| Production Readiness | 96% release-ready; external env, deployment, rules, provider, browser, and hardware validation remain. |
| Scope Completed | Operational workflow completion in existing POS/order/Kitchen architecture: Split Bill, Transfer Table, Merge Tables, Order Timeline, Payment History, Print History visibility, and notification center filtering/read state. |
| Files Changed | `src/repositories/order-repository.ts`, `src/app/api/owner/orders/route.ts`, `src/app/api/owner/pos/route.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/components/layout/dashboard-topbar.tsx`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Scope Preserved | No duplicate APIs, repositories, components, Firestore collections, or route families were added. QR Ordering, Menu Library, Customer Module, authentication, and completed architecture remain untouched. |

Completed features:

| Feature | Status | Notes |
| --- | --- | --- |
| Split Bill | Complete | Active Orders now records split payments through the existing owner orders API and repository, writes split rows, payment transactions, receipt print queue entries, payment timeline, audit timeline, and notification events. |
| Transfer Table | Complete | Active Orders can transfer an active order to another table and waiter while updating the existing `orders`, `customerOrders`, and linked `kitchenOrders` documents. |
| Merge Tables | Complete | Active Orders can merge active orders into a target order, combine lines/totals/payment state, cancel merged source orders/tickets for audit continuity, and preserve merged references. |
| Order Timeline | Complete | Active Orders exposes repository-backed audit/status/payment timeline events from the existing order read model. |
| Payment History | Complete | Active Orders exposes payment timeline, split bill rows, and print history from existing order and printer log data. |
| Notification Center UI | Complete | Existing owner topbar notifications now support unread/read/all filters, category filters, mark-read, mark-all-read, and related-route opening without adding a new notification route or collection. |

Bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| RC2-FIX-001 | Active Order Actions | Disabled Split Bill, Transfer Table, and Merge Table placeholders were replaced with working operational flows. |
| RC2-FIX-002 | Payment Refresh | Active payment collection now refreshes the canonical POS read model after repository writes. |
| RC2-FIX-003 | Notification UX | Opening notifications no longer marks every alert as read automatically; read state is now explicit. |
| RC2-FIX-004 | Operational Audit | Split, transfer, and merge actions now write audit timeline, status history, auditLogs, and notification records through the existing repository path. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Smoke | Verify hosted POS Active Orders split, merge, transfer, payment, timeline, print history, and notification center after redeploy. |
| Multi-device | Verify cashier/waiter/kitchen/manager read-model updates across devices. |
| Hardware | Test real 58mm/80mm bill, receipt, split receipt, KOT, and reprint output. |
| Deployment | Complete Hostinger env/cache/redeploy, Firestore rules/index deployment, SMTP/provider checks, and route smoke. |
| Provider | Razorpay live refund/settlement, WhatsApp/SMS/push provider adapters, and external delivery GPS remain provider/future gated. |

## RC3 Production Hardening and Release Validation - 2026-07-04

| Field | Result |
| --- | --- |
| Sprint Status | Final RC3 production hardening complete within the approved RC2-modified implementation scope. |
| Production Readiness | 98% release-ready; remaining blockers require manual environment, rules, deployment, provider, hardware, and browser validation. |
| Scope Completed | Production safety fixes for repository consistency, timeline/payment history rendering, notification noise control, and operational dialog accessibility. |
| Files Changed | `src/repositories/order-repository.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/components/layout/dashboard-topbar.tsx`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Scope Preserved | No new business features, APIs, Firestore collections, repositories, route families, or UI redesigns were added. |

Production bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| RC3-FIX-001 | Merge Tables Consistency | Merged target orders now preserve source `paymentTimeline`, `splitBills`, and source audit timeline details, keeping payment history and audit review consistent after merge. |
| RC3-FIX-002 | Timeline Rendering | Order timeline, payment history, and print history now de-duplicate events when the canonical order and linked Kitchen ticket expose the same repository-backed timeline fields. |
| RC3-FIX-003 | Notification Center | Pending-payment notifications now ignore completed, delivered, cancelled, rejected, and zero-balance orders to prevent stale/noisy operational alerts. |
| RC3-FIX-004 | Operational Dialog Accessibility | Split, transfer, merge, timeline, and payment-history dialogs now trap focus, restore focus on close, support Escape, and lock background scrolling while open. |

Production hardening:

| Area | Result |
| --- | --- |
| Repository Consistency | Split, transfer, merge, payment, print, audit, and notification writes remain on existing repositories and collections; merge now carries source payment/split history into the target order. |
| API Hardening | Existing owner order/POS route validation, tenant scoping, authorization checks, dynamic/no-store read behavior, and safe error mapping were preserved. |
| Realtime / Refresh | POS canonical refresh remains the source for post-write active-order state; no new listeners or subscriptions were added. |
| Accessibility | RC2 modal workflows now include focus containment, focus restoration, Escape close, and scroll locking. |
| Performance | No new polling/listeners were introduced; timeline de-duplication reduces duplicate rendered rows in active operational dialogs. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Access | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, Firebase authorized domains, and hosted route smoke. |
| Browser Smoke | Verify Customer, Restaurant, QR Ordering, Owner, Kitchen, POS, Admin, Waiter, Printing, Notification Center, Split Bill, Transfer Table, Merge Tables, Timeline, Payment History, Print History, Phone Verification, and Master Menu Library flows after redeploy. |
| Multi-device | Verify POS/Kitchen realtime handoff, notification center state, payment status, timeline visibility, and active-order updates across cashier/waiter/kitchen/manager devices. |
| Hardware | Test real 58mm/80mm bill, receipt, split receipt, KOT, duplicate copy, and reprint output. |
| Provider | Razorpay live order/verify/webhook/refund/settlement, WhatsApp Cloud API, SMTP, SMS, push, Meta, GPS delivery, Cloudinary, Mapbox, and Google/Firebase auth checks remain provider/manual gated. |

Known production risks:

| Risk | Owner | Next Action |
| --- | --- | --- |
| Hostinger still needs current commit redeploy. | Manual | Clear cache, redeploy current branch, and verify `/api/release-info`. |
| Production env and provider secrets are not validated in this local workspace. | Manual | Complete Hostinger env validation with real credentials. |
| Firestore rules/index deployment remains manual. | Manual + Codex | Review and deploy rules/indexes in the target Firebase project. |
| Hardware and browser smoke remain external. | Manual | Run production smoke on real devices/printers after redeploy. |

## Release Freeze Production Deployment Documentation - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Documentation-only production deployment readiness finalization. |
| Code Changes | None. No business feature, UI redesign, API, repository, collection, or architecture change was made in this pass. |
| Production QA Result | No new repository-scope production bug was confirmed by the release-freeze audit and validation commands. |
| Release Readiness | 98% production-release ready pending manual infrastructure, provider, hardware, browser, and multi-device validation. |
| Files Changed | `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |

### Production Configuration Checklist

No fake values should be committed. Configure real values in Hostinger or the target production environment and verify with `npm run validate:prod-env`.

| Area | Required Production Configuration | Source / Validation | Status |
| --- | --- | --- | --- |
| App runtime | `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_APP_URL` set to final HTTPS domain, `NEXT_PUBLIC_USE_FIREBASE=true`. | `scripts/validate-production-env.mjs`, `/api/release-info`, hosted route smoke. | Manual pending |
| Firebase client | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, optional measurement id. | Firebase Console and env validation. | Manual pending |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` with escaped newlines; do not commit service account JSON. | Admin diagnostics, env validation, Hostinger private-key normalization. | Manual pending |
| Firebase auth domains | Hosted Hostinger domain and final custom domain authorized for Firebase/Google sign-in. | Firebase Console and customer Google sign-in smoke. | Manual pending |
| QR signing | `TABLE_QR_SECRET` set if printed QR codes must remain stable across redeploys. | Owner QR/table smoke. | Manual recommended |
| Cloudinary | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`; `CLOUDINARY_URL` optional alternative. | Upload/signature smoke and Cloudinary dashboard. | Manual pending |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; Gmail uses a 16 character app password. | OTP, owner credentials, order mail, outage alert smoke. | Manual pending |
| Database alerts | `DATABASE_ALERT_EMAIL` and matching Admin CMS customer-data alert recipient. | Admin CMS and outage alert smoke. | Manual pending |
| Google OAuth | `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`; public and server client ids must match. | Env validation and hosted Google sign-in smoke. | Manual pending |
| Mapbox | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` with no spaces or line breaks. | Owner/admin map smoke. | Manual pending |
| Razorpay | Required for production launch: set `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` together with live keys. | Razorpay sandbox/live order, verify, webhook, refund/settlement smoke. | Provider pending |
| WhatsApp Cloud API | `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` before Cloud API launch. | WhatsApp send/webhook event smoke. | Provider pending |
| SMS | Provider, sender id, compliance rules, OTP/transactional env values after provider selection. | Future SMS adapter/provider smoke. | Provider pending |
| Push | `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is required for production push readiness. | Push subscription, foreground/background notification, click deep link, and server send smoke. | Provider/device pending |
| Meta/social | Meta app credentials and approved permissions before production publishing. | Meta OAuth/publish smoke. | Provider pending |
| Build metadata | Optional `NEXT_PUBLIC_BUILD_VERSION`, `NEXT_PUBLIC_GIT_COMMIT_SHA`, `NEXT_PUBLIC_COMMIT_SHA`, `NEXT_PUBLIC_BUILD_DATE`, `NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP`. | `/api/release-info`, admin diagnostics. | Manual recommended |
| Dev/test login | `NEXT_PUBLIC_ENABLE_DEV_LOGIN=false`, `NEXT_PUBLIC_ENABLE_TEST_LOGIN=false` in production. | Hosted auth smoke. | Manual required |

### Firestore Production Audit Matrix

| Collection / Area | Repository / Owner | Production Consistency Check | Rule / Index Note |
| --- | --- | --- | --- |
| `orders` | `order-repository.ts`, owner orders/POS APIs, public order API. | Canonical order lifecycle, payment status, table transfers, merges, audit timeline, and customer-facing status remain synchronized. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `customerOrders` | `order-repository.ts` mirrors customer-facing order records. | Customer history and tracking remain aligned with canonical order updates. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `kitchenOrders` | `kitchen-repository.ts`, owner Kitchen/POS APIs. | POS/Kitchen handoff, status updates, cancellation, transfer, and merge continuity preserve tenant scope. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `paymentTransactions` | `order-repository.ts` payment/split actions. | Payment, partial payment, split bill, refund state, and payment history have auditable records. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `auditLogs` | `order-repository.ts` operational audit foundation. | Split, transfer, merge, kitchen, payment, and completion events write non-sensitive audit records. | Rules/index review remains manual. |
| `notifications` | Existing notification foundation and owner topbar read model. | New order, reminder, ready, payment, completion, split, transfer, and merge events remain tenant scoped. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `printLogs` | `printer-repository.ts` and print engine. | Bill, receipt, split receipt, KOT, duplicate copy, and reprint logs remain available for audit/history. | Indexed in `firestore.indexes.json`; rules deployment remains manual. |
| `masterMenuTemplates` | Master Menu Library repository/API. | Admin import/export and owner template picker use the existing collection; no duplicate collection is approved. | Rules coverage must be confirmed before production library smoke. |
| `communicationHistory` | `communication-repository.ts`. | Contact attempts, maps opens, test messages, and not-reachable events remain tenant scoped and non-sensitive. | Rules/index coverage must be reviewed before release. |
| OTP/session support collections | Existing auth/session APIs. | `phoneVerificationSessions`, `emailOtps`, and `modulePasswordOtps` must remain protected and provider-gated. | Rules coverage was previously flagged for manual review. |

### Deployment Checklist

| Step | Expected Result | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| Hostinger project access | Correct production site and Git branch selected. |  |  | Manual |
| Environment variables | Hostinger env matches production configuration checklist with real secrets. |  |  | Manual |
| Env validation | `npm run validate:prod-env` passes in production-equivalent environment. |  |  | Manual |
| Deploy latest commit | Hosted app serves the release branch commit from this handoff. |  |  | Manual |
| Cache clear | Hostinger/application cache cleared after deployment. |  |  | Manual |
| Release info | `/api/release-info` reflects current commit/build metadata. |  |  | Manual |
| Smoke routes | `/`, `/restaurants`, `/owner/login`, `/owner/pos`, `/owner/kitchen`, `/admin/login` load without console errors. |  |  | Manual |
| Firestore rules | Target Firebase project has reviewed and deployed rules. |  |  | Manual |
| Firestore indexes | Target Firebase project has deployed required indexes. |  |  | Manual |
| Firebase auth domains | Hostinger domain and final custom domain are authorized. |  |  | Manual |
| SMTP | OTP, owner credentials, order notification, and outage alert sends succeed. |  |  | Manual |
| Razorpay | Sandbox/live order, verify, webhook, and refund/settlement flow pass before enabling live payments. |  |  | Provider |
| WhatsApp | Cloud API token, phone id, webhook verify token, send, and webhook event logging pass before launch. |  |  | Provider |
| Cloudinary | Signature route, upload widget, image display, and quota state pass. |  |  | Manual/provider |
| Mapbox | Customer/owner map flows load with production token. |  |  | Manual/provider |
| Printer configuration | Default profiles, 58mm/80mm/A4 formats, KOT, bill, receipt, split receipt, and reprint pass. |  |  | Hardware |
| Browser validation | Chrome, Safari/Edge, mobile, tablet, and desktop smoke pass. |  |  | Manual |
| Multi-device validation | Cashier, waiter, kitchen, manager, and owner sessions stay synchronized. |  |  | Manual |

### Manual Smoke-Test Checklist

| Area | Expected Result | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| Customer discovery | Home, restaurants, restaurant detail, menu, item detail, offers, and loyalty load with loading/empty/error states. |  |  |  |
| Customer auth | Email login, signup, forgot password, Google sign-in, and account continuity work on hosted domain. |  |  |  |
| Customer checkout | Cart, delivery/parcel/dine-in validation, scheduled order, order success, recent orders, and tracking work. |  |  |  |
| Restaurant public pages | Public restaurant pages show correct media, status, menu, no stale cache, and no demo/test-owner leakage. |  |  |  |
| QR ordering | QR scan, session binding, OTP/phone verification, table order, waiter request, timeout, and device replacement work. |  |  |  |
| Owner login/shell | Owner login, dashboard, topbar search, notification center, and protected view switch work. |  |  |  |
| POS cashier | Add/remove items, draft refresh, discounts, charges, customer lookup, hold/resume, send to kitchen, payment, and clear confirmation work. |  |  |  |
| Kitchen | Realtime intake, status lifecycle, bulk actions, timers, filters, sound toggle, KOT preview/print/reprint, and rollback on failures work. |  |  |  |
| Waiter | Waiter active orders, table actions, QR handoff, send to kitchen, and service requests update the same read model. |  |  |  |
| Admin | Admin login, CMS, restaurants, users, roles, support, diagnostics, and Menu Library import/export work. |  |  |  |
| Printing | Bill, receipt, split receipt, KOT, duplicate copy, download, print history, and reprint output on real paper. |  |  |  |
| Notification Center | Unread/read/all filters, category filters, mark-read, mark-all-read, related-route open, and stale alert suppression work. |  |  |  |
| Split Bill | Split payments create split rows, payment transactions, receipt queue entries, audit timeline, and notification events. |  |  |  |
| Transfer Table | Active order transfers table/waiter and updates linked order/customer/kitchen records. |  |  |  |
| Merge Tables | Source orders merge into target order with totals, lines, payment history, audit timeline, split rows, and source cancellation continuity. |  |  |  |
| Timeline | Order timeline shows audit/status/payment events without duplicate rows. |  |  |  |
| Payment History | Payment timeline, split rows, and print history reflect repository-backed data. |  |  |  |
| Master Menu Library | Admin import JSON/CSV/XLSX, duplicate handling, export, owner picker refresh, and owner template import work. |  |  |  |
| Realtime / multi-device | Cashier, waiter, kitchen, manager, and owner sessions reflect active order and payment updates without duplicate requests/listeners. |  |  |  |
| Responsive / accessibility | Mobile, tablet, desktop layouts, keyboard navigation, focus traps, Escape close, labels, and scroll locking work. |  |  |  |

### Production Risks by Category

| Category | Genuine Remaining Risk | Owner | Next Action |
| --- | --- | --- | --- |
| Code Risks | No confirmed local code blocker remains after typecheck, lint, build, and diff checks; browser-only issues still require hosted smoke. | Manual + Codex for confirmed bugs | Run production smoke and patch only confirmed repository-scope bugs. |
| Infrastructure Risks | Hostinger env, cache clear, redeploy, release metadata, Firebase authorized domains, Firestore rules, and Firestore indexes remain manual. | Manual | Complete deployment checklist before release. |
| Provider Risks | SMTP, Razorpay, WhatsApp Cloud API, SMS, push, Meta, Cloudinary, Mapbox, and Google OAuth depend on provider credentials/console setup. | Manual/provider | Validate each provider with real credentials before enabling live expectations. |
| Hardware Risks | Real 58mm/80mm/A4 printers, KOT devices, receipt output, duplicate copies, TV/tablet Kitchen mode, and cashier tablets remain external. | Manual | Run hardware smoke with production printer profiles. |
| Operational Risks | Staff permissions, owner password-protected view switch, multi-device handoff, stale production demo cleanup, and support/refund processes need live workflow validation. | Manual | Complete browser/device/operator checklist and document failures before launch. |

Release-freeze validation:

| Check | Result |
| --- | --- |
| Production feature changes | None |
| Confirmed bugs found in this pass | None |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed |

## Release Engineering Automation - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Release automation and documentation only. No completed feature module, repository architecture, API, Firestore collection, or UI workflow was modified. |
| Release Engineering | Added `scripts/release/` as the single folder for release utilities. |
| Deployment Automation | Added deployment checklist and production smoke-test documentation for Hostinger, Firebase, providers, browsers, devices, and printers. |
| Git Automation | Added Windows helpers for commit/push, push-only, fetch/rebase/push sync, and GitHub authentication recovery. |
| Production Validation | Added release validation batch runner and production environment validator. |
| Documentation | Added release README, generated release report template, deployment checklist, and smoke-test checklist. |
| Compatibility Cleanup | Existing release batch wrappers were normalized to dynamic branch/path behavior and help-mode verification. |

Release automation files:

| File | Purpose |
| --- | --- |
| `scripts/release/git-commit-push.bat` | Interactive commit and push helper with current-branch detection and GitHub authentication recovery guidance. |
| `scripts/release/git-push-only.bat` | Pushes the current branch with authentication failure guidance. |
| `scripts/release/git-sync.bat` | Runs fetch, pull rebase, and push with conflict recovery guidance. |
| `scripts/release/github-auth-help.bat` | Beginner-friendly GitHub authentication helper for Git Credential Manager, Personal Access Token, and SSH. |
| `scripts/release/release-check.bat` | Runs typecheck, lint, build, `git diff --check`, and regenerates release report. |
| `scripts/release/validate-production.js` | Validates required production environment variables and exits with code 1 on missing/invalid configuration. |
| `scripts/release/deploy-checklist.md` | Production deployment checklist. |
| `scripts/release/production-smoke-test.md` | Manual production smoke-test matrix. |
| `scripts/release/release-report.md` | Release report generated by `release-check.bat`. |
| `scripts/release/README_RELEASE.md` | Release utility usage guide. |

Release engineering verification:

| Check | Result |
| --- | --- |
| Hardcoded paths/usernames/repositories/branches | Avoided; scripts detect branch, repository, origin, script directory, and runtime metadata dynamically. |
| GitHub authentication handling | Batch helpers surface Git output and print PAT, Git Credential Manager, and SSH recovery guidance for authentication failures. |
| BAT help-mode verification | Passed for release batch files without committing, pushing, or authenticating. |
| Production env validator syntax | Passed with `node --check scripts/release/validate-production.js`. |
| Release validation runner | Passed; `release-check.bat` ran typecheck, lint, build, and `git diff --check`, then regenerated `release-report.md`. |
| Feature changes | None. |

## Final Production Readiness Cleanup - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Code cleanup only; no new business feature, UI redesign, API route, repository, Firestore collection, or architecture change was added. |
| Repository Review | Searched runtime code for debt markers, debug statements, unsafe `any` markers, bare fetch chains, missing response validation, and lifecycle cleanup gaps. |
| Owner Orders | Bootstrap now aborts stale requests, validates owner orders and kitchen API responses, and surfaces recoverable load failures. |
| Table Management | Bootstrap now validates owner tables and kitchen API responses before treating table data as loaded. |
| Owner Reports | Range fetch now aborts stale requests, surfaces load errors, and avoids stale data after failed analytics reads. |
| Owner Customers | Customer list/profile reads now use abort cleanup, safe response handling, visible error state, and profile loading state. |
| React Lint Cleanup | `set-state-in-effect` findings introduced during cleanup were corrected by scheduling effect-owned state resets asynchronously or removing redundant initial setters. |
| Files Changed | `src/components/flows/owner-order-management-flow.tsx`, `src/components/flows/restaurant-tables-flow.tsx`, `src/app/owner/reports/page.tsx`, `src/app/owner/customers/page.tsx`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Feature Changes | None. |

Final cleanup verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| TypeScript errors | 0 |
| ESLint errors | 0 |
| Production build | Succeeded |

Remaining release blockers:

| Area | Remaining Work |
| --- | --- |
| Infrastructure | Hostinger env/cache/redeploy, Firebase authorized domains, Firestore rules/indexes, and hosted `/api/release-info` validation remain manual. |
| Providers | SMTP, Razorpay, WhatsApp Cloud API, SMS, push, Meta, Cloudinary, Mapbox, and Google OAuth checks remain provider/manual gated. |
| Hardware | 58mm/80mm/A4 printer, KOT, receipt, split receipt, reprint, Kitchen TV/tablet, and cashier device checks remain manual. |
| Browser Smoke | Customer, owner, admin, POS, Kitchen, QR, notification, payment/timeline, and Master Menu Library hosted smoke remains manual. |

## Release Freeze Verification

| Check | Result |
| --- | --- |
| Localhost URL verification | PASS |
| Manifest verification | PASS |
| TypeScript | PASS |
| ESLint | PASS |
| Production Build | PASS with existing Firebase/protobuf dynamic dependency warning |
| `git diff --check` | PASS |

Remaining manual deployment tasks:

| Area | Task |
| --- | --- |
| Deployment | Clear Hostinger cache, redeploy the current release branch, and verify hosted route health. |
| Release metadata | Confirm hosted `/api/release-info` returns the deployed commit SHA and release branch. |
| Browser smoke | Validate customer, owner, admin, POS, Kitchen, QR, notification, payment/timeline, and Master Menu Library flows on production. |
| Device smoke | Validate mobile, tablet, desktop, Kitchen TV/tablet, cashier device, and multi-device synchronization. |
| Printer smoke | Test real 58mm/80mm/A4 bill, receipt, KOT, split receipt, duplicate copy, and reprint output. |

Remaining infrastructure tasks:

| Area | Task |
| --- | --- |
| Environment | Verify production environment variables in Hostinger with real secrets. |
| Firebase | Deploy and verify Firestore rules, Firestore indexes, Storage rules, and authorized domains. |
| Cache/CDN | Confirm no stale app shell, manifest, service worker, or release metadata is served after deployment. |
| Security | Verify production security headers on the hosted domain. |

Remaining provider tasks:

| Provider | Task |
| --- | --- |
| SMTP | Verify OTP, owner credentials, order notification, and outage alert email delivery. |
| Razorpay | Verify sandbox/live order, verify, webhook, refund, and settlement flow before enabling live payments. |
| WhatsApp/SMS | Verify Cloud API/SMS credentials, compliance, send flow, and webhook logging before launch. |
| Cloudinary/Mapbox/Google OAuth | Verify upload/signature, maps, and hosted OAuth flows with production credentials. |

## Razorpay Completion - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Completed Razorpay payment gateway implementation using existing owner settings, payment routes, order repository, payment timeline, audit timeline, notifications, print logs, and existing `paymentIntents` / `paymentWebhooks` support collections. |
| Architecture | No duplicate payment API family, repository, or Firestore collection was added. Owner-specific Razorpay config is stored under existing owner profile settings; only non-secret flags are mirrored to restaurant payment config. |
| Secrets | Razorpay Secret and Webhook Secret are encrypted before storage and are never returned to the frontend; owner settings show only configured/masked state. |
| Checkout | Customer Razorpay checkout now follows server-created order, checkout handoff, server signature verification, server payment fetch, repository payment transaction, timeline/audit/notification, receipt queue, and paid/authorized/failed status handling. |
| Webhooks | Webhook route verifies raw-body HMAC signature with the owner webhook secret, handles `payment.authorized`, `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `order.paid`, `payment.dispute.*`, and `payment.downtime.*`, and ignores duplicate deliveries using `x-razorpay-event-id`. |
| Refunds | Owner Razorpay refund API supports full/partial refunds with reason, provider refund id, timeline, audit, notification, and payment transaction records. |
| Owner Settings | Payments tab now includes Razorpay enable/disable, test/live mode, key id, encrypted secret, encrypted webhook secret, company name/logo, allowed methods, partial payments, min/max amount, auto capture, webhook, refund, invoice prefix, receipt prefix, INR currency, Test Connection, Save, and Reset. |
| Provider Settings | Owner Settings surfaces configurable provider sections for Payment, SMTP, WhatsApp, SMS, Cloudinary, Google OAuth, and Maps while leaving infrastructure/provider secrets in production environment setup. |
| Payment History | Existing POS payment history now includes exportable rows with transaction id, Razorpay payment id, order id, gateway, status, method, amount, refund, failure reason, captured at, and created at; CSV and Excel export are available. |

Remaining Razorpay manual tasks:

| Area | Task |
| --- | --- |
| Razorpay Dashboard | Register the production webhook URL and configure the same webhook secret in Owner Settings. |
| Test Credentials | Save the provided test key id and matching secret in Owner Settings, then run Test Connection. |
| Live Credentials | Replace test credentials with live Razorpay keys only after sandbox smoke passes. |
| Provider Smoke | Verify order create, checkout, signature verify, webhook delivery, captured payment, failed payment, full refund, partial refund, and settlement records in Razorpay dashboard. |
| Production Deployment | Redeploy Hostinger current commit and verify `/api/release-info` before live payment launch. |

## Kitchen Operations and Razorpay Production Readiness - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Completed the interrupted Kitchen Operations Center and Razorpay production-readiness pass without changing repository structure, Firestore collections, or payment architecture. |
| Production Readiness | 99% code-ready; 98% production-release ready pending manual infrastructure, provider, hardware, and hosted browser validation. |
| Kitchen Completed | Desktop Kitchen now uses the compact four-column operational board, sticky header controls, non-blocking new-order toast, order detail drawer, display order numbers, KOT preview/print/reprint access, accepted-order auto print, mobile notification highlight, and the existing SSE listener with cleanup. |
| Kitchen History | Added `/owner/kitchen/history` and owner sidebar navigation using the existing Kitchen data API; history supports date/status/payment/search filters, display order numbers, and the shared order drawer. |
| Razorpay Completed | Owner settings support key id, encrypted key secret, optional merchant id, encrypted webhook secret, test/live mode, enable/disable, masked saved secrets, and Test Connection. |
| Razorpay Webhooks | Webhook handling now covers payment authorized/captured/failed, order paid, refund created/processed, dispute events, and downtime events with signature verification, idempotency, audit logs, owner notifications, and timeline updates when an order is matched. |
| Safe Errors | Missing gateway configuration, gateway unavailable, invalid verification, invalid webhook signature, and rejected refund paths now return safe user-facing messages without exposing secrets or stack traces. |

Completed items:

| Item | Status |
| --- | --- |
| Desktop Kitchen redesign | Completed |
| Four-column KDS layout | Completed |
| Non-blocking new-order toast | Completed |
| Order details drawer | Completed |
| Kitchen History page | Completed |
| Sidebar navigation | Completed |
| Display order numbers | Completed with UI/display fallback; no schema change added. |
| KOT preview and print history surfaces | Completed using existing print engine/log paths. |
| Realtime updates and cleanup | Completed with existing SSE singleton and cleanup. |
| Razorpay dispute/downtime webhook coverage | Completed |
| Gateway error improvements | Completed |
| Test Connection improvements | Completed |

Remaining items:

| Area | Remaining Work |
| --- | --- |
| Kitchen | Manual tablet/mobile/TV smoke for touch gestures, new-order toast behavior, drawer ergonomics, sound policy, and long-running SSE stability. |
| Printing | Real 58mm/80mm/A4 KOT, bill, receipt, split receipt, duplicate copy, and reprint hardware checks. |
| Razorpay | Save real test/live secrets in Owner Settings, run Test Connection, register webhook endpoint, and verify dashboard deliveries, settlement, and refund state. |
| Production | Hostinger cache clear/redeploy, hosted `/api/release-info`, Firebase rules/indexes, authorized domains, and route smoke remain manual. |

Known risks:

| Risk | Owner | Next Action |
| --- | --- | --- |
| Hosted app may still serve an older commit until redeployed. | Manual | Complete Hostinger redeploy and verify release metadata. |
| Razorpay live payment behavior depends on real key secret and webhook secret not present in this workspace. | Manual/provider | Configure credentials in Owner Settings and provider dashboard, then run sandbox/live smoke. |
| Browser audio, popup print, and thermal printer behavior are device/browser dependent. | Manual | Run hardware and browser smoke on target restaurant devices. |
| Firestore rules/index deployment remains external. | Manual + Codex if a real rule bug is found | Deploy reviewed rules/indexes and smoke protected flows. |

Manual tasks:

| Area | Task |
| --- | --- |
| Deployment | Redeploy `release/production-nammude`, clear cache, and verify hosted HTTPS routes. |
| Browser Smoke | Verify Kitchen desktop/tablet/mobile, History, POS payment, refund, notification, timeline, and owner settings flows. |
| Provider Smoke | Verify Razorpay order, checkout, signature verification, webhook, dispute/downtime delivery, full refund, and partial refund. |
| Hardware Smoke | Verify KOT/bill/receipt/split receipt/duplicate copy/reprint output on real printers. |

## Owner Operations Center V2 Active Orders - 2026-07-05

| Field | Result |
| --- | --- |
| Scope | Completed the interrupted Owner Operations Center V2 pass by touching only the owner order flow, shared toast provider, kitchen notification usage, owner orders API, order repository status path, and this tracker. |
| Production Readiness | 99% code-ready; 98% production-release ready pending hosted browser, provider, hardware, and deployment validation. |
| Active Orders | Live tab now opens first and renders a compact 30-order active grid with desktop 3-4 columns, tablet 2 columns, mobile 1 column, newest-first sorting, order number, customer, source, table/type, amount, item count, age, ETA, payment, kitchen, priority, and status. |
| Order Lifecycle | Completed, delivered, cancelled, and rejected orders are excluded from Active Orders and remain available through Completed/All views. |
| Notifications | Added reusable `SarvaNotification` with top-right stack, success/warning/error/info/critical tones, actions, close, animated progress, hover pause, and shared use from alert toast and Kitchen new-order/delay alerts. |
| New Online Order Alert | New online customer orders trigger owner notification with View, Accept, and staged Reject actions; new-order card highlight auto-clears. |
| Reject Safety | Reject requires confirmation, reason, and final confirmation before updating repository-backed status. |
| Kitchen Handoff | Linked order status updates now mirror to the existing kitchen ticket when present, write audit/status history, and create owner/waiter/kitchen notifications without adding listeners or collections. |
| Operations Panel | Delivery partner side panel is collapsed by default and remembers the owner browser preference. |
| Performance | Active order lists, filters, metrics, and range views are memoized; no new polling or realtime listener was added. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Browser Smoke | Verify Owner Orders active grid on desktop/tablet/mobile, including 20-30 active orders, search/filter, highlight states, and collapsed operations panel persistence. |
| Workflow Smoke | Verify new customer order alert, accept, staged reject with reason, completed order removal from Active, and Completed/All visibility. |
| Kitchen Smoke | Verify accepted linked orders update Kitchen realtime board and existing KOT print path on hosted deployment. |
| Hardware Smoke | Verify KOT/bill/receipt/reprint output on real 58mm/80mm/A4 printers. |
| Production | Redeploy Hostinger current branch, clear cache, and verify hosted `/api/release-info` before launch. |

Known risks:

| Risk | Owner | Next Action |
| --- | --- | --- |
| New-order alert visibility depends on the owner screen being loaded and refreshed through existing API reads; no new listener was added by design. | Manual | Smoke with production order flow and decide if future realtime owner-order alerts are required. |
| Linked Kitchen update only mirrors when the order already has a kitchen ticket id; unmatched orders still update safely without throwing. | Manual + Codex if bug found | Verify production accept/Kitchen handoff and patch only if a real unmatched-ticket bug is confirmed. |
| Browser animation, audio, and print behavior remain device/browser dependent. | Manual | Test on target restaurant devices after redeploy. |

## RC Hosted Deployment Verification - 2026-07-06

| Field | Result |
| --- | --- |
| Release Version | `v1.0.0-rc1` |
| Deployment Date | 2026-07-06 |
| Production URL | `https://violet-squid-380447.hostingersite.com` |
| Commit SHA | `6823c15e5a7906decf179e329b7bee1f9617dd28` |
| Git Status | `release/production-nammude` synchronized with `origin/release/production-nammude` at `6823c15e5a7906decf179e329b7bee1f9617dd28`; `v1.0.0-rc1` tag pushed. |
| Release Metadata | `/api/release-info` returns current branch, current commit SHA, build timestamp, public app URL, and application version. |
| Deployment Status | Hostinger is serving branch head `6823c15e5a7906decf179e329b7bee1f9617dd28`; deployment is not production-complete because env still reports `development` and full production smoke is manual pending. |
| Rollback Version | Previous validated Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`. |
| Final Production Readiness | 98% pending authenticated browser smoke, Hostinger env correction, provider checks, hardware checks, and Firebase rules/index validation. |

Hosted validation summary:

| Check | Result |
| --- | --- |
| Git fetch | Passed after Git metadata permission escalation. |
| Git push | Passed; remote already up to date. |
| `/api/release-info` | Passed for latest SHA and public URL. Known issue: `deploymentEnvironment` currently reports `development`; set Hostinger `NEXT_PUBLIC_APP_ENV=production`. |
| `/` | Passed 200. |
| `/restaurants` | Passed 200. |
| `/checkout` | Passed 200. |
| `/order/test-health-check` | Passed 200. |
| `/owner/dashboard` | Passed expected 307 to owner login, then 200 login page. |
| `/owner/orders` | Passed expected 307 to owner login, then 200 login page. |
| `/owner/kitchen` | Passed expected 307 to owner login, then 200 login page. |
| `/owner/pos` | Passed expected 307 to owner login, then 200 login page. |
| `/api/owner/orders` | Passed expected unauthenticated 403. |
| `/api/owner/kitchen` | Passed expected unauthenticated 403. |
| `/api/customer/orders` | Passed expected unauthenticated 403. |
| `/api/payments/razorpay/order` | Passed expected GET 405; payment POST smoke remains provider/manual. |
| `/robots.txt` | Passed 200. |
| `/sitemap.xml` | Passed 200. |

Manual smoke results still required:

| Area | Required Manual Result |
| --- | --- |
| Owner Active Orders | New online order alert, sound, highlight, accept, staged reject, reason-required reject, and active-card updates on authenticated owner session. |
| Kitchen Lifecycle | Customer order to owner to kitchen to preparing to ready to served/completed with realtime updates and existing KOT print path. |
| POS Channels | Dine-in, parcel, delivery, QR orders, and online orders through real operator workflow. |
| Printers | Kitchen printer, owner printer, customer receipt, no duplicate prints, and no missing tickets. |
| Notifications | New order, accepted, ready, completed, rejected; no duplicate or missing notifications. |
| Responsive Active Orders | Desktop, tablet, and mobile layout with latest-first ordering and 30-card cap. |
| Delivery Panel | Collapse state persists after refresh. |
| Provider | Razorpay order/checkout/verify/webhook/refund and SMTP/WhatsApp provider checks with real credentials. |
| Firebase | Firestore rules/indexes and authorized domains verified in production project. |

Known issues:

| Issue | Severity | Owner | Next Action |
| --- | --- | --- | --- |
| Hosted `/api/release-info` reports `deploymentEnvironment: development`. | P0 config | Manual | Set Hostinger `NEXT_PUBLIC_APP_ENV=production`, redeploy/restart, and recheck `/api/release-info`. |
| Full end-to-end smoke could not be completed from CLI because it requires authenticated owner/customer sessions, real provider credentials, browser audio, and printer hardware. | P0 manual | Manual | Run production smoke checklist on target devices and report confirmed bugs only. |

## Release Closure Readiness Verification - 2026-07-06

| Field | Result |
| --- | --- |
| Scope | Release closure verification only. No Enterprise Hardening phase, application code, API, repository, UI, or business logic change was started. |
| Current Branch | `release/production-nammude` |
| Local Commit | `6823c15e5a7906decf179e329b7bee1f9617dd28` |
| Remote Commit | `6823c15e5a7906decf179e329b7bee1f9617dd28` |
| Production Commit | `6823c15e5a7906decf179e329b7bee1f9617dd28` |
| Ahead / Behind | `0 / 0` against `origin/release/production-nammude`; working tree has release-closure documentation updates only. |
| Enterprise Hardening | Blocked until production env, Firestore deploy review, manual smoke, provider checks, and hardware checks are complete. |

Validation results:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Firebase/protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warning only. |
| `cmd /c npm run validate:prod-env` | Failed: missing `NEXT_PUBLIC_APP_ENV`, Firebase Admin values, `DATABASE_ALERT_EMAIL`; `NEXT_PUBLIC_APP_URL` must use `https://`. |

Deployment readiness:

| Item | Status | Notes |
| --- | --- | --- |
| Production env variables | Blocked | Local production env validation fails and hosted metadata reports `deploymentEnvironment: development`. |
| Release notes updated | Completed | `RELEASE_NOTES.md` documents `v1.0.0-rc1`, validation, open gates, and rollback. |
| Changelog updated | Completed | `docs/changelog.md` includes the 2026-07-06 release closure entry. |
| Tracker updated | Completed | This release closure section records current branch, commits, validation, blockers, and manual checklists. |
| Firestore rules ready | Pending | `firestore.rules` exists, but newer support collections still require manual rules review before deploy. |
| Firestore indexes ready | Pending | `firestore.indexes.json` exists, but production index deploy/readiness remains manual. |
| Production build generated | Completed | `.next` build artifacts generated by `npm run build`. |

Release route validation:

| Item | Status | Notes |
| --- | --- | --- |
| `/api/release-info` | PASS with config issue | Hosted metadata reports commit `6823c15e5a7906decf179e329b7bee1f9617dd28` and HTTPS app URL, but `deploymentEnvironment` is still `development`. |
| `/robots.txt` | FAIL hosted / PASS local build | Local `src/app/robots.ts` and generated `.next` route allow public crawling while disallowing private app areas; hosted response still serves stale Googlebot-blocking content and must be rechecked after Hostinger restart/cache clear. |
| `/sitemap.xml` | PASS | Hosted route returns 200 with XML content type. |
| `/manifest.json` | PASS | Hosted route returns 200 and local manifest JSON parses successfully. |
| PWA registration | PASS local review | `PwaRegistrar` registers `/sw.js` in production and removes service-worker listeners on cleanup. |
| QR URL generation | PASS local review | QR URL helpers reject localhost/127.0.0.1 configured origins and fall back to the HTTPS public app URL. |
| Localhost / HTTP references | PASS with accepted dev/script refs | Targeted release-file scan found only local-dev, release-script, or guarded fallback references; no confirmed production hardcoded URL issue in the reviewed files. |

Production environment variable report:

| Variable | Status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | FAIL | Missing locally; hosted `/api/release-info` reports `deploymentEnvironment: development`. |
| `NEXT_PUBLIC_APP_URL` | FAIL | Present locally but does not use `https://`. |
| `NEXT_PUBLIC_USE_FIREBASE` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | PASS | Set. |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | MANUAL REQUIRED | Required for production browser push registration. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | PASS | Set. |
| `FIREBASE_ADMIN_PROJECT_ID` | FAIL | Missing locally. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | FAIL | Missing locally. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | FAIL | Missing locally. |
| `SMTP_HOST` | PASS | Set. |
| `SMTP_PORT` | PASS | Set. |
| `SMTP_SECURE` | PASS | Set. |
| `SMTP_USER` | PASS | Set. |
| `SMTP_PASS` | PASS | Set. |
| `SMTP_FROM` | PASS | Set. |
| `DATABASE_ALERT_EMAIL` | FAIL | Missing locally. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | PASS | Set. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | PASS | Set. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | PASS | Set. |
| `CLOUDINARY_CLOUD_NAME` | PASS | Set. |
| `CLOUDINARY_API_KEY` | PASS | Set. |
| `CLOUDINARY_API_SECRET` | PASS | Set. |
| `GOOGLE_OAUTH_CLIENT_ID` | PASS | Set. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | PASS | Set. |

Firestore deployment readiness:

| Area | Status | Notes |
| --- | --- | --- |
| Core rules coverage | MANUAL VERIFICATION REQUIRED | Core operational matches exist for `orders`, `customerOrders`, `kitchenOrders`, `paymentTransactions`, `notifications`, `printLogs`, `restaurants`, `menus`, `menuItems`, `offers`, `customers`, `restaurantTables`, and related collections. |
| Support collection rules | CODE READY / MANUAL DEPLOY REQUIRED | Local rules now explicitly cover `masterMenuTemplates`, `communicationHistory`, `communicationSettings`, `supportIssues`, and `user_preferences`, while OTP/payment/WhatsApp webhook support collections remain server-only. Deploy and smoke-test in target Firebase before release signoff. |
| Core indexes coverage | MANUAL VERIFICATION REQUIRED | Local `firestore.indexes.json` includes core indexes for `orders`, `customerOrders`, `kitchenOrders`, `restaurants`, `menus`, `menuItems`, `customers`, `offers`, `accountingEntries`, `inventory`, `paymentTransactions`, `printLogs`, `notifications`, and related operational queries. |
| Support collection indexes | MANUAL VERIFICATION REQUIRED | Support collection reads are mostly document reads or single-field queries, but target Firebase index deployment state is unverified. |
| Deployment required | MANUAL VERIFICATION REQUIRED | Do not mark complete until target Firebase rules and indexes are reviewed, deployed if needed, and protected flows are smoke-tested. |

Production smoke test checklist:

| Area | Status | Required Verification |
| --- | --- | --- |
| Customer ordering | MANUAL VERIFICATION REQUIRED | Discovery, restaurant detail, menu, cart, checkout, order success, recent orders, tracking, and customer error states. |
| QR ordering | MANUAL VERIFICATION REQUIRED | QR scan, signed session, device binding, OTP/phone verification, table order, waiter request, timeout, and replacement device flow. |
| Owner dashboard | MANUAL VERIFICATION REQUIRED | Login, dashboard metrics, active orders, notifications, protected view switch, and owner session continuity. |
| Kitchen dashboard | MANUAL VERIFICATION REQUIRED | Realtime intake, status lifecycle, sound, KOT preview/print/reprint, filters, drawer, history, tablet/mobile/TV layout. |
| Waiter workflow | MANUAL VERIFICATION REQUIRED | Table actions, QR handoff, active orders, service requests, and shared POS/Kitchen read model. |
| Authentication | MANUAL VERIFICATION REQUIRED | Customer email/Google, owner login, admin login, forgot password, OTP, authorized domains, and role separation. |
| Notifications | MANUAL VERIFICATION REQUIRED | New order, accepted, rejected, ready, completed, payment, split/transfer/merge, read/unread filters, and stale alert suppression. |
| Payments | MANUAL VERIFICATION REQUIRED | If enabled: Razorpay order, checkout, verify, webhook, failed payment, full refund, partial refund, and dashboard reconciliation. |
| Analytics | MANUAL VERIFICATION REQUIRED | Owner/admin analytics, reports, payment history export, order counts, revenue, and no high-volume query failures. |
| Printing | MANUAL VERIFICATION REQUIRED | Bill, receipt, KOT, split receipt, duplicate copy, print history, reprint, 58mm/80mm/A4 hardware output. |
| Image uploads | MANUAL VERIFICATION REQUIRED | Cloudinary signature, upload widget, menu/profile image display, image fallback, and provider quota state. |

Operational verification checklist:

| Area | Status | Required Verification |
| --- | --- | --- |
| Firebase | MANUAL VERIFICATION REQUIRED | Admin SDK diagnostics, client project config, authorized domains, and auth provider health. |
| Firestore | MANUAL VERIFICATION REQUIRED | Rules, indexes, protected reads/writes, tenant isolation, and no permission/index errors. |
| Storage | MANUAL VERIFICATION REQUIRED | Cloudinary credentials, upload/signature route, image transformations, and fallback rendering. |
| Email | MANUAL VERIFICATION REQUIRED | SMTP auth and sends for OTP, owner credentials, order notifications, and outage alerts. |
| Environment Variables | FAIL | Production-equivalent validation fails locally and hosted env reports development. |
| Domain | MANUAL VERIFICATION REQUIRED | Final custom domain, Hostinger domain, app URL, redirects, and auth domain alignment. |
| SSL | MANUAL VERIFICATION REQUIRED | HTTPS cert, no mixed content, final `NEXT_PUBLIC_APP_URL`, and secure provider callbacks. |
| Cache | MANUAL VERIFICATION REQUIRED | Hostinger cache clear, service worker freshness, no stale release metadata, and public no-store routes. |
| Health endpoint | MANUAL VERIFICATION REQUIRED | `/api/release-info` after env correction plus key public/protected route checks. |
| Logging | MANUAL VERIFICATION REQUIRED | Server/client logs sanitized, no secrets or stack traces exposed to users. |
| Monitoring | MANUAL VERIFICATION REQUIRED | Provider dashboards, Firebase Console, Razorpay dashboard, Cloudinary quota, and future health dashboard scope. |

Manual deployment checklist:

| Item | Status | Notes |
| --- | --- | --- |
| GitHub Push | Completed | Remote branch matches local HEAD `6823c15e5a7906decf179e329b7bee1f9617dd28`. |
| Hostinger Deploy | Completed metadata / Pending release signoff | Hostinger serves `6823c15e5a7906decf179e329b7bee1f9617dd28`; env is still not production. |
| Restart Application | Pending | Restart after env correction. |
| Clear Cache | Pending | Clear Hostinger/application cache after env correction/restart. |
| Firestore Rules | Pending | Review and deploy target Firebase rules. |
| Firestore Indexes | Pending | Review and deploy target Firebase indexes. |
| Authorized Domains | Pending | Confirm Hostinger/final custom domains in Firebase/Google auth. |
| Environment Variables | Blocked | Set real production env values and rerun validation. |
| Production Smoke Tests | Blocked | Requires authenticated sessions, real providers, browser/device checks, and printer hardware. |
| Rollback Verification | Pending | Confirm rollback to previous validated SHA `35017398773ba04efbdc3ab37d250cfa547c0675`. |
| Health Check | Pending | Recheck `/api/release-info`, public routes, protected redirects, and owner/customer/admin smoke after env correction. |
