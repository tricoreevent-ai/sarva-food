# Release Notes

## RC6.5 Final Tracker Reconciliation - 2026-07-29

- Reconciled tracker, release, deployment, validation, performance, and handoff documentation against the current `release/production-nammude` base `98e16ab1cb5fcc2cb4fc9e4f55d95eca6f414a81`.
- Updated release metadata to `v1.0.0-rc6.5` / `1.0.0-rc.6.5`.
- Closed stale RC5/RC6.2 documentation conflicts; no unfinished repository P0/P1 feature work was identified.
- No restaurant workflow, UI redesign, API contract, Firestore schema/rule/index, or realtime-listener change was introduced.
- Production remains gated on hosted RC6.5 deployment verification, provider dashboards, Firebase Console, authenticated browser/device smoke, Lighthouse/Chrome profiling, long-run heap, and hardware/printer/QR validation.

## RC6.4.1 Enterprise Operational Order Classification Enhancement - 2026-07-28

- Retained existing primary source/type filters and added reusable secondary operational-state chips with counts for active restaurant operations.
- Added smart-priority surfacing for critical, delayed, SLA, ready pickup/waiter, pending bill/payment, waiting customer/driver, kitchen blocked, payment failed, refund, and cancelled conditions.
- Reused the shared classification model across Dashboard Live Orders, Order Desk, Active Orders, Kitchen, History, and Customer Search without introducing new Firestore listeners or APIs.
- Persisted the last selected filter per module on the client only and memoized all counts from existing state.

## RC6.4 Enterprise Order Classification Navigation - 2026-07-28

- Hardened operational order navigation around one shared order source/type classifier for All, Dine In, Parcel, Delivery, Online, QR, Scheduled, Catering, and Cancelled.
- Preserved existing repositories, APIs, realtime streams, role permissions, and workflow actions.

## RC6.3.1 Remove Restaurant Header-to-Hero Gap - 2026-07-28

- Removed the restaurant detail route-level duplicate top spacing that caused a visible blank strip between the public header and hero.
- Kept sticky header behavior and non-restaurant page spacing intact without global CSS resets or JavaScript layout calculations.

## RC6.3 Customer Experience, Branding Consistency, and Order Tracking Hardening - 2026-07-28

- Hardened customer discovery, public-header branding, checkout validation, order display normalization, and order tracking behavior.
- Preserved existing customer ordering APIs and Firestore schema.

## RC6.2 Critical Brand Logo Rendering Pipeline Fix - 2026-07-28

- Confirmed the production failure through browser DOM evidence: deployed commit `b992d2631bc3ed2dc785957c81bee174b927270f` renders `.brand-mark > img[src="/icons/food-gedi-icon-filled.svg"]`; the container and image are visible, but there are no inline SVG paths in the DOM.
- Confirmed the deployed SVG payload is a wrapper tile with `<image href="/icons/food-gedi-icon.svg">`, producing the blank cream square seen in production when the nested mark fails to render.
- Kept the logo design/colors unchanged and removed the fragile runtime image dependency from the main app/header icon path by rendering `BrandIcon` as inline SVG paths with explicit fills and instance-safe gradient ids.
- Added browser proof artifacts from a local production build: customer home/login show `svgMounted=true`, `pathCount=6`, 40x40 icon/svg boxes, visible display/opacity, and zero console errors.

## RC6.1 Critical Brand Logo Rendering Fix - 2026-07-27

- Fixed the actual blank-logo root cause: several Food Gedi SVG variants were wrapper SVGs with nested `<image href="/icons/...">` references, which could reserve layout space while failing to render the nested mark through `<img>`/`next/image`.
- Regenerated the full Food Gedi SVG/favicon/PWA family as self-contained vector assets with explicit fills, strokes, titles, viewBoxes, and no `currentColor` or nested image dependency.
- Changed the primary header/app `BrandIcon` to render inline SVG paths with instance-safe ids, so Customer, Owner, POS, Kitchen, Waiter, Cashier, Manager, Login, and mobile headers can show the actual mark without relying on image loading.
- Added `npm run brand:visual` as a release gate; it renders all Food Gedi SVG assets, verifies visible pixels, fails on nested SVG image/currentColor dependencies, and generates a contact-sheet artifact.

## RC6 Brand Visibility and Logo System Hardening - 2026-07-27

