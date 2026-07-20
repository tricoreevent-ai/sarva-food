# Final Operations Hardening Pass

Date: 2026-05-15

## Verification Summary

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, 58 routes generated.
- Local production server: started on `http://localhost:3001`.
- Route audit: 47 application routes returned HTTP 200, including POS, KDS, reports, loyalty, printers, onboarding, inventory, accounting, offers, customer restaurant/menu, delivery, parcel, studio, and admin settings.

## Thermal Printing

- Receipt and KOT print roots now carry `data-paper-width`, allowing print CSS to size output to the selected printer profile.
- Print CSS removes browser/A4 margins through `@page` and `@media print`.
- Thermal layouts are constrained to `58mm`, `80mm`, `100mm`, or label widths.
- Print mode isolates `.print-ticket-active`, hides application chrome, prevents forced page breaks, and keeps compact `pre` formatting for ESC/POS-like alignment.
- The print engine keeps amount columns right-aligned and paper-width aware for compact, standard, and larger receipt modes.

## Accounting System

- `/owner/accounting` now includes a full accounting entry workflow for income and expenses.
- Supported income categories: sales, online, other, delivery, and catering.
- Supported expense categories: salary, contractor, ingredient purchase, utilities, rent, maintenance, internet, packaging, transport, marketing, and miscellaneous.
- Entries include amount, GST, payment mode, notes, attachment placeholder, branch, category, created by, and approval status.
- The module includes journal, ledger, transaction history, cashbook, GST summary, income analytics, expense analytics, CSV export, edit, delete, and print actions.

## RBAC Architecture

- 2026-07-20 RC5 waiter-serving hardening: `/api/owner/orders` now performs action-specific mutation authorization after session/origin validation, fixing Waiter Ready → Served/Completed without granting `canEditBill`; Kitchen roles remain blocked from Serve/Complete, Cashier keeps payment/refund/split/merge scope, and Owner/Admin retain override.
- Firestore rules now mirror the server workflow for direct protected writes: Waiter status-only writes are limited to Served/Completed, Kitchen status-only writes are limited to Accepted/Preparing/Ready/Cancelled, and paymentStatus is no longer accepted as a status-only direct mutation.
- Staff roles now include owner, manager, cashier, waiter, chef, accountant, delivery staff, admin, and inventory manager.
- `/admin/users` supports employee creation, role assignment, branch assignment, login disable/enable, password reset activity markers, and permission visibility.
- Firestore rules were extended for manager, accountant, and inventory manager scoped restaurant access.
- Role bootstrap documents can be initialized from Admin -> Settings -> Map Configuration.

## Authentication Testing Mode

- Local development test login is controlled by `NEXT_PUBLIC_ENABLE_TEST_LOGIN=true`.
- Production disables test login automatically through `NODE_ENV !== "production"` gating.
- Test accounts:
  - `divakdi@gmail.com` / `password123`
  - `manager@sarva.test` / `password123`
  - `cashier@sarva.test` / `password123`
  - `chef@sarva.test` / `password123`
  - `waiter@sarva.test` / `password123`
- Test login sets the local app auth user and routes into the requested workflow without creating Firebase Auth users.

## Report Optimization

- `/owner/reports` now has mandatory date presets: today, yesterday, last 7 days, last 30 days, this month, and custom range.
- Last 30 days is the default.
- Report exports include the selected date range.
- Displayed report data is filtered before table rendering to avoid full-range operational views by default.

## Firestore Setup

- Added `initializeFirestoreBaseline()` in `src/services/firestore-init-service.ts`.
- Admin -> Settings -> Map Configuration includes an Initialize Firestore action.
- The initializer creates baseline documents for:
  - users
  - roles
  - restaurants
  - branches
  - orders
  - kitchenOrders
  - loyaltyCustomers
  - reports
  - accountingEntries
  - expenses
  - printers
  - settings
  - inventory
  - menuItems
  - tables
- The initializer is guarded and skips unless Firebase is enabled, configured, running in the browser, and a Firebase user is signed in.

## Mapbox Setup

- Mapbox token is read from `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Token is stored in `.env.local`; components do not hardcode it.
- Added reusable Mapbox provider wrapper with runtime settings.
- Added reusable components:
  - `MapLocationPicker`
  - `AddressAutocomplete`
  - `DeliveryRadiusMap`
  - `BranchLocationMap`
- Supported Mapbox behavior:
  - autocomplete
  - reverse geocoding
  - draggable marker
  - click-to-update location
  - delivery radius visualization
  - latitude, longitude, formatted address, place ID, and delivery radius persistence
- Admin -> Settings -> Map Configuration supports maps enabled/disabled, token, default zoom, default country, and default delivery radius.

## Search And Duplicate Keys

- Added reusable `SearchableLookup` for name/phone/email-style operational lookups.
- POS customer lookup is connected to loyalty customers.
- Table waiter assignment uses the same lookup pattern.
- Location suggestion rendering now uses stable composite keys and deduplicated location suggestions to prevent duplicate React key warnings.

## Route Audit Results

The following routes returned HTTP 200 on the local production server:

`/`, `/auth/login`, `/pos`, `/pos/invoice`, `/pos/tables`, `/owner/kitchen`, `/owner/reports`, `/owner/loyalty`, `/owner/printers`, `/owner/onboarding`, `/owner/accounting`, `/owner/inventory`, `/owner/menu`, `/owner/menu/print`, `/owner/offers`, `/owner/tables`, `/owner/orders`, `/owner/social-posts`, `/admin`, `/admin/users`, `/admin/settings/map`, `/admin/analytics`, `/admin/campaigns`, `/admin/restaurants`, `/admin/social-queue`, `/admin/subscriptions`, `/restaurants`, `/restaurant/cafe-al-arab-thanisandra`, `/restaurant/cafe-al-arab-thanisandra/menu`, `/checkout`, `/track-order`, `/profile`, `/delivery`, `/delivery/orders`, `/delivery/history`, `/delivery/reports`, `/parcel`, `/catering`, `/catering/packages`, `/catering/requests`, `/offers`, `/offline`, `/studio`, `/studio/create-post`, `/studio/scheduled-posts`, `/studio/templates`, `/owner/digital-menu`.

## Operational Notes

- KDS and POS continue to use the operational Firestore service when Firebase is enabled and authenticated; otherwise they use the local persisted app store for development.
- Firestore rules and indexes must be deployed before production Firebase use.
- Mapbox runtime token override is useful for admin testing, but production deployments should keep the canonical token in environment variables.
