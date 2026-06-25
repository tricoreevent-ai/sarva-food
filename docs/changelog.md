# Changelog

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