- Added a centralized brand system with `BrandProvider`, `BrandAssets`, `BrandTokens`, `BrandVariants`, and surface-aware helper APIs for logo, app icon, favicon, loading, notification, receipt, invoice, print, and social assets.
- Reworked shared brand components so `surface="auto"` reads the effective parent background and chooses the correct Food Gedi mark for light, dark, green, orange, print, and high-contrast surfaces without CSS filter hacks.
- Improved the compact header brand mark to `[icon] Food Gedi`, strengthened SVG stroke/padding/small-size readability, added accessible SVG titles, and respected reduced-motion for brand animations.
- Added white, black, high-contrast, print, text, text-white, small, animated, icon-white, icon-black, icon-small, and loading SVG variants; regenerated favicon, Apple Touch, Android, maskable, and notification icon assets.
- Aligned manifest, metadata, browser notifications, FCM webpush, brand compatibility shims, release version, and release marker with the RC6 Food Gedi brand system.
- Generated `docs/validation/BRAND_AUDIT_REPORT.md`; the audit reports zero actionable old-brand public hits and zero direct logo-asset references outside the brand layer, with compatibility namespaces documented separately.

## RC5 Deployment Certification Security Audit - 2026-07-24

- Closed unauthenticated signed Cloudinary uploads: signature creation now requires an active Admin/Owner/Manager session, enforces tenant folder ownership, signs only approved transformation fields, and applies per-user rate limiting.
- Closed the public order-notification mail relay: notification requests now require the owning customer session, verify the persisted order and restaurant, ignore caller-supplied recipient email, and apply rate limiting.
- Production now hides the development test-session endpoint with HTTP 404. Public callback, restaurant-lead, and client-monitoring ingestion now have bounded payload/rate controls.
- Release metadata now uses a stable built-artifact timestamp when deployment timestamp variables are absent.
- Read-only production Firestore certification found live data remediation items; no production documents were mutated during this audit.

## RC5 Release Closure Audit - 2026-07-23

- Fixed a P0 direct-item crash by moving the custom alert context above customer and dashboard page components; removed the duplicate nested alert providers left after that correction.
- Replaced customer order-tracking 10-second polling with the existing shared, deduplicated Firestore order listener while retaining the authenticated customer API as initial/fallback data.
- Removed false-success Kitchen History archive controls and the non-persisted Admin subscription notification action. History printing now invokes the browser print path instead of showing an instruction-only toast.
- Completed production-browser customer/login UAT with zero console errors, failed requests, dead links, or horizontal overflow. Location, restaurant/menu, item sharing, cart persistence, Owner/Admin password controls, and Owner recovery passed.
- Final repository validation passed: typecheck, lint, build, analyze, audit, operational smoke 46/46, production smoke 7/7 automated, stress/realtime/memory 4/4 each, runtime profile, contrast, and diff checks.

## RC5 Final Production Certification - 2026-07-23

- Unified Admin with the Owner shell theme contract, preserving Admin navigation/RBAC/data behavior while reusing Owner typography, spacing, colors, cards, controls, responsive breakpoints, loading/error states, and dark/light presentation.
- Corrected readiness semantics: failed Firestore/Storage probes remain blocking, while successful Application Default Credential connectivity without explicit Firebase Admin variables is reported under `configurationWarnings` instead of returning a false HTTP 503.
- Production-build route smoke now passes 7/7, including `/health/ready`; deterministic operational certification passes 45/45.
- Full local certification passes typecheck, lint, build, analyze, release audit, operational stress, realtime profile, long-memory profile, runtime profile, first-party short-link verification, and diff checks. Authenticated hosted browser, provider, physical device/printer, Lighthouse, and browser heap/accessibility checks remain manual.

## RC5 Menu Link and Sharing Hardening - 2026-07-23

- Replaced the TinyURL network dependency with the existing first-party `/r/{restaurant}/{item}` route, now implemented as a real HTTP 307 route handler with canonical encoded item IDs and no new Firestore schema or third-party rate limit.
- Fixed specific menu item lookup for encoded and cart-customized IDs by using one shared canonical item-link utility across cards, detail resolution, owner preview, sharing, and redirects.
- Expanded the reusable share preview to WhatsApp/WhatsApp Business, Telegram, SMS, email, and copy, with item photo preview, price, description, restaurant, order link, schedule link, delivery availability, hours, phone, and map data when configured.
- Removed false-success catering actions: quote email remains functional without claiming an unsaved status mutation, while conversion stays explicitly disabled until a repository-backed workflow exists.
- Validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, operational smoke `43/43`, operational stress `4/4`, realtime profile `4/4`, long-memory profile `4/4`, runtime profile, live internal short-link `307 → 200`, and diff checks. Hosted authenticated/device/provider/Lighthouse checks remain manual.

