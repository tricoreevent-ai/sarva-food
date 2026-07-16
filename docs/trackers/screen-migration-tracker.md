# Screen Migration Tracker

Last updated: 2026-07-16

| Screen | Current Source | Target Source | Status |
| --- | --- | --- | --- |
| Owner Dashboard | `/api/owner/analytics` | Repository-backed dashboard API for all business metrics | Completed |
| Owner Orders | `/api/owner/orders` | `OrderRepository` through owner orders API | Completed |
| Owner Reports | `/api/owner/analytics` | `/api/owner/analytics` | Completed |
| Owner Customers | `/api/owner/customers` | `/api/owner/customers` | Completed |
| Owner Loyalty | `/api/owner/analytics` | `/api/owner/analytics` plus `LoyaltyRepository` | Completed |
| Owner Menu | `/api/owner/menu` | `MenuRepository` through owner menu API | Completed |
| Owner Offers | `/api/owner/offers` | `OfferRepository` through owner offers API | Completed |
| Owner Tables | `/api/owner/tables` and `/api/owner/kitchen` | `TableRepository` through owner tables API | Completed |
| Owner Kitchen | `/api/owner/kitchen` | `KitchenRepository`/`OrderRepository` API | Completed |
| Owner POS | `/api/owner/pos`; bill draft remains UI state | `OrderRepository`, `MenuRepository`, `TableRepository`, `CustomerRepository` APIs | Completed |
| Owner Employees | `/api/owner/staff` | `StaffRepository` API | Completed |
| Owner Inventory | `/api/owner/inventory` | `InventoryRepository` API | Completed |
| Owner Accounting | `/api/owner/accounting` | `AccountingRepository` API | Completed |
| Admin Dashboard | `/api/admin/data` | `AdminRepository` snapshot API | Completed |
| Admin Analytics | `/api/admin/data` | `AdminRepository` analytics data from repository snapshot | Completed |
| Admin Restaurants | `/api/admin/data` | `AdminRepository` restaurant/staff/order/application data | Completed |
| Customer Cart | `useCartStore` | Cart UI state allowed; persisted cart API for cross-device | Partial |
| Customer Checkout | `useCartStore` plus `/api/orders` | `/api/orders` with `OrderRepository`; cart remains UI state | Completed |
| Customer Order History | `/api/customer/orders` | Customer order API using `OrderRepository` | Completed |

## POS Active Orders UI Closure - 2026-07-16

| Screen | UI Result | Data/Workflow Result | Remaining QA |
| --- | --- | --- | --- |
| `/owner/pos?panel=active` | 88px collapsed cards, 56px summary, fixed cards-only viewport, sticky operational controls, 1/2/4/5/6-column grid, collapsed status ribbon | Existing POS/Kitchen/order repositories, APIs, notifications, and Ready → Served → Paid → Completed lifecycle preserved | Hosted authenticated role/device/printer and browser profiler smoke |

## Final Enterprise Production Validation

Production URL: `https://violet-squid-380447.hostingersite.com`

Commit, release, and Hostinger SHA: `35017398773ba04efbdc3ab37d250cfa547c0675`

Deployment timestamp: `2026-06-26T04:48:26.958Z`

| Screen | Production Result |
| --- | --- |
| Owner Dashboard | PASS |
| Owner Orders | PASS |
| Kitchen | PASS |
| POS | PASS |
| Employees | PASS |
| Tables | PASS |
| Menu | PASS |
| Offers | PASS |
| Inventory | PASS |
| Accounting | PASS |
| Admin Dashboard | PASS |
| Admin Analytics | PASS |
| Customer Profile | PASS |
| Customer Orders | PASS |
| Customer History | PASS |
| Audit | PASS |
| Printers | PASS |
| View Switching | PASS |

## Sprint 2 Local Build Validation

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

## Operational Production Validation

Release: `operational-migration-stable`
Commit: `c11a00d89c008db64afbd3a29fb5850c0986ee93`

| Screen | Firestore/API | Production Screen | Result |
| --- | ---: | ---: | --- |
| Owner Dashboard orders | 5 | 5 | PASS |
| Owner Dashboard revenue | INR 1976 | INR 1976 | PASS |
| Owner Dashboard customers | 3 | 3 | PASS |
| Owner Dashboard loyalty | 3 | 3 | PASS |
| Owner Dashboard menu | 8 | 8 | PASS |
| Owner Dashboard staff | 2 | 2 | PASS |
| Owner Dashboard kitchen | 4 | 4 | PASS |
| Owner Orders | 5 | 5 | PASS |
| Owner Kitchen | 4 | 4 | PASS |
| Owner POS menu/customers/orders | 8 / 3 / 5 | 8 / 3 / 5 | PASS |
| Owner Employees | 2 | 2 | PASS |
| Owner Tables | 0 | 0 | PASS |

## Sprint 1 Local Validation

| Screen | Firestore | Repository API | Local Screen | Result |
| --- | ---: | ---: | ---: | --- |
| Owner Menu | 8 | 8 | 8 | PASS |
| Owner Offers | 2 | 2 | 2 | PASS |
| Owner Inventory | 0 | 0 | 0 | PASS |
| Owner Accounting | 0 | 0 | 0 | PASS |

Temporary verification records were created through each repository API and removed. Inventory stock adjustment also passed. All collections returned to their baseline counts.

## Sprint 1 Production Validation

Release: `e75a3c5cf0873a0d212263010e75b0c4b3470aeb`

| Module | Firestore | Production API | Production Screen | Result |
| --- | ---: | ---: | ---: | --- |
| Owner Menu | 8 | 8 | 8 | PASS |
| Owner Offers | 2 | 2 | 2 | PASS |
| Owner Inventory | 0 | 0 | 0 | PASS |
| Owner Accounting | 0 | 0 | 0 | PASS |
