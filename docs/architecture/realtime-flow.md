# Realtime Flow

Last updated: 2026-07-22

## RC5 Live Operational Source

Canonical live restaurant operations derive from two Firestore collections:

- `orders`: canonical billing, payment, customer history, service status, sequential order number, and analytics source.
- `kitchenOrders`: canonical Kitchen ticket source for Accepted, Preparing, Ready, KOT print, station, ETA, and waiter signal state.

Linked documents are joined by `orders.kitchenOrderId === kitchenOrders.id`. UI surfaces must render one operational row per linked ticket, not one row from each collection.

## Dependency Graph

1. New Order / POS / QR writes through repository APIs.
2. `OrderRepository` writes `orders` and `customerOrders`; POS placement also syncs order number and billing identifiers to linked `kitchenOrders`.
3. `KitchenRepository` writes `kitchenOrders` and syncs legal Kitchen state back to linked `orders`/`customerOrders`.
4. `/api/owner/pos` bootstraps POS/owner operational data from `orders`, `kitchenOrders`, menu, customers, tables, and staff.
5. `/api/owner/pos/stream` listens to Firestore `orders` and `kitchenOrders`, emits incremental `ordersUpsert`, `orderIdsRemoved`, `kitchenUpsert`, and `kitchenIdsRemoved` payloads.
6. `applyRealtimePatch` updates only changed rows on POS/Waiter, Owner Dashboard, Owner Orders, Cashier, and Manager views.
7. `mergeLiveOperationalOrders` resolves linked `orders` + `kitchenOrders` into one live operational row with Kitchen status winning until service/payment completion.
8. `/api/owner/kitchen/stream` feeds Kitchen Operations from the same `kitchenOrders` collection.
9. `/api/owner/kitchen/notify-waiter/stream` feeds Kitchen-ready notification state from `notifications` without polling.
10. `/api/owner/reports/stream` feeds Owner Reports from `orders` deltas so reports do not stay on one-shot snapshots.
11. History, billing, reports, and analytics derive from repository `orders`/`customerOrders` records after completion.

## Screen Feeds

| Screen | Bootstrap | Realtime | Render Source |
| --- | --- | --- | --- |
| POS / Waiter Active Orders | `/api/owner/pos` | `/api/owner/pos/stream` | Merged `orders` + `kitchenOrders` |
| Owner Dashboard Live Orders | `/api/owner/analytics` | `/api/owner/pos/stream` | Merged `orders` + `kitchenOrders` |
| Owner Orders / Cashier / Manager | `/api/owner/orders` + `/api/owner/kitchen` | `/api/owner/pos/stream` | Date-scoped merged `orders` + `kitchenOrders` |
| Kitchen Operations | `/api/owner/kitchen`, `/api/owner/operational-settings`, `/api/owner/printers?surface=kitchen` | `/api/owner/kitchen/stream`, `/api/owner/kitchen/notify-waiter/stream` | `kitchenOrders`, Kitchen-scoped `notifications`, Kitchen print settings |
| Order History / Reports | `/api/owner/orders`, `/api/owner/analytics`, `/api/owner/reports` | `/api/owner/reports/stream` for Reports; history remains read/filter scoped | `orders` / `customerOrders` |
| Customer Tracking | `orders/{orderId}` read/listener path | Customer order listener | `orders` scoped to customer/order |

## Transition Ownership

- Kitchen owns `new -> accepted -> preparing -> ready` on `kitchenOrders`.
- Waiter/POS/Owner service actions own `ready -> picked-up -> served -> completed` through `/api/owner/orders`.
- Cashier/Owner payment actions update `orders` payment state and sync payment status to linked `kitchenOrders`.
- Completion requires the order service state and payment state to satisfy the state machine; Kitchen does not complete service.

## Kitchen RBAC Boundary

- Kitchen bootstrap must not call `/api/owner/tables`, customer, marketing, inventory, reports, accounting, analytics, or owner-settings APIs.
- Kitchen print bootstrap uses `/api/owner/printers?surface=kitchen`, which returns only Kitchen printer profiles, KOT templates, and KOT print logs.
- Kitchen accept/preparing/ready actions require `kitchen:update`; KOT print logging requires Kitchen/print access; Ready Signal requires Kitchen update or Waiter acknowledgement access.
- Owner Tables remains an Owner/Manager/Cashier/Waiter surface and is not part of Kitchen Accept refresh.

## Performance Rules

- Use one page-level realtime stream per operational page.
- Do not subscribe inside cards, drawers, rows, menus, or modals.
- Do not poll live operational data.
- Apply incremental patches by id and preserve object identity for unchanged rows.
- Keep historical screens paginated/read-on-filter instead of streaming full history.
