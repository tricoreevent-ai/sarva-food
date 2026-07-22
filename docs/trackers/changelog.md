# Changelog

## 2026-07-22

- Fixed Kitchen Accept RBAC drift: removed the secondary `/api/owner/tables` bootstrap from Kitchen Operations and added Kitchen-scoped printer access through `/api/owner/printers?surface=kitchen`.
- Expanded operational smoke to 41/41 and passed typecheck, lint, build, analyze, audit:release, runtime profile, operational stress, realtime profile, long memory profile, and diff check.
- Completed RC5 final operational hardening: POS add-on KOTs keep parent linkage, Kitchen create retries are idempotent, Kitchen/ready-signal/Reports streams use incremental SSE deltas, and Dashboard KPIs derive from live patched rows.
- Added `stress:operational`, `profile:realtime`, and `profile:memory:long` validation scripts covering 128 concurrent orders, sequential numbering, multi-screen patch propagation, listener cleanup, and duplicate row/write prevention.
- Expanded operational smoke to 40/40 and passed typecheck, lint, build, analyze, audit:release, runtime profile, operational stress, realtime profile, long memory profile, and diff check before the Kitchen Accept RBAC patch.
- Fixed the live operational consistency defect where Owner Dashboard/Owner Orders could show stale or duplicate state compared with POS/Waiter and Kitchen Operations.
- Added shared incremental realtime patching and linked order/KOT merging, then wired Owner Dashboard and Owner Orders to `/api/owner/pos/stream`.
- Corrected Owner Orders Ready → Served routing to the order service API instead of the Kitchen update API.
- Expanded operational smoke to 36/36 with an Owner Dashboard/Owner Orders/Kitchen consistency contract.

## 2026-07-21

- Added POS Display Options with per-operator persistence for images, density, grid/list, descriptions, and touch/desktop mode.
- Hidden POS menu images no longer render image components; mobile defaults to images off and compact row mode uses capped incremental rendering.
- Added Owner Settings controls for POS display defaults, Payment First/Kitchen First/Flexible workflow, and sequential POS numbering.
- Updated Review Order and Cart Panel actions to honor the selected POS workflow.
- Added incremental `/api/owner/pos/stream` updates so Kitchen and order status changes patch POS Active Orders without manual refresh.
- Added repository-only atomic per-restaurant order numbering and synced linked Kitchen tickets to the same display number.
- Expanded operational smoke to 35/35 checks for display options, hidden-image performance, workflow settings, realtime stream, and sequential numbering.
- Passed final gates: typecheck, lint, build, analyze, audit:release, smoke:operational 35/35, runtime profile, and diff check; build/analyze retain the accepted Firebase/protobuf warning.

## 2026-07-20