## RC5 Owner/Waiter Active Orders Unification - 2026-07-22

- Unified Owner Active Orders onto the same exported operational panel used by POS/Waiter, preserving shared live order/KOT merging, memoized cards, lazy details, and shared action routing.
- Added server-side `/api/owner/orders` `send_to_kitchen` backed by `OrderRepository.sendToKitchen`; it creates deterministic linked KOTs in a transaction, updates `orders` and `customerOrders`, writes audit/notification entries, and returns existing linked tickets on retry.
- Owner Active Orders now uses the shared action set for Send To Kitchen, Track Kitchen, Serve, Complete, Collect Payment, Print/KOT/Receipt, Preview, Reminder, Recall, Transfer, Split, Merge, Timeline, History, and Reassign Waiter; POS handoff opens the selected order context for print/add/split/merge workflows.
- Waiter view can send order-only tickets to Kitchen while Kitchen Operations remains the owner of Accepted → Preparing → Ready state changes; cashier/owner payment and completion guards remain unchanged.
- Final validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 42/42, `profile:runtime`, and `git diff --check`; build/analyze retain the accepted Firebase/protobuf warning.

## RC5 Kitchen Accept RBAC / Realtime Fix - 2026-07-22

- Root cause: Kitchen Accept succeeded through `/api/owner/kitchen`, then the Kitchen screen bootstrap executed a secondary `GET /api/owner/tables` request that requires `tables:read`; Kitchen roles do not own Tables master access, so the UI showed a post-success `Permission denied for tables:read` failure.
- Removed the Owner Tables dependency from Kitchen bootstrap and request-alert UI state; Kitchen now loads Kitchen tickets, operational settings, Kitchen ticket SSE, ready-signal SSE, and Kitchen-scoped print settings only.
- Added `surface=kitchen` support to `/api/owner/printers` so Kitchen printer reads/logs/toggles use Kitchen/print permissions and return only Kitchen profiles, KOT templates, and KOT print logs instead of Owner Settings context.
- Expanded operational smoke to 41/41 with `kitchen:rbac-bootstrap-without-tables`; validation passed for typecheck, lint, build, analyze, audit:release, smoke:operational, runtime profile, realtime profile, long-memory profile, operational stress, and diff check.

## RC5 Final Operational Hardening - 2026-07-22

