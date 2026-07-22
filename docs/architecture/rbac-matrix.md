# RBAC Matrix

Last updated: 2026-07-22

## RC5 Kitchen Accept Boundary

| Screen | Component | API | Firestore | Permission |
| --- | --- | --- | --- | --- |
| Kitchen Operations | `KitchenDisplayFlow` bootstrap | `GET /api/owner/kitchen` | `kitchenOrders` | `kitchen:read` |
| Kitchen Operations | `KitchenDisplayFlow` bootstrap | `GET /api/owner/operational-settings` | `restaurantSettings.operationalSettings` | `settings:read` fallback `kitchen:read` fallback `orders:read` |
| Kitchen Operations | `usePrinterSettings("kitchen")` | `GET /api/owner/printers?surface=kitchen` | `printerSettings`, `printerProfiles`, `printTemplates`, `printLogs` filtered to Kitchen/KOT data | `kitchen:read` fallback `pos:read` |
| Kitchen Operations | Accept / Start / Ready | `PATCH /api/owner/kitchen` | `kitchenOrders`, linked `orders`/`customerOrders` status sync | `kitchen:update` |
| Kitchen Operations | Ticket stream | `GET /api/owner/kitchen/stream` | `kitchenOrders` listener | `kitchen:read` |
| Kitchen Operations | Ready-signal stream | `GET /api/owner/kitchen/notify-waiter/stream` | `notifications` filtered to `kitchen_ready_ops` | `kitchen:read` fallback Waiter POS read |
| Kitchen Operations | Ready Signal / Escalate | `POST /api/owner/kitchen/notify-waiter` | `notifications`, push dispatch | `kitchen:update`; acknowledge fallback Waiter POS read |
| Kitchen Operations | KOT print log | `POST /api/owner/printers` with `surface: "kitchen"` or KOT log | `printLogs` | `kitchen:create` fallback `pos:create` |

## Disallowed Kitchen Dependencies

| Dependency | Status | Reason |
| --- | --- | --- |
| `GET /api/owner/tables` | Removed from Kitchen bootstrap | Tables master requires `tables:read` and belongs to Owner/Manager/Cashier/Waiter floor operations. |
| Owner Settings print API surface | Removed from Kitchen print bootstrap | Kitchen uses `surface=kitchen` and receives only Kitchen/KOT print data. |
| Customers / Marketing / Reports / Inventory / Accounting / Analytics | Not used by Kitchen Accept path | Kitchen Accept must update Kitchen tickets without secondary owner-only requests. |