- Fixed the waiter serving RBAC gap: `/api/owner/orders` now allows Waiter Ready → Served and Served → Completed through action-specific authorization without granting `canEditBill`, while Cashier payment/refund and Owner/Admin override remain isolated.
- Aligned `/api/owner/kitchen`, ready-signal notifications, and Firestore rules so Kitchen cannot Serve/Complete, Waiter can acknowledge/service ready tickets, and direct status-only writes cannot mutate paymentStatus.
- Finished Kitchen History as a high-density enterprise grid with density modes, resizable persisted columns, compact filters/column chooser, memoized keyboard rows, icon-only Preview/Print, More menu, compact chips/items, lazy details, and floating bulk toolbar.
- Expanded operational smoke to 31/31 checks covering waiter Serve/Complete, Kitchen cannot Serve, Owner override, permission denial, Firestore role parity, waiter KOT fallback, notifications, and Kitchen History density contracts.
- Passed final gates: typecheck, lint, build, analyze, audit:release, smoke:operational 31/31, runtime profile, and diff check; build/analyze retain the accepted Firebase/protobuf warning.
- Redesigned Owner Login for RC5 with premium responsive layout, remembered email, autofocus/autocomplete, Caps Lock warning, password visibility, session-timeout messaging, and accessible loading/error/status feedback.
- Rebuilt Kitchen Order History as an enterprise management table with server-filtered paging, sticky header/action column, sorting, column visibility, saved filters, multi-field filters, bulk selection, CSV/Excel export, print, and expandable timeline/payment/print/audit details.
- Completed RC5 enterprise waiter workflow: Active Orders Waiter view now stages New/Accepted/Preparing/Ready/Serving/Completed and keeps Kitchen status/progress visible after payment.
- Added multi-ticket table sessions, add-on kitchen tickets, smart bill merge, billing-only merge audit, and 30-minute Completed holding with manual Move To History.
- Hardened Smart Bill Merge and Split Bill: open partial-payment tickets can be merged bill-only, locked/authorized/paid/refunded/closed/merged bills remain blocked, and Split Bill is no longer wrongly service-gated.
- Added compact card signals for Kitchen status, payment status, preparation progress, priority, ETA, Ready for Pickup, Serving, and Completed; timeline entries now identify Kitchen/Service/Payment/Print/Audit categories.
- Persisted six Owner Settings operational sound targets and wired configured Ready/customer/Kitchen sounds through targeted Waiter ready acknowledgement plus Owner/Manager escalation and Waiter active-view sound without duplicate bootstrap alerts.
- Confirmed completed gates: typecheck, lint, build, analyze, audit:release, smoke:operational 24/24, runtime profile, and diff check; build/analyze retain the accepted Firebase/protobuf warning.
- Synchronized Phase 5C workflow correction: payment is independent of Kitchen/service state, completion still requires Served + Paid, POS New Order cancel resumes the current draft, and Kitchen cards are item-first with details in Preview/More.
- Superseded Phase 5C gates with the RC5 enterprise waiter workflow run: typecheck, lint, build, analyze, audit:release, smoke:operational 24/24, runtime profile, and diff check; build/analyze retain the accepted Firebase/protobuf warning.
- Updated readiness to repository `100%` and production `92%`; production remains `NO GO` until hosted authenticated multi-role, provider, browser/device, printer, Lighthouse/Core Web Vitals, Chrome/React profiling, long-run heap, and Firebase Console gates pass.

## 2026-07-17

- Finalized Phase 5B operational hardening documentation after implementation validation: Active Orders optimization, Kitchen workflow, waiter notification architecture, strict payment lifecycle, print context, and POS print preview are repository complete.
- Superseded by RC5 enterprise waiter workflow gates: typecheck, lint, build, analyze, audit:release, smoke:operational 24/24, runtime profile, and diff check; build/analyze retain the accepted Firebase/protobuf warning.
- Updated readiness to repository `100%` and production `92%`; production remains `NO GO` until hosted authenticated multi-role, provider, browser/device, printer, Lighthouse/Core Web Vitals, Chrome/React profiling, long-run heap, and Firebase Console gates pass.

## 2026-07-16

