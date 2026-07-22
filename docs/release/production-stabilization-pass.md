# Production Stabilization Pass

## RC5 Final Operational Hardening

- Fixed remaining production consistency gaps without redesign: POS add-on KOTs now preserve parent Kitchen linkage, initial KOT creation is deterministic/idempotent, and repository create retries no longer duplicate tickets.
- Completed realtime hardening: Kitchen ticket stream emits incremental deltas, Kitchen ready signals use SSE instead of interval polling, Owner Reports receives live order patches, and Owner Dashboard KPIs derive from patched operational rows.
- Added operational stress evidence for 128 concurrent orders, sequential numbering, multi-screen realtime fan-out, duplicate row/write prevention, listener cleanup, and long-running memory state.
- Final repository validation passed: typecheck, lint, build, analyze, audit:release, smoke:operational 40/40, runtime profile, operational stress, realtime profile, long memory profile, and diff check.

## RC5 Live Data Consistency Hotfix

- Root cause found: Owner Dashboard and Owner Orders used stale one-shot reads while POS/Waiter and Kitchen were live; Owner Orders also rendered linked `orders` and `kitchenOrders` as separate rows.
- Completed shared live operational merge: linked order/KOT documents now resolve to one row, preserve sequential numbers, and use Kitchen status until service/payment completion.
- Completed realtime propagation: Owner Dashboard and Owner Orders now subscribe to `/api/owner/pos/stream` and apply incremental patches without polling or manual refresh.
- Completed service boundary repair: Owner Orders Ready -> Served now uses `/api/owner/orders`, not the Kitchen update API.
- Final repository validation passed: typecheck, lint, build, analyze, audit:release, smoke:operational 36/36, runtime profile, and diff check.

## RC5 Enterprise Waiter Workflow

- Completed multi-ticket dining: one table/session can hold multiple independent active kitchen tickets without mutating prior KOTs.
- Completed Ready Signal architecture: Kitchen Ready targets Waiters for acknowledgement/recovery, Owner/Manager escalation remains deduped, and Waiter view provides live card/counter/sound cues.
- Completed service boundary: Kitchen owns Accepted -> Preparing -> Ready; POS/Waiter owns Ready -> Serving -> Completed.
- Completed Smart Bill Merge: payment checks same-table unpaid tickets and merges billing only while preserving each kitchen ticket timeline/audit.
- RC5 hardening: Smart Bill Merge now accepts open partial-payment tickets and still rejects locked, authorized, paid, refunded, closed, or already merged bills; Split Bill stays payment-state driven and is no longer gated by Served.
- Completed auto history: Completed cards remain visible for 30 minutes with countdown and manual Move To History.
- Final repository validation passed: typecheck, lint, build, analyze, audit:release, smoke:operational 24/24, runtime profile, and diff check.

## Phase 5B Operational Finalization

- Completed Active Orders optimization without a redesign: memoized cards, lazy details, stable callbacks, shared duration formatting, and shared status badges.
- Completed strict lifecycle enforcement for Order Taken -> Accepted -> Preparing -> Ready -> Served -> Paid -> Completed.
- Phase 5C supersedes the earlier service-dependent payment rule: payment is independent of Kitchen/service state, completion still requires Served + full Paid status, partial payments remain editable, and payment locks release through record/unlock retry paths.
- Completed Kitchen workflow boundary: Kitchen accepts, prepares, marks ready, notifies waiter, supports recall/reminder/timeline/escalation, and does not serve orders.
- Fixed active-order print context so Preview, Print, Receipt, and KOT target the selected order instead of stale POS bill state.
- Final repository validation is superseded by RC5 enterprise waiter workflow: typecheck, lint, build, analyze, audit:release, smoke:operational 24/24, runtime profile, and diff check.
- Remaining production QA: hosted authenticated owner/manager/waiter/cashier/Kitchen action matrix, providers, browser/device coverage, real printer/KOT/receipt output, Lighthouse, Chrome/React profiling, and long-run heap.

