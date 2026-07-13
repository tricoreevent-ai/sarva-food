# Firestore Collection Trace

All current operational data uses top-level collections. There are no active
`restaurants/{restaurantId}/...` subcollection paths for the listed modules.

| Screen/module | Collection path | Query/filter | Code location |
| --- | --- | --- | --- |
| Owner orders | `orders` | `tenantId == resolveTenantId(restaurantId)`, `status in [...]`, `createdAt desc` | `src/services/order-service.ts` |
| Website order write | `orders`, `customerOrders` | Write uses restaurant `tenantId`, `restaurantId`, optional `branchId` | `src/app/api/orders/route.ts` |
| Owner reports | None directly | Reads `useAppStore().orders`, `tableOrders`, transactions, and loyalty data | `src/app/owner/reports/page.tsx` |
| Owner dashboard | None directly | Reads `useAppStore().orders`, `tableOrders`, and loyalty data | `src/app/owner/page.tsx` |
| Owner customers | Missing route/page | `/owner/customers` and `/api/owner/customers` do not exist | `src/components/layout/dashboard-topbar.tsx` |
| POS customer lookup | `customers` | `tenantId == resolveTenantId(restaurantId)`, `normalizedPhone == phone` | `src/services/restaurant-ops-service.ts` |
| POS customer upsert | `customers` | Document ID `cust-{restaurantId}-{normalizedPhone}` | `src/services/restaurant-ops-service.ts` |
| Owner loyalty hydrator | `loyaltyCustomers` | `tenantId == DEFAULT_TENANT_ID`, `loyaltyPoints desc` | `src/services/production-data-service.ts` |
| Owner loyalty page | None directly | Reads Zustand `loyaltyCustomers` and locally derives rows from Zustand orders | `src/app/owner/loyalty/page.tsx` |
| Customer account | `customerProfiles`, `customerAddresses`, `customerOrders`, `customerLoyalty`, payment/saved/coupon collections | `customerId == authenticated uid` | `src/hooks/use-customer-data.ts` |
| Public offers | `offers` | Admin/REST queries `active == true` plus `tenantId` or `restaurantId` | `src/lib/server/public-firestore.ts` |
| Owner offers | `offers` | Admin query by `restaurantId`, `tenantId`, and `restaurantSlug` aliases | `src/app/api/owner/offers/route.ts` |
| Owner menu | `menus`, `menuItems` | Admin query by `tenantId` and `restaurantId` aliases | `src/app/api/owner/menu/route.ts` |
| Public menu | `menus`, then `menuItems` fallback | Tenant/restaurant aliases; customer visibility filtering | `src/lib/server/public-firestore.ts` |
| Tables | `tables`, `restaurantTables` | Tenant-scoped in rules; table UI uses operational store | `src/firebase/collections.ts`, `firestore.rules` |
| Employees/staff | `users`, `tenantUsers`, `branchUsers`, `staffActivityLogs` | Tenant/branch documents and local operational store | `src/firebase/collections.ts`, `src/services/production-data-service.ts` |
| Kitchen | `kitchenOrders` | `tenantId == ...`, `branchId == ...`, `status in [...]`, `createdAt desc` | `src/services/restaurant-ops-service.ts` |

## Public Runtime Verification

On 2026-06-23:

| Endpoint | Localhost | Production |
| --- | ---: | ---: |
| `/api/public/restaurants?slug=cafe-al-arab-thanisandra` | 1 restaurant | 1 restaurant |
| `/api/public/menu?restaurantId=cafe-al-arab-thanisandra` | 8 items | 8 items |
| Restaurant tenant | `cafe-al-arab-thanisandra` | `cafe-al-arab-thanisandra` |
| Menu restaurant ID | `cafe-al-arab-thanisandra` | `cafe-al-arab-thanisandra` |

## Conclusion

**Tested public paths: identical.**

**All operational screens: not proven.** Reports and dashboard do not query a
canonical collection at all; they render from Zustand. The missing owner customer
route has no collection path. These are architecture mismatches even when the
underlying Firebase project is the same.