- Fixed Hostinger reverse-proxy origin validation so same-site POS drafts and payment mutations reach authorization while foreign origins remain blocked.
- Replaced the POS Active Orders nested accordion with a memoized high-density board: 88px cards, 56px summary, cards-only scrolling, 4/5/6 desktop columns, deterministic expansion, and always-visible Serve/Notify/Payment/Print/Preview/More actions.
- Reduced deterministic expansion invalidation from 30 cards to 1 when opening and 2 when switching; preserved all lifecycle, repository, API, payment, and notification contracts.
- Added Phase 4C push readiness: bounded queue retry, 34-scenario contract matrix, owner FCM test endpoint, token/device controls, browser/foreground/background/action/deep-link diagnostics, badge/sound checks, and local delivery history.
- Added owner payment verification: configuration/key checks, test order and shared checkout, signature/webhook self-tests, test-mode capture/refund, safe failure/cancel/timeout simulations, and redacted logs.
- Aligned production validation with owner-scoped Razorpay as primary and global keys as optional legacy fallback; configured the supplied public VAPID key in commit-safe templates while keeping private material server/provider-only.
- Added push, notification troubleshooting, owner payment setup, Razorpay, webhook, and payment troubleshooting guides.
- Passed typecheck, lint, build, analyze, 19/19 Phase 4C checks, release audit, operational smoke, runtime profile, and diff check; production env validation is `46` pass, `17` errors, `1` manual for external production values/provider checks.
- Redesigned Owner Active Orders as an operational workspace: status summary cards, live tab counts, advanced search over orders/tables/items/waiters, workflow ribbon, status rail, delay/KOT/payment indicators, kitchen progress, compact expanded details, context-aware actions, and mobile workflow cues.
- Preserved feature-freeze boundaries: no Firestore schema/rule/index, API contract, repository, order lifecycle, payment flow, Kitchen logic, auth, or plugin architecture change.
- Pushed Active Orders baseline `ba8e957d57b949a94d0c42a3b170cf198917c0d8`; hosted RC5 runtime `3444d8cca5315513368851f44084131b7dbb2c56` now includes it.
- Re-probed Hostinger: `/api/release-info`, `/health/live`, `/health/ready`, and `/health/startup` return ok with `applicationVersion=v1.0.0-rc5`, `deploymentEnvironment=production`, Node `v22.18.0`, Firestore connected on ready/startup, Storage/SMTP/Cloudinary configured, Firebase VAPID missing, and Razorpay owner-scoped or missing.
- Verified `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, `cmd /c npm run profile:runtime`, and `git diff --check`; build/analyze retain the accepted Firebase/protobuf warning.

## 2026-07-15

- Completed the RC5 image optimization closure: shared Cloudinary presets, AVIF-first browser upload compression with WebP/JPEG fallback, signed incoming Cloudinary transforms, right-sized `SafeImage` delivery, CMS/public thumbnail reuse, and legacy `dpr_auto` cleanup.
- Recorded image closure commit `fc0986e9ba5dedb302dedcdd5eb9e20346844dba`; hosted production still serves `dcff59e050de1dace19460198cb2909372bce7d5`, `applicationVersion=v1.0.0-rc4`, and `deploymentEnvironment=development` until Hostinger redeploy, env correction, and cache clear complete.
- Pushed RC5 production testing baseline `2b8a348c416b0d952ab80d80083202280548c4d9` to `origin/release/production-nammude`; Hostinger still requires redeploy/env correction/cache clear before RC5 hosted verification can pass.
- Regenerated analyzer and bundle evidence; `/owner/orders` is `697 KB`, static JS is `8837 KB`, and static CSS is `191 KB`.
- Verified `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational`; build/analyze retain the accepted Firebase/protobuf warning.

## 2026-07-13

- Synchronized the active RC5 release metadata across package files, release constants, environment templates, deployment docs, trackers, and validation reports.
- Confirmed the existing `v1.0.0-rc4` tag remains immutable and the final RC5 validation commit should become `v1.0.0-rc5` after local gates pass.
- Preserved production readiness at `86%` and repository readiness at `99%`; production launch remains `NO GO` until Hostinger, provider, Firebase Console, browser/device, Lighthouse, and hardware gates pass.
- Re-ran the repository pending-work and performance audit: no actionable runtime TODO/FIXME, app-source `console.log`, duplicate order components, incomplete repository feature, duplicate listener, or unbounded Firestore read was found; bundle evidence refreshed from current analyzer output.
- Documented `dcff59e050de1dace19460198cb2909372bce7d5` as the committed RC5 handoff base after documentation centralization.
- Extracted pure phone normalization into `src/lib/phone.ts` so Owner Orders and POS no longer import the Firebase-backed restaurant operations service for phone formatting only.
- Certified the centralized documentation links and added `verify:performance` to the canonical RC5 validation command set.
- Re-probed Hostinger after the RC5 handoff deployment: hosted SHA now matches `dcff59e050de1dace19460198cb2909372bce7d5`, Node reports `v22.18.0`, and health endpoints return 200 with Firestore connected on ready/startup; production signoff remains blocked because hosted metadata still reports `applicationVersion=v1.0.0-rc4` and `deploymentEnvironment=development`.
- Added RC5 production observability: bounded in-memory monitoring, grouped last-100 errors/logs, client runtime/API/performance signal ingestion, Admin Production Monitoring dashboard, Owner diagnostics expansion, alert rules, provider status, and PASS/FAIL self-tests without Firestore schema or business workflow changes.
- Added RC5 image optimization: shared Cloudinary presets, AVIF-first browser upload compression with WebP/JPEG fallback, signed incoming Cloudinary transforms, and right-sized `SafeImage` delivery for high-volume customer, owner, and admin image surfaces.

## 2026-07-12

- Resumed the interrupted RC4 production-branch audit and compared `v1.0.0-rc4` (`66f7c6e5b8aba5991f4fe74b7e3b44c6079e5b38`) with current HEAD `b8c1ed6a7d4310f80cd9fdbe9b8621e21d5fc132` plus the dirty workspace.
- Added the current implementation matrix, dirty-workspace categorization, and RC5 recommendation to `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md`.
- Synchronized active tracker percentages to repository readiness `99%` and production readiness `86%`; production launch remains `NO GO`.
- Fixed `CompactOrderAccordionActions` hook order by moving the empty-action return below all hooks and memoizing the action runner.
- Verified `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational`; build/analyze retain the accepted Firebase/protobuf warning.

## 2026-07-09

- Advanced the active release-candidate metadata to `v1.0.0-rc4` / `1.0.0-rc.4` without moving existing `v1.0.0-rc1`, `v1.0.0-rc2`, or `v1.0.0-rc3` tags.
- Removed generated owner temporary passwords from admin API/browser responses; owner credential delivery remains email-based.
- Replaced TinyURL raw error echo with a generic safe fallback and corrected health metadata to avoid a stale `development` fallback when app env is absent.
- Expanded the production environment matrix from the actual env scan and aligned Razorpay requirements across the validator, Hostinger template, and deployment docs.

## 2026-07-08

- Completed Enterprise Performance Sprint Phase 2 with route-level bundle splitting and React startup optimization: `/` RSC route JS dropped from `1017 KB` to `455 KB`, `/profile` from `1714 KB` to `562 KB`, and Firestore/Auth route ownership from `94` manifests to `10`.
- Added `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`; local production HTML probes confirm `/`, `/profile`, and `/owner/pos` no longer initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks.
- Split Firebase config checks into `src/firebase/config.ts`, made `useAuthUser`, profile account actions, FCM support checks, and app-store owner/menu/staff/inventory mutation services load Firebase/Firestore/Stack helpers only at effect/action time.
- Completed the Enterprise Performance Recovery Sprint with a report-first audit in `docs/performance/PERFORMANCE_REPORT.md`, using saved Lighthouse artifacts and current analyzer output to identify text-render LCP delay, customer-shell/provider startup work, Firebase/Firestore eager imports, below-the-fold home menu fetches, GA timing, and skeleton/footer CLS risk.
- Deferred Google Analytics to `lazyOnload`, moved customer shell background runtime behind idle, lazy-loaded logout/favorite/write-only modules, lazy-loaded the public-header Firestore address listener only while the location picker is open, made Firebase compatibility exports non-eager, deferred home menu preview fetch until idle, and replaced the home splash loader with a layout-reserving skeleton.
- Verified the performance recovery pass with `cmd /c npm run typecheck`, `cmd /c npm run lint`, `cmd /c npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, and `git diff --check`; build/analyze retain the known Firebase/protobuf warning, and external Lighthouse remains manual because PageSpeed quota was exhausted from this workspace.
- Advanced the active immutable release candidate to `v1.0.0-rc3` without moving the existing `v1.0.0-rc1` or published `v1.0.0-rc2` tags; package metadata now reports `1.0.0-rc.3`.
- Added public no-store `/health/live`, `/health/ready`, and `/health/startup` endpoints with safe app version, git SHA, deployment environment, Firestore/storage status, SMTP/Cloudinary/Razorpay/Firebase configuration status, runtime, memory, CPU estimate, build timestamp, and request-id metadata.
- Expanded authenticated Owner/Admin diagnostics with operational listener/cache/queue status, tenant/open-order/Kitchen counts, memory, CPU estimate, and slow-query signal using existing repository reads and Firestore count aggregation.
- Completed final repository certification documentation: `v1.0.0-rc3` resolves to runtime release commit `cd1c81435a1e535483b94d66ffa1b1bf63494c0b`, and production docs now point Hostinger to the final pushed release branch commit.
- Preserved all Customer, Owner, POS, Kitchen, QR, Inventory, Accounting, Menu Library, notification, payment, repository, API, Firestore collection, schema, UI, and business workflows.

