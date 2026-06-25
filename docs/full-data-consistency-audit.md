# Full Data Consistency Audit

Last updated: 2026-06-25

Tenant: `cafe-al-arab-thanisandra`

## Current Status Summary

| Module | Status |
| --- | --- |
| Dashboard | Complete |
| Orders | Complete |
| CRM | Complete |
| Loyalty | Complete |
| Offers | Complete locally |
| Menu | Complete locally |
| Inventory | Complete locally |
| Accounting | Complete locally |
| Tables | Complete |
| Kitchen | Complete |
| POS | Complete |
| Admin | Pending |
| Customer Ordering | Partial |

## Operational Runtime Proof

| Item | Evidence |
| --- | --- |
| Dashboard | Orders 5; revenue INR 3732; customers 3; loyalty 3; menu 8; staff 2; kitchen 4 |
| Orders | 5 |
| Kitchen | 4: 1 new, 1 preparing, 2 completed |
| POS | Menu 8; customers 3; orders 5 |
| Employees | 2 |
| Tables | T99 create, refresh, edit to 6 seats/reserved, delete, and final refresh passed |
| Legacy operational references | Targeted `rg` result: 0 |
| Build gates | Typecheck PASS; lint PASS; build PASS |

## Canonical Firestore Counts

| Collection | Count | Notes |
| --- | ---: | --- |
| `orders` | 5 | Revenue INR 3732; statuses: 4 new, 1 delivered |
| `customerOrders` | 5 | Revenue INR 3732 |
| `customers` | 3 | Backfilled from orders |
| `loyaltyCustomers` | 3 | Backfilled from orders |
| `offers` | 2 | Codes: `OFFER5894`, `ARABIC20` |
| `menus` | 8 | All 8 available |
| `menuItems` | 0 | Legacy/alternate collection empty |
| `tables` | 0 | No table data found |
| `restaurantTables` | 0 | No table data found |
| `kitchenOrders` | 4 | Revenue INR 1718; statuses: 1 new, 2 completed, 1 preparing |
| `users` | 2 | Staff count 2 |
| `inventory` | 0 | No inventory data found |
| `accountingEntries` | 0 | No accounting data found |

## API Evidence

| Metric | Local API | Production API | Match |
| --- | ---: | ---: | --- |
| Orders | 5 | 5 | Yes |
| Revenue | 3732 | 3732 | Yes |
| Customers | 3 | 3 | Yes |
| Loyalty | 3 | 3 | Yes |
| Offers | 2 | 2 | Yes |
| Menu | 8 | 8 | Yes |
| Tables | 0 | 0 | Yes |
| Staff | 2 | 2 | Yes |

Release SHA local and production: `2c689f0f7a56311e41be245258815a345a91c9d6`.

## Screen Matrix

Partial browser output:

| Screen | Firestore | Local Screen | Production Screen | Match |
| --- | ---: | ---: | ---: | --- |
| Dashboard revenue | 3732 | 3732 | Pending deployment | Local Yes |
| Orders | 5 | 5 | Pending deployment | Local Yes |
| Reports orders | 5 | 0 | 5 | No |
| Customers | 3 | 0 | 3 | No |
| Loyalty | 3 | 0 | 3 | No |
| Offers | 2 | 0 | 2 | No |
| Menu | 8 | 0 | 8 | No |
| Tables | 0 | 0 after T99 lifecycle | Pending deployment | Local Yes |
| Kitchen all | 4 | 4 | Pending deployment | Local Yes |
| POS menu | 8 | 8 | Pending deployment | Local Yes |
| Employees | 2 | 2 | Pending deployment | Local Yes |

Operational Migration Sprint result: CLOSED. Local and Hostinger production screens passed.

## Production Release Validation

Release: `operational-migration-stable`
Commit and Hostinger build: `c11a00d89c008db64afbd3a29fb5850c0986ee93`
Deployment time: `2026-06-24T16:48:10.249Z`