## Phase 5C Workflow Correction

- Payment can now be taken before Accepted, during Preparing, after Ready, before Served, or after Served as long as the order is active and not already paid/refunded.
- POS New Order cancel resumes the current draft instead of doing nothing; Clear Order remains the only destructive confirmation.
- Kitchen cards are item-first and touch-friendly, with order number, priority, ETA, current status, and icon actions visible by default; customer/payment/staff/source details live in Preview/More.
- Owner Orders payment visuals and cashier counts now match the independent payment lifecycle while Completed still moves orders to history only after Served + Paid.

## POS Fixes

- Removed unstable Zustand selectors from the POS route by selecting store arrays directly and deriving filtered menu/category arrays with `useMemo`.
- Added direct/no-table billing with dine-in, takeaway, parcel, and delivery order modes.
- Added optional customer name/phone capture, returning-customer phone lookup, loyalty summary, and previous-order visibility.
- Added KOT creation from POS without requiring a table.
- Added targeted bill/KOT printing so print actions do not print the full app shell.

## KDS Architecture

- KDS no longer depends on seeded static kitchen tickets.
- POS creates `kitchenOrders` through the ops service when Firebase auth is active.
- KDS subscribes to live Firestore `kitchenOrders` for `new`, `preparing`, `ready`, and `served`.
- Status flow is now `new -> preparing -> ready -> served -> completed`.
- Local queue remains available only as an offline/development fallback.

## Firebase Fixes

- Added production ops service for kitchen orders, POS receipts, payment transactions, customer loyalty profiles, and restaurant settings.
- Added Firestore collection references for `kitchenOrders`, `customers`, `restaurantSettings`, and `restaurantTables`.
- Updated rules and indexes for POS/KDS/customer/report workflows.
- Customer loyalty is keyed by normalized phone number and updated when POS payment is captured.

## Billing Workflow

Supported flows:

- Table order: select table, add items, send KOT, kitchen updates status, capture payment, print bill.
- Direct billing: choose no table, add items, send KOT or pay directly.
- Takeaway, parcel, and delivery billing: select order type, attach customer if available, send KOT, pay, print.

## Report Architecture

- Reports now use `AdvancedDataTable` with search, sorting, sticky headers, pagination, CSV export, and responsive overflow.
- Added detailed report tabs for sales, GST, orders, waiter performance, kitchen performance, inventory, loyalty, customers, payments, parcel/takeaway, delivery, and cancellations.

## Loyalty Workflow

- Loyalty page now uses an advanced customer table instead of cards only.
- Columns include customer name, phone, email, points, tier, total orders, CLV, last order, inactive days, and actions.
- POS billing updates loyalty profiles locally and writes Firestore customer profiles when authenticated.

## Mapbox Integration

- Replaced Google-style location handling with Mapbox geocoding in customer location search.
- Added `MapboxLocationPicker` for onboarding and admin map configuration.
- Owner onboarding captures address, latitude, longitude, Mapbox place ID, and delivery radius.
- Added Admin -> Map Settings route at `/admin/settings/map`.

## i18n Architecture

- Added centralized locale files:
  - `locales/en.json`
  - `locales/hi.json`
  - `locales/ml.json`
- Updated the translation provider to load dictionaries from locale JSON files.
- Existing translated navigation continues to use `useI18n`; new labels should use locale keys as screens are expanded.

## Printer Engine Fixes

- Fixed thermal amount alignment with fixed-width label and amount columns.
- Switched receipt previews to `whitespace-pre` to prevent amount wrapping such as `Sub Total: Rs` and value on the next line.
- Added paper support for `58mm`, `80mm`, `100mm`, `label`, and `A4`.
- Added template logo/footer image configuration and test print selectors for print type, paper width, and printer profile.

## Troubleshooting

See `docs/deployment/firebase-troubleshooting.md` for Firebase setup, rules, indexes, emulator usage, and permission debugging.