## 2026-07-07

- Added repository-side observability primitives for request/correlation/trace/transaction context, masked production logging, and unified API error helpers without changing business workflows.
- Centralized remaining high-risk server diagnostics across owner Orders/POS/Kitchen, owner diagnostics, Razorpay order/verify/refund/webhook, auth/session/OTP, public order notification, public Firestore/cache/outage alerts, master menu, loyalty, tables, customer account/orders, public reviews, and push dispatch paths.
- Added `npm run audit:release` and generated `docs/validation/repository-hardening-audit.md`; current static audit reports `0` debt markers and `0` matching unbounded Firestore collection reads, with remaining console hits limited to client/browser diagnostics.
- Added `docs/architecture/production-runbook.md` with operational logging, disaster recovery, security, performance, provider, and infrastructure checklists.
- Prepared `v1.0.0-rc2` as the safe release-candidate strategy instead of rewriting the existing `v1.0.0-rc1` tag; package metadata now reports `1.0.0-rc.2`.
- Added `docs/deployment/production-environment-matrix.md` and `docs/deployment/final-manual-deployment-package.md`; aligned `.env*` examples, Hostinger docs, and production validators with the actual runtime env surface.
- Hardened production release metadata defaults, client build info, owner diagnostics, QR signing, and selected customer/public/payment/admin diagnostics so stale `0.1.0`/rc1 fallbacks and raw exception details do not leak.
- Completed enterprise production-hardening audit for owner route/API closure: local production route redirects, owner API unauthenticated status codes, hosted metadata, env validation, duplicate request scan, tenant validation review, and manual release blockers recorded.
- Hardened owner table, sync, profile, offers, POS, and auth session diagnostics to avoid returning or logging raw exception details; offline sync conflicts no longer return full local/remote document snapshots.
- Corrected release metadata so `/api/release-info` reports `applicationVersion: v1.0.0-rc2` by default, while still allowing `NEXT_PUBLIC_APP_VERSION` override.
- Verified hosted route/provider reachability without credentials: public/auth pages load, protected owner routes redirect, owner APIs reject unauthenticated access, Cloudinary signature route is reachable, and Razorpay/WhatsApp/OTP/order notification routes safely reject invalid unauthenticated requests.
- Reviewed Firestore rules/indexes for release collections; local rules include the support, OTP/session, payment webhook, WhatsApp event, master menu, communication, and user preference collections with catch-all deny preserved. Firebase deployment remains manual.
- Deferred owner/admin action toast runtime behind `src/lib/client-toast.ts`, including lazy Sarva notifications for Owner Orders and Kitchen, without changing UI, APIs, repositories, schema, or business workflows.
- Verified typecheck, lint, production build, operational smoke, local production release metadata, and `git diff --check`; `validate:prod-env` still fails locally for missing production Hostinger/Firebase/VAPID/database-alert values and non-HTTPS local app URL. Build retains the known Firebase/protobuf dynamic dependency warning.

