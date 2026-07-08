# Changelog

## 2026-07-08

- Completed Enterprise Performance Sprint Phase 2 with route-level bundle splitting and React startup optimization: `/` RSC route JS dropped from `1017 KB` to `455 KB`, `/profile` from `1714 KB` to `562 KB`, and Firestore/Auth route ownership from `94` manifests to `10`.
- Added `BUNDLE_DEEP_ANALYSIS.md`, `DEPENDENCY_AUDIT.md`, `ROUTE_LOAD_ANALYSIS.md`, and `PERFORMANCE_PHASE2_REPORT.md`; local production HTML probes confirm `/`, `/profile`, and `/owner/pos` no longer initially load Firestore/Auth/Stack/XLSX/Mapbox flagged chunks.
- Split Firebase config checks into `src/firebase/config.ts`, made `useAuthUser`, profile account actions, FCM support checks, and app-store owner/menu/staff/inventory mutation services load Firebase/Firestore/Stack helpers only at effect/action time.
- Completed the Enterprise Performance Recovery Sprint with a report-first audit in `PERFORMANCE_REPORT.md`, using saved Lighthouse artifacts and current analyzer output to identify text-render LCP delay, customer-shell/provider startup work, Firebase/Firestore eager imports, below-the-fold home menu fetches, GA timing, and skeleton/footer CLS risk.
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
- Added `npm run audit:release` and generated `scripts/release/repository-hardening-audit.md`; current static audit reports `0` debt markers and `0` matching unbounded Firestore collection reads, with remaining console hits limited to client/browser diagnostics.
- Added `docs/production-operational-runbook.md` with operational logging, disaster recovery, security, performance, provider, and infrastructure checklists.
- Prepared `v1.0.0-rc2` as the safe release-candidate strategy instead of rewriting the existing `v1.0.0-rc1` tag; package metadata now reports `1.0.0-rc.2`.
- Added `docs/production-environment-matrix.md` and `docs/final-manual-deployment-package.md`; aligned `.env*` examples, Hostinger docs, and production validators with the actual runtime env surface.
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
