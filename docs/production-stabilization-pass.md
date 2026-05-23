# Production Stabilization Pass

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

See `docs/firebase-troubleshooting.md` for Firebase setup, rules, indexes, emulator usage, and permission debugging.