## 2026-07-06

- Completed Sprint 1 production-readiness code pass from base `8a0315c37228918e82498ae0d7c78317d616da45`: FCM foreground/background push, deep links, token management, invalid-token cleanup, app badges, push sounds, Firestore rule coverage, owner API mutation hardening, monitoring, and targeted POS/Kitchen listener reduction.
- Added `NEXT_PUBLIC_FIREBASE_VAPID_KEY` to production environment references; production push remains manual-provider gated until VAPID, rules deploy, hosted redeploy, and device smoke pass.
- Completed release-closure verification for `v1.0.0-rc1` at commit `6823c15e5a7906decf179e329b7bee1f9617dd28`.
- Confirmed local, remote, and hosted release metadata are aligned on `release/production-nammude`.
- Re-ran local validation: typecheck, lint, production build, and `git diff --check` passed; build retains the known Firebase/protobuf dynamic dependency warning.
- Recorded hosted `/robots.txt` as a remaining cache/deployment gate because the hosted response still blocks Googlebot while the local build route is correct.
- Confirmed Enterprise Hardening remains blocked until production env validation, Firestore rules/index deployment review, authenticated browser smoke, provider checks, and hardware/printer checks pass.
- Added release gate, production smoke, and operational verification checklists without changing application code.

## 2026-07-05