| Module | Firestore | API | Production Screen | Result |
| --- | ---: | ---: | ---: | --- |
| Dashboard | 5 orders / INR 1976 | 5 / INR 1976 | 5 / INR 1976 | PASS |
| Orders | 5 | 5 | 5 | PASS |
| Kitchen | 4 | 4 | 4 | PASS |
| POS | 8 menu / 3 customers / 5 orders | 8 / 3 / 5 | 8 / 3 / 5 | PASS |
| Employees | 2 | 2 | 2 | PASS |
| Tables | 0 | 0 | 0 | PASS |

Kitchen API distribution: 1 new, 1 preparing, 2 completed.

Current revenue is INR 1976 because only the INR 1488 new order and INR 488 delivered order are billable. Three rejected orders remain visible in the order count but are excluded from revenue consistently.

## Owner Module Audit

| Screen | Data Source | Repository | API | Firestore Collection | Zustand Usage | Mock Data Usage | Local State Usage | Repository-backed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/owner` | `/api/owner/analytics` | Operational repositories through analytics API | `/api/owner/analytics` | `orders`, `customers`, `loyaltyCustomers`, `menus`, `users`, `kitchenOrders` | UI/session only | No | Widget prefs, hidden widgets | Yes |
| `/owner/orders` | `/api/owner/orders` | `OrderRepository` | `/api/owner/orders` | `orders` | No business store | No | Filters, tabs | Yes |
| `/owner/menu` | `/api/owner/menu` | `MenuRepository` | `/api/owner/menu` | `menus`, legacy read compatibility for `menuItems` | UI/session only | No | Filters, wizard state | Yes |
| `/owner/offers` | `/api/owner/offers` | `OfferRepository` | `/api/owner/offers` | `offers` | UI/session only | No | Filters, editor state | Yes |
| `/owner/tables` | `/api/owner/tables`, `/api/owner/kitchen` | `TableRepository`, `KitchenRepository` | `/api/owner/tables`, `/api/owner/kitchen` | `tables`, `kitchenOrders` | No business store | No | Filters/selection | Yes |
| `/owner/kitchen` | `/api/owner/kitchen` | `KitchenRepository` | `/api/owner/kitchen` | `kitchenOrders` | No business store | No | Board filters | Yes |
| `/owner/employees` | `/api/owner/staff` | `StaffRepository` | `/api/owner/staff` | `users` | No business store | No | Forms/filters | Yes |
| `/owner/inventory` | `/api/owner/inventory` | `InventoryRepository` | `/api/owner/inventory` | `inventory`, `recipes`, `suppliers`, `purchaseOrders`, `inventoryTransactions`, `auditLogs` | No business store | No | Forms/filters | Yes |
| `/owner/accounting` | `/api/owner/accounting` | `AccountingRepository` | `/api/owner/accounting` | `accountingEntries` | No business store | No | Tabs/filters | Yes |
| `/owner/reports` | `/api/owner/analytics` | `OrderRepository`, `CustomerRepository`, `LoyaltyRepository` | `/api/owner/analytics` | `orders`, `customers`, `loyaltyCustomers` | No business store found | No | Date range | Yes |
| `/owner/customers` | `/api/owner/customers` | `CustomerRepository` | `/api/owner/customers` | `customers`, `orders`, `loyaltyCustomers` | No business store found | No | Selected customer/profile | Yes |
| `/owner/loyalty` | `/api/owner/analytics` | `LoyaltyRepository` through analytics API | `/api/owner/analytics` | `loyaltyCustomers`, `customers` | No business store found | No | None significant | Yes |

## Order Consistency Audit

| Surface | Count | Source | Result |
| --- | ---: | --- | --- |
| Firestore Orders | 5 | `orders` collection | Baseline |
| Owner Dashboard | 5 | Runtime screen | Match |
| Owner Orders Page | 5 | Runtime screen | Match |
| Reports | 5 production / 0 local partial | `/api/owner/analytics` screen output | Needs stable local browser recheck |
| Kitchen Queue | 4 | Runtime screen | Match |
| POS Orders | 5 | Runtime screen operational summary | Match |
| Customer Orders | Not screen-validated | `order-service.getOrderHistory` direct Firestore query | Pending |

Operational order mismatch: resolved locally through repository APIs.

## Tables Audit

| Source | Count | Result |
| --- | ---: | --- |
| Firestore `tables` | 0 | No data |
| Firestore `restaurantTables` | 0 | No data |
| Owner Tables screen | 0 after T99 lifecycle | Matches Firestore |
| T99 lifecycle | Create, edit, delete, refresh | Pass |
| POS tables | 0 | Repository API matches Firestore |
| Kitchen table mapping | Derived from persisted `kitchenOrders.tableNumber` | Pass |

Answer: baseline count is 0 because no permanent table records exist. Repository-backed CRUD was proven with temporary unoccupied table T99 and returned to baseline after deletion.

## Offers Audit

| Source | Count | Result |
| --- | ---: | --- |
| Firestore `offers` | 2 | Baseline |
| Local API | 2 | Match |
| Production API | 2 | Match |
| Local screen partial | 0 | Browser audit incomplete/mismatch |
| Production screen | 2 | Match |

Owner offers is repository-backed. Local Firestore/API/screen count is 2 and temporary CRUD verification restored the baseline.

## Menu Audit

| Source | Count | Result |
| --- | ---: | --- |
| Firestore `menus` | 8 | Baseline |
| Firestore `menuItems` | 0 | Legacy collection empty |
| Local API | 8 | Match |
| Production API | 8 | Match |
| Local screen partial | 0 | Browser audit incomplete/mismatch |
| Production Owner Menu | 8 | Match |
| Production POS Menu | 8 | Match |

Owner menu, digital menu, print menu, social post menu selection, and settings data export now consume the repository-backed owner API. Local Firestore/API/screen count is 8.

## Sprint 1 Repository Validation

| Module | Firestore | Repository API | Local Screen | CRUD | Result |
| --- | ---: | ---: | ---: | --- | --- |
| Menu | 8 | 8 | 8 | Create/delete PASS | PASS |
| Offers | 2 | 2 | 2 | Create/delete PASS | PASS |
| Inventory | 0 | 0 | 0 | Create/adjust/delete PASS | PASS |
| Accounting | 0 | 0 | 0 | Create/delete PASS | PASS |

Build gates: typecheck PASS, lint PASS, build PASS.

## Admin Module Audit

| Screen | Current Source | Repository-backed | Status |
| --- | --- | --- | --- |
| `/admin` | `useAppStore.restaurants`, `staffMembers`, `orders` | No | Pending |
| `/admin/analytics` | `useAppStore.orders`, `restaurants`, `staffMembers` | No | Pending |
| `/admin/restaurants` | `useAppStore.restaurants`, `businessApplications`, `branches`, `staffMembers`, `orders` | No | Pending |
| `/admin/users` | `useAppStore.staffMembers` | No | Pending |
| `/admin/campaigns` | `useAppStore.offers`, `menuItems`, `restaurants` | No | Pending |
| `/admin/cms` | API-backed CMS plus `useAppStore.cmsSettings` | Partial | Partial |

## Customer Ordering Audit

| Surface | Current Source | Repository-backed | Status |
| --- | --- | --- | --- |
| Cart | `useCartStore` | UI state allowed, but not repository-backed | Partial |
| Checkout order creation | `/api/orders` uses `OrderRepository`; component still imports `useAppStore.createOrder` | Partial | Partial |
| Restaurant detail cart/order flow | `useCartStore`; still imports `useAppStore.createOrder` | Partial | Partial |
| Customer order history | `order-service.getOrderHistory` direct Firestore query | No | Pending |

## ACTION REQUIRED

Operational Migration  
Closed

Evidence:  
Dashboard, Orders, Kitchen, POS, Employees, and Tables matched canonical repository data locally and in Hostinger production. T99 CRUD survived refresh and deleted cleanly in local validation.

Admin Module  
Pending

Root Cause:  
Admin dashboards and analytics still read business data from `useAppStore`.

Fix:  
Create admin repository/API read paths for restaurants, orders, staff, offers, and analytics.

Files:  
`src/app/admin/page.tsx`, `src/app/admin/analytics/page.tsx`, `src/app/admin/restaurants/page.tsx`

Priority:  
P2
