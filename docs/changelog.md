# Changelog

## 2026-07-06

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