- Completed multi-tenant Razorpay server integration through existing owner settings, payment routes, order repository payment/audit/notification timelines, webhook verification, refund support, checkout handoff, and payment history export.
- Added encrypted owner Razorpay secret storage under existing owner profile settings and mirrored only non-secret gateway flags to restaurant payment config.
- Added owner-visible provider configuration sections for payment, SMTP, WhatsApp, SMS, Cloudinary, Google OAuth, and Maps without adding new provider collections.

## 2026-07-02

- Completed Enterprise Menu Master Library backend through the existing repository/API pattern: CRUD, search, pagination, filters, JSON/CSV import/export, Kerala seed data, duplicate/archive/restore/enable/disable, version history, usage counters, favorites, recent imports, private restaurant templates, and audit fields.
- Added Admin -> Master Data -> Menu Library with dashboard stats, searchable paginated table, preview drawer, bulk actions, import/export controls, version history, and audit history.
- Upgraded the existing owner menu wizard with Create Empty / Use Master Template, fullscreen template picker tabs, template preview/import, private template save, and restaurant item `templateId` / `templateVersion` persistence.
- Verified `npm run typecheck`, targeted `npm run lint -- ...` for changed Menu Library files, and `git diff --check`; full build was skipped because no build-related files changed.

## 2026-07-01

- Completed QR session lifecycle actions with refresh, resume, extend, end, update customer details, update guest count, device replacement, reload recovery, expiry recovery, persisted session metadata, and timeline audit events on the existing table session record.
- Added a reusable Firebase phone verification baseline with invisible reCAPTCHA, resend cooldown state, server-side hashed verification tokens, Firestore verification session persistence, verified phone flags, reusable OTP dialog/badge components, and QR table session enforcement for OTP-required starts.
- Fixed owner menu image parity by normalizing owner menu API reads/writes through `imagePath`/`imagePaths`, preserving primary image plus ordered gallery data, and adding Set Primary/Delete Primary/Reorder Images controls in the existing menu wizard.
- Fixed QR table ordering session start by sending the customer fields expected by the public session API, mapping QR menu data through the same customer menu mapper, and applying dine-in/parcel pricing before cart/order submission.
- Shortened success notifications to 12 seconds in the existing top-right stacked toaster while leaving error behavior unchanged.
- Fixed the owner/admin global search autofill regression with a reusable credential-isolated search input, autofill decoys, non-credential field metadata, and explicit operational view switch password metadata.
- Completed enterprise bill printing stabilization in the existing POS/printing flow: bill preview, customer/cashier/kitchen/duplicate copies, duplicate bill labeling, 58mm/80mm/100mm/A4 paper selection, print/reprint logs through owner printer API, PDF-ready download, and WhatsApp bill handoff.
- Completed the enterprise QR customer/session workflow: QR welcome and registration, guest count, menu/cart/order, bill request, feedback, full waiter request set, active session read model, table timeline, bill/request state, owner extend/end/transfer actions, KDS request visibility, and owner dashboard QR analytics.
- Stabilized production QR table management: Save & Generate QR now has explicit saving/error states, server-side duplicate table validation, current-deployment QR URL generation, signed QR expiry metadata, post-generation validation, expanded QR preview details, copy fallback, Open Link, bulk QR print/download, duplicate table, and clear delete-blocked reasons for active orders or QR sessions.
- Hardened QR sessions with device-bound order/request validation, absolute configured session timeout, idle timeout enforcement, and QR link validation against the public session endpoint.
- Hardened owner/admin global search inputs against browser/auth autofill so operational view switching cannot inject the signed-in identity into search.
- Added abort cleanup for POS/table bootstrap requests and operational-view unmounts.

## 2026-06-30