- Root causes fixed: POS add-on tickets could lose their parent KOT link, Kitchen create retries could duplicate KOT documents, Kitchen stream updates still sent full snapshots, Kitchen ready signals used interval polling, Owner Dashboard revenue/orders could lag behind live state, and Owner Reports used one-shot data.
- Hardened the existing workflow without UI redesign: add-on KOTs now keep parent linkage, KOT creation is idempotent by deterministic document id, Kitchen/ready-signal/Reports streams use incremental SSE deltas, and Dashboard/Reports derive from live operational state.
- Stress coverage added for 128 concurrent orders, atomic sequential numbering, multi-screen realtime patching, long-running memory behavior, duplicate row/write prevention, add-items-after-kitchen-start, and listener cleanup.
- Operational smoke expanded to `40/40`; full validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational`, `profile:runtime`, `stress:operational`, `profile:realtime`, `profile:memory:long`, and `git diff --check`.

## RC5 Live Data Consistency Hotfix - 2026-07-22

- Root cause: Owner Dashboard and Owner Orders were still using one-shot REST snapshots while POS/Waiter and Kitchen used live streams; Owner Orders also rendered linked `orders` and `kitchenOrders` as separate rows, allowing the same ticket number to appear with different states.
- Added a shared incremental realtime reducer and shared live operational merge utility so linked `orders` + `kitchenOrders` resolve to one operational row with Kitchen state winning until service/payment completion.
- Owner Dashboard now subscribes to `/api/owner/pos/stream`, patches only changed order/KOT documents, and derives Live Orders/Kitchen counts from the merged live operational dataset instead of stale analytics counts.
- Owner Orders now subscribes to the same incremental stream, preserves selected date-range boundaries, removes linked order/KOT duplication, preserves order numbers, and routes Ready → Served through `/api/owner/orders` instead of the Kitchen update API.
- Dependency graph verified: Firestore `orders` + `kitchenOrders` → repositories → `/api/owner/pos` bootstrap + `/api/owner/pos/stream` incremental patches → POS/Waiter, Owner Dashboard, Owner Orders/Cashier/Manager views; Kitchen Operations remains on `kitchenOrders` via `/api/owner/kitchen/stream`.
- Validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 36/36, and `profile:runtime`; build/analyze retain the accepted Firebase/protobuf warning.

## RC5 POS Realtime Workflow, Display Options, and Sequential Numbering - 2026-07-21

- Replaced the low-value POS menu filter toggle with a persisted per-operator Display Options menu: show/hide images, compact/comfortable cards, grid/list, descriptions/price-only, and large-touch/compact-desktop modes.
- Hidden-image mode no longer renders `SafeImage`, defaults mobile to images off, and switches the POS menu into compact rows with capped incremental rendering for faster scrolling.
- Review Order now exposes workflow-aware primary actions: Continue to Payment and/or Send to Kitchen based on Owner Settings `payment-first`, `kitchen-first`, or `flexible` mode.
- Owner Settings now persists POS display defaults, workflow mode, and sequential POS numbering alongside existing operational delay/sound settings.
- Added an incremental POS realtime stream so order/kitchen status changes patch only changed cards across POS Active Orders without manual refresh or full collection reloads.
- POS/online orders now receive atomic per-restaurant sequential numbers through the repository transaction, and placed POS orders synchronize the same number back to linked Kitchen tickets.
- Operational smoke expanded to `35/35` deterministic checks for display options, hidden-image rendering, workflow settings, incremental realtime stream, and sequential numbering.
- Final validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 35/35, `profile:runtime`, and `git diff --check`; build/analyze retain the accepted Firebase/protobuf warning.

## RC5 Waiter Serving RBAC and Kitchen History Density - 2026-07-20

- Fixed the `403 Permission denied for orders:update` workflow gap: Waiter service actions now pass server authorization for Ready → Served and Served → Completed while payment/billing privileges remain cashier/owner controlled.
- Added action-specific `/api/owner/orders` authorization so Kitchen cannot Serve/Complete through order APIs, Waiter cannot Prepare/Ready, and Owner/Admin retain override authority.
- Aligned Firestore rules with the server workflow: Kitchen roles can update Accepted/Preparing/Ready only, Waiters can update Served/Completed only, and direct payment-status mutation is no longer accepted as a status-only write.
- Ready notifications now include Waiter targets and allow waiter acknowledgement/recovery while preserving Kitchen-owned ready-signal creation and escalation dedupe.
- Completed the interrupted Kitchen History enterprise data grid: compact/comfortable/touch density modes, resizable persisted columns, collapsible advanced filters/column chooser, memoized keyboard-accessible rows, icon-only Preview/Print actions, overflow More menu, compact chips/items, and floating bulk toolbar.
- Operational smoke was expanded to `31/31` deterministic checks for waiter Serve/Complete, Kitchen cannot Serve, Owner override, permission denial, Firestore authorization parity, waiter KOT read/create fallback, and high-density Kitchen History contracts.
- Final validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 31/31, `profile:runtime`, and `git diff --check`; build/analyze retain the accepted Firebase/protobuf warning.

## RC5 Login and Kitchen History Enterprise UI - 2026-07-20

- Redesigned Owner Login into a premium mobile-first SaaS authentication surface while preserving the existing owner auth and OTP reset APIs.
- Added login UX hardening: remembered email, autofocus, autocomplete, Caps Lock warning, session-timeout message, stronger loading state, password visibility controls, and accessible inline status/error messaging.
- Replaced Kitchen Order History card/accordion layout with an enterprise management table: server-filtered paging, sticky header/action column, sorting, column visibility, saved filters, multi-field filtering, bulk selection, CSV/Excel export, print, and expandable in-row details.
- Kitchen History row details now expose timeline, kitchen status history, payment/print metadata, items, notes, station, delay, and merged-ticket references without navigating away.
- Validation covers the new owner-login and kitchen-history contracts through `smoke:operational`; full release gates are refreshed in the validation reports.

## RC5 Enterprise Waiter Operational Workflow - 2026-07-20

- Enterprise dining update: tables can now keep multiple independent active kitchen tickets while bill merge remains billing-only and preserves each original kitchen ticket audit trail.
- Kitchen Ready sends targeted Waiter-ready notifications with acknowledgement/recovery; Owner/Manager escalation remains deduped and Waiter view still uses live columns, card state, counters, and active-view sound.
- Waiter service now owns Ready → Serving → Completed; POS updates service/order state without asking Kitchen to mark Served, so Kitchen responsibility ends at Ready.
- Completed orders stay in the Active Orders Completed lane for 30 minutes with a countdown and can be manually moved to History sooner.
- Smart Bill Merge appears when payment starts on a table/session with other open unpaid tickets and offers Merge All, Merge Selected, Pay Separately, Move to another bill label, and Split Bill remains separate.
- RC5 hardening fixed Smart Bill Merge for open partial-payment tickets while continuing to block locked, authorized, paid, refunded, closed, or already merged bills; Split Bill no longer incorrectly requires the order to be Served.
- Active Orders Waiter view is now a live stage board for New, Accepted, Preparing, Ready, Serving, and Completed, so cards move by Kitchen/service status instead of being masked by Paid state.
- Active order cards now keep Kitchen status, payment status, preparation progress, priority, ETA, Ready for Pickup, Serving, and Completed indicators visible together.
- Kitchen Operations Center cards now adapt to item count, remove fixed blank item areas, keep touch-friendly actions, and preserve memoization/windowing with the updated virtual row estimate.
- Ready signals use Owner Settings sound targets for New Order, Kitchen Accepted, Preparing, Ready for Pickup, Urgent Delay, and Customer Request while suppressing duplicate bootstrap alerts.
- Order timelines now label Kitchen, Service, Payment, Print, and Audit events independently with timestamps.
- Final validation passed: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 24/24, `profile:runtime`, and `git diff --check`.
- Repository readiness: `100%`. Production readiness: `92%`. Production remains `NO-GO` pending hosted authenticated multi-role, provider, browser/device, printer, Lighthouse, Chrome profiling, long-run heap, Firebase Console, and hardware QA.

## Phase 5C Payment Workflow and Kitchen Operations UI - 2026-07-20

- Corrected payment lifecycle so payment can be collected before, during, or after Kitchen preparation/service for any active non-cancelled order that is not already paid/refunded.
- Preserved completion guard: orders can move to Completed only after physical service and full payment.
- Fixed POS New Order cancel so it resumes the current draft/cart/customer/discount/payment draft; Clear Order remains the destructive path.
- Simplified Kitchen cards to item-first operation cards with order number, priority, ETA, current status, and icon actions; customer/payment/staff/source details live in Preview/More.
- Updated Owner Orders paid state, cashier pending counts, Active Orders payment/split actions, and operational smoke coverage for the corrected lifecycle.
- Validation is superseded by the RC5 enterprise waiter workflow: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 24/24, `profile:runtime`, and `git diff --check`.
- Repository readiness: `100%`. Production readiness: `92%`. Production remains `NO-GO` pending hosted authenticated multi-role, provider, browser/device, printer, Lighthouse, Chrome profiling, and long-run heap QA.

## Phase 5B Operational Hardening Finalization - 2026-07-17

- Completed Active Orders/POS/Kitchen operational hardening without redesigning the UI or changing Firestore schema/rules/indexes.
- Enforced Order Taken → Accepted → Preparing → Ready → Served → Paid → Completed across UI, API, repository, and smoke contracts; illegal transitions are rejected.
- Phase 5C supersedes the earlier service-dependent payment rule; completion remains blocked before fully Paid and Served, partial payments remain editable, and payment locks release through record/unlock flows.
- Kitchen remains responsible for Accepted → Preparing → Ready plus Ready Signal, Reminder, Kitchen Recall, timeline, acknowledgement, and escalation.
- Fixed active-order print context so Preview, Print, Receipt, and KOT use the selected order instead of stale POS bill state.
- Final validation is superseded by the RC5 enterprise waiter workflow: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 24/24, `profile:runtime`, and `git diff --check`.
- Repository readiness: `100%`. Production readiness: `92%`. Production remains `NO-GO` pending hosted authenticated multi-role, provider, browser/device, printer, Lighthouse, Chrome profiling, and long-run heap QA.

## Phase 5C Hostinger Origin Guard Fix - 2026-07-16

- Fixed production POS draft save and payment collection requests being rejected as cross-origin behind Hostinger's HTTPS reverse proxy.
- Owner mutation CSRF validation now accepts the internal Next origin, the request Host origin, or the configured canonical public app origin.
- Foreign and malformed origins remain blocked.
- Added deterministic proxy/public/local/attacker origin checks to `smoke:operational`.

## Phase 5B POS Active Orders - 2026-07-16

- Replaced the POS Active Orders nested accordion path with a flattened memoized operational card.
- Fixed delayed/inconsistent expansion by removing height animation and mounting details only for the selected card.
- Kept Serve, Ready Signal, Payment, Print, Preview, and More visible on every collapsed card.
- Added 4/5/6-column desktop density, 88px cards, a 56px summary strip, cards-only scrolling, debounced search, and a collapsed status ribbon.
- Reduced deterministic expansion render scope from 30 cards to 1 (96.7%), or 2 when switching (93.3%).
- Preserved all existing repositories, APIs, notifications, payment behavior, and Ready → Served → Paid → Completed lifecycle.

## Phase 4E Active Orders - 2026-07-16

- Fixed premature completion and enforced Ready → Served → Paid → Completed.
- Added bounded delay formatting, stale-order labeling, sequential timeline deduplication, and correct 100% green kitchen progress.
- Wired and regression-checked every Active Orders contextual action, including waiter reassignment and kitchen recall.
- Compacted `/owner/pos?panel=active` into a responsive operational card grid with thin progress and sticky summary metrics.

## Phase 4D Operational Hardening - 2026-07-16

- Expanded `smoke:operational` from static source checks to 9/9 deterministic draft, role, notification, service-worker, and accessibility contract simulations.
- Fixed push deep-link handling so an existing tab with matching query/hash is focused rather than duplicated.
- Full RC5 repository gates pass; production remains NO-GO pending environment/provider/Firebase Console/authenticated device/Lighthouse/hardware evidence.
- Repository readiness: `100%`. Production readiness: `92%`.

## v1.0.0-rc5 - Release Candidate

Commit: branch includes RC5 Active Orders baseline `ba8e957d57b949a94d0c42a3b170cf198917c0d8`; hosted RC5 runtime includes that baseline; existing RC4 tag remains unchanged
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Active release metadata, package metadata, environment templates, and deployment docs now align on `v1.0.0-rc5` / `1.0.0-rc.5`.
- Historical RC5 tagging guidance is superseded by RC6.5; existing RC tags remain immutable.
- Phase 4 hardening and report synchronization are complete repository-side.
- Production release remains blocked by production env/provider validation, Firebase Console, provider dashboard, authenticated browser, Lighthouse, and hardware smoke gates.
- Phase 4C repository work is complete locally and pending commit/deployment; production readiness remains `90%` until hosted VAPID, real-device push, and owner Razorpay provider evidence pass.

### Completed

- Removed generated owner temporary passwords from admin API/browser responses; credentials are sent through the configured email path only.
- Replaced TinyURL raw provider error echo with a safe generic fallback message.
- Corrected production health metadata to avoid a stale `development` fallback when app env is absent.
- Expanded the production environment matrix from the actual runtime/build env scan; Phase 4C supersedes the earlier global Razorpay requirement with owner-scoped settings and an optional legacy fallback.
- Removed unconditional Cloudinary/Firebase Storage global preconnects, kept GTM preconnect conditional, and kept no-store on dynamic/release routes.
- Deferred Firebase Auth, Stack Auth, and toaster runtime from auth/session startup paths where safe.
- Prevented duplicate same-source brand logo image requests.
- Preserved the already-implemented POS/Active Orders operational workflow updates: incremental KOT, Ready To Serve waiter view, Order History filters, compact active rows, and portaled More actions.
- Fixed the More actions component hook order found during the interrupted audit continuation.
- Consolidated duplicated client error-reason helpers into `src/lib/client-diagnostics.ts`.
- Added explicit accessible names to compact order icon-only action controls.
- Completed RC5 image optimization: shared Cloudinary presets, AVIF-first upload compression, WebP/JPEG fallback, incoming Cloudinary transforms, `dpr_auto` delivery cleanup, and right-sized `SafeImage` thumbnails.
- Completed the Owner Active Orders operational workspace redesign: status summary cards, live tab counts, advanced search, workflow ribbon, status rail, kitchen progress, KOT/payment indicators, compact expanded details, context-aware actions, and mobile workflow cues.
- Corrected the production environment matrix to require `v1.0.0-rc5`.
- Regenerated bundle, runtime, render, network, memory, provider, smoke, deployment, env, performance, and certification reports.
- Completed the RC5 pending-work audit: no repository-side code blocker remains; remaining work is Hostinger/Firebase/provider/browser/Lighthouse/hardware validation.
- Completed Phase 4C push hardening with bounded retry, service-worker diagnostics, token lifecycle controls, an owner test center, and a 34-scenario machine-verifiable notification catalog.
- Completed owner Razorpay verification tooling with encrypted owner settings reuse, redacted test APIs/logs, test-order checkout, signature/webhook self-tests, test-mode capture/refund, and ten-tenant isolation contracts.
- Configured the supplied public VAPID key in environment templates, made global Razorpay env optional legacy fallback, and kept private VAPID/provider secrets server/provider-only.
- Fixed the P0 POS draft failure: waiter/cashier draft authorization now matches the existing POS UI, cart mutations commit locally before network writes, and pending drafts recover through scoped localStorage plus IndexedDB metadata.
- Added debounced latest-draft autosave, exponential backoff, reconnect/focus/visibility retry, one categorized Retry/Dismiss notification, and a development-only draft diagnostics panel.

### Validation

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run build`: passed with the accepted Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run analyze`: passed with the accepted Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run profile:runtime`: passed.
- `cmd /c npm run audit:release`: passed.
- `cmd /c npm run smoke:operational`: passed.
- `cmd /c npm run verify:phase4c`: passed `19/19` checks covering 34 notification scenarios, safe deep links, push lifecycle/retry, all payment test-center actions, owner-specific checkout resolution, payment security, and ten tenant mappings.
- `cmd /c npm run validate:prod-env`: expected local failure with `46` pass, `17` errors, and `1` manual owner-Razorpay check; remaining values are production-only Hostinger/Firebase/QR/alert/encryption configuration.
- `PRODUCTION_URL=... cmd /c npm run verify:deployment`: `17` pass, `0` warnings, `0` errors; hosted runtime includes Active Orders baseline `ba8e957d57b949a94d0c42a3b170cf198917c0d8`.
- `PRODUCTION_URL=... cmd /c npm run verify:providers`: `8` pass, `3` manual.
- `PRODUCTION_URL=... cmd /c npm run smoke:production`: `7` pass, `18` manual.
- `PRODUCTION_URL=... cmd /c npm run monitor:memory`: `1` pass, `2` manual.
- `PRODUCTION_URL=... cmd /c npm run verify:performance`: `3` pass, `1` warning, `2` manual.
- 2026-07-13 RC5 closure: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed; build/analyze retain the accepted Firebase/protobuf warning.
- 2026-07-13 pending-work audit: runtime source scan found no actionable TODO/FIXME, app-source `console.log`, duplicate order component, incomplete repository path, duplicate listener, or unbounded Firestore read requiring a release-freeze code change.
- 2026-07-15 image optimization closure: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed; analyzer timeout resolved and bundle evidence regenerated.
- 2026-07-16 Active Orders closure: `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, `cmd /c npm run smoke:operational`, `cmd /c npm run profile:runtime`, and `git diff --check` passed; hosted probes are RC5/production but latest SHA redeploy remains pending.
- 2026-07-16 Phase 5B high-density board: all required gates passed on the final source; operational smoke is 14/14, `/owner/pos` remains 587 KB (+29 bytes), and the accepted Firebase/protobuf warning is unchanged.
- 2026-07-20 RC5 enterprise waiter workflow: `typecheck`, `lint`, `build`, `analyze`, `audit:release`, `smoke:operational` 24/24, `profile:runtime`, and `git diff --check` passed; multi-ticket dining, bill-only merge, Ready Signal, service-owned Serving, completed holding/history, payment independence, Waiter Kitchen/payment visibility, Kitchen item-first cards, configurable sounds, timeline categories, and readiness docs are repository complete.
- 2026-07-16 POS draft P0 browser QA: former waiter/cashier `403 pos:update` paths now reach validation, three rapid adds retained quantity `3` with one toast, offline quantity `2` recovered and synced on reconnect, refresh restored the pending draft, and Clear/Hold server deletion now uses the same recoverable retry path.

## v1.0.0-rc3 - Release Candidate

Commit: `cd1c81435a1e535483b94d66ffa1b1bf63494c0b`
Branch: `release/production-nammude`
Production URL: `https://violet-squid-380447.hostingersite.com`

