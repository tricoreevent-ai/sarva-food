# Changelog

## 2026-07-01

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