- Implemented the production QR table ordering baseline: signed table QR tokens, local QR generation via `qrcode`, table QR management actions, owner QR settings, public QR session validation, mobile table ordering, waiter service requests, and QR orders flowing into existing Orders/Kitchen/POS surfaces.
- Hardened owner operational view switching with shared/cancellable session refresh, password-protected switch overlay, 3-second still-loading feedback, 10-second Retry/Cancel recovery, and deterministic route replacement.
- Added Firestore-backed owner communication settings and history through `/api/owner/communication`.
- Persisted owner order contact attempts, maps opens, test messages, and not-reachable events in `communicationHistory`.
- Mirrored order communication timeline metadata into `orders` and `customerOrders`.
- Tightened customer reorder to use current public menu availability and refreshed prices only.
- Verified `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and focused route checks for `/orders`, `/owner/settings`, `/owner/orders`, and `/api/owner/communication`.

## 2026-06-26

- Released final enterprise stabilization to `https://violet-squid-380447.hostingersite.com`.
- Verified Hostinger build commit `35017398773ba04efbdc3ab37d250cfa547c0675`.
- Passed production Firestore, API, browser, permission, audit, printer, and view-switching validation.
- Confirmed production counts: 5 orders, INR 1976 revenue, 3 customers, 3 loyalty accounts, 4 kitchen orders, 2 staff, 8 menu items, 2 offers, 0 inventory items, 0 accounting entries, and 18 customer orders.
- Remaining manual item: owner password-protected view switch verification.

## 2026-06-22

- Added Settings -> Pricing Rules with auto pricing, parcel markup %, delivery markup %, and packing charge controls.
- Added menu wizard channel-price auto calculation from Pricing Rules.
- Fixed menu wizard blank numeric inputs showing `NaN`.
- Renamed visible Owner navigation labels to Order Desk, Staff & Access, and Kitchen Operations Center.
- Reworked Kitchen Operations Center with KPI cards, horizontal Kanban columns, KOT print action, and touch status actions.
- Updated project tracker with status, progress %, pending work, owner, and date columns.
- Added roadmap for remaining owner enterprise work.
- Kept `/owner/offers` as the single offer configuration surface.

## 2026-06-23

- Started and documented the critical local/production data-parity investigation; it remains in progress.
- Proved local and deployed browser runtimes plus local Admin credentials target `sarva-food-app`.
- Recorded canonical Cafe Al Arab counts: 5 orders, INR 3,732 revenue, and zero CRM/loyalty records.
- Documented Zustand/report data-source gaps, missing owner customer routes, listener permission trace limits, and server-timezone-dependent offer visibility.

## 2026-06-25

- Completed Sprint 1 owner repository migration for Menu, Offers, Inventory, and Accounting.
- Added repository-backed owner Inventory and Accounting APIs with tenant authorization, CRUD, stock adjustments, purchase receipt handling, and audit records.
- Extended Menu and Offer repositories with repository-owned writes and deletes.
- Removed Sprint 1 business-data Zustand reads from owner menu, offers, inventory, accounting, digital menu, print menu, social post creation, and settings data export.
- Added loading, error, retry, and optimistic rollback behavior to owner repository data hooks.
- Verified local counts: Menu 8, Offers 2, Inventory 0, Accounting 0.
- Verified temporary CRUD records were removed and all baseline counts were restored.
- Verification passed with `npm run typecheck`, `npm run lint`, and `npm run build`.
- Hostinger production verified the same baseline counts on API and actual screens at commit `e75a3c5`.
- Continued Sprint 2 stabilization without duplicating closed owner repository work.
- Added admin repository/API data paths for admin dashboards, analytics, restaurants, users, campaigns, CMS-adjacent data, plans, subscriptions, reviews, and featured menu item flows.
- Added customer account/order/catering repository API paths and moved customer order history to `/api/customer/orders`.
- Added owner staff lifecycle, scoped owner API access, operational view switching, audit log, and printer settings repository/API surfaces.
- Verification passed with `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`.
## 2026-07-16 - POS Draft Autosave P0

- Confirmed waiter/cashier POS draft requests were rejected by `pos:update` authorization while the POS UI remained available.
- Changed POS draft state to local-first and added scoped localStorage plus IndexedDB recovery without changing repositories or Firestore schema.
- Added one debounced latest-draft writer, exponential retry, reconnect/focus/visibility recovery, categorized Retry/Dismiss notifications, and development-only diagnostics.
- Browser-tested rapid edits, provider failure, offline/online recovery, refresh recovery, toast deduplication, and recovery cleanup.