### Status

- Repository-side health endpoints, diagnostics, observability, release metadata, env validation, QR secret requirements, and safe diagnostics have been hardened for rc3.
- Runtime performance recovery and Phase 2 route-level bundle splitting were completed repository-side; final Lighthouse/Core Web Vitals scoring still requires a production-env hosted browser run.
- The existing `v1.0.0-rc1` and published `v1.0.0-rc2` tags remain immutable; `v1.0.0-rc3` points to the final committed candidate.
- Production release remains blocked by manual environment, provider, Firestore, browser, and hardware verification gates.

### Completed

- Repository-side observability hardening: request/correlation/trace/transaction context, masked production logger, unified API error primitives, and centralized high-risk server diagnostics.
- Added root `docs/performance/PERFORMANCE_REPORT.md` and completed runtime-focused performance recovery: deferred Google Analytics, idle-mounted customer shell background providers, lazy-loaded logout/favorite/Firestore address modules, made Firebase compatibility exports non-eager, deferred home menu preview fetch until idle, and replaced the home splash loader with a layout-reserving skeleton.
- Completed Phase 2 route-level bundle splitting with `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`: `/` route JS reduced from `1017 KB` to `455 KB`, `/profile` from `1714 KB` to `562 KB`, and Firestore/Auth ownership from `94` route manifests to `10`.
- Added public no-store `/health/live`, `/health/ready`, and `/health/startup` endpoints with safe runtime, Firebase, Firestore, storage, SMTP, Cloudinary, Razorpay, memory, CPU, build, and request-id metadata.
- Expanded authenticated Owner/Admin diagnostics with operational health metadata for listener ownership, cache state, queue state, tenant/open-order/Kitchen counts, memory, CPU estimate, and slow-query signal.
- Added `npm run audit:release` with generated repository hardening audit report and production operational runbook/checklists.
- Enterprise production-hardening and release-closure pass through local repository-verifiable gates.
- Release metadata default updated to `v1.0.0-rc3`; package version updated to `1.0.0-rc.3`.
- Production env matrix added and validation scripts aligned to actual runtime requirements.
- Production QR signing now requires explicit `TABLE_QR_SECRET`.
- Raw-error logging/diagnostic paths were sanitized in customer/public/payment/admin release surfaces.
- Sprint 1 production-readiness code pass from base `8a0315c37228918e82498ae0d7c78317d616da45`: FCM push, explicit Firestore support rules, owner API mutation hardening, monitoring, and targeted performance cleanup.
- Owner Operations Center V2 active orders stabilization.
- Kitchen Operations Center and Kitchen History readiness.
- Razorpay server integration, webhook handling, refunds, and owner settings support.
- POS/Kitchen operational workflow stabilization.
- Split bill, transfer table, merge table, payment history, print history, audit timeline, and notification center workflows.
- QR ordering, phone verification, printing, customer module, owner module, admin module, and Master Menu Library release-candidate code readiness.

### Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `cmd /c npm run audit:release`: passed and generated `docs/validation/repository-hardening-audit.md`.
- `npm run build`: passed with the known Firebase/protobuf dynamic dependency warning.
- `cmd /c npm run analyze`: passed and regenerated `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html`.
- Local production HTML probe: passed for `/`, `/profile`, `/login`, and `/owner/pos`; `/`, `/profile`, and `/owner/pos` do not initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks.
- `cmd /c npm run smoke:operational`: passed.
- `git diff --check`: passed with Git line-ending normalization warning only.
- `cmd /c npm run validate:prod-env`: expected to fail locally unless real production Hostinger/Firebase/provider values are present.

### Mandatory Gates Still Open

- Firebase Web Push VAPID key must be configured before production push smoke.
- `NEXT_PUBLIC_APP_ENV` must be `production`; hosted metadata currently reports `development`.
- `NEXT_PUBLIC_APP_VERSION` must be `v1.0.0-rc3` when configured in Hostinger.
- `NEXT_PUBLIC_APP_URL` must use `https://` in production-equivalent env validation.
- Firebase Admin variables must be configured with real production values.
- `TABLE_QR_SECRET` must be configured with a stable long random secret.
- `DATABASE_ALERT_EMAIL` must be configured.
- Firestore rules and indexes require manual production deployment review.
- Hosted `/robots.txt` must be refreshed after Hostinger restart/cache clear; current hosted output still blocks Googlebot although the local build route is correct.
- Authenticated browser smoke, provider smoke, and printer/hardware smoke remain manual.

### Rollback

Previous validated Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`.
