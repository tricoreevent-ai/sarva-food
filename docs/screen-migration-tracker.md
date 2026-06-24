# Screen Migration Tracker

Last updated: 2026-06-24

| Screen | Current Source | Target Source | Status |
| --- | --- | --- | --- |
| Owner Dashboard | `/api/owner/analytics` | Repository-backed dashboard API for all business metrics | Completed |
| Owner Orders | `/api/owner/orders` | `OrderRepository` through owner orders API | Completed |
| Owner Reports | `/api/owner/analytics` | `/api/owner/analytics` | Completed |
| Owner Customers | `/api/owner/customers` | `/api/owner/customers` | Completed |
| Owner Loyalty | `/api/owner/analytics` | `/api/owner/analytics` plus `LoyaltyRepository` | Completed |
| Owner Menu | `useAppStore.menuItems` hydrated by direct Firestore listener/API fallback | `MenuRepository` through owner menu API | Partial |
| Owner Offers | `useAppStore.offers` plus `/api/owner/offers` mutations | `OfferRepository` through owner offers API | Partial |
| Owner Tables | `/api/owner/tables` and `/api/owner/kitchen` | `TableRepository` through owner tables API | Completed |
| Owner Kitchen | `/api/owner/kitchen` | `KitchenRepository`/`OrderRepository` API | Completed |
| Owner POS | `/api/owner/pos`; bill draft remains UI state | `OrderRepository`, `MenuRepository`, `TableRepository`, `CustomerRepository` APIs | Completed |
| Owner Employees | `/api/owner/staff` | `StaffRepository` API | Completed |
| Owner Inventory | `useAppStore.inventoryItems` from direct Firestore listener | Inventory repository API | Pending |
| Owner Accounting | `useAppStore.expenses`, `useAppStore.transactions` | Accounting repository API | Pending |
| Admin Dashboard | `useAppStore.restaurants`, `staffMembers`, `orders` | Admin repository/API layer | Pending |
| Admin Analytics | `useAppStore.orders`, `restaurants`, `staffMembers` | Admin analytics repository/API | Pending |
| Admin Restaurants | `useAppStore.restaurants`, `businessApplications`, `branches`, `staffMembers`, `orders` | Admin restaurant repository/API | Pending |
| Customer Cart | `useCartStore` | Cart UI state allowed; persisted cart API for cross-device | Partial |
| Customer Checkout | `useCartStore` plus `/api/orders` | `/api/orders` with `OrderRepository`; cart remains UI state | Partial |
| Customer Order History | `order-service.getOrderHistory` direct Firestore query | Customer order API using `OrderRepository` | Pending |
