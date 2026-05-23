# Firebase Cost Audit

## Cost Surfaces

Primary Firebase cost drivers for this platform:

- Firestore reads from owner dashboards, customer menus, delivery queues, and admin analytics.
- Firestore writes from orders, status changes, menu updates, campaigns, and delivery events.
- Realtime listener fanout on live orders and delivery updates.
- Storage uploads for food images and social post assets.
- Cloud Function invocations for order lifecycle, WhatsApp hooks, payments, and OTP verification.

## Existing Strengths

- Services isolate Firebase calls from components.
- Orders are queried by `restaurantId`, `status`, and `createdAt`.
- Customer history is paginated.
- Order tracking listens to one order document.
- Restaurant order queue listens to a bounded status set and a limited result size.
- Security rules and indexes are already documented and versioned.

## Risks Found

- Realtime listeners can become duplicated if several widgets subscribe to the same query.
- Menus are read frequently and change less often than orders, so pure network reads are wasteful.
- Delivery history should be paginated instead of loading an unbounded list.
- Image uploads need compression before Storage write.
- Admin analytics must avoid reading transactional collections directly for every dashboard view.
- Oversized order documents can become expensive if status timelines, payment attempts, and notifications are embedded indefinitely.

## Implemented Cost Controls

- Added shared listener registry in `src/services/firestore-query.ts`.
- Updated order and delivery listeners to share query subscriptions by stable keys.
- Added `getPage` pagination helper.
- Updated delivery history to use paginated reads.
- Added in-memory cache with optional browser persistence in `src/lib/cache.ts`.
- Updated menu reads to use cached query results with local persistence.
- Replaced order transaction with a batched write for the current single-document create flow.
- Added image compression before menu and social post Storage uploads.
- Added menu availability and restaurant listing indexes to `firestore.indexes.json`.

## Recommended Read Budgets

Customer app:

- Restaurant listing: 1 paged query per city/filter.
- Restaurant menu: 1 cached query per restaurant, refresh on TTL or manual reload.
- Cart/checkout: no Firestore reads after menu is loaded.
- Order tracking: 1 document listener.

Owner dashboard:

- Live order queue: 1 shared listener for active statuses.
- Kitchen ticket: derive from the live order queue locally.
- Reports: read precomputed daily aggregates, not raw orders.
- Inventory alerts: paged query by restaurant and status.

Admin:

- Analytics: read aggregate collections only.
- Restaurant list: paged query by active/location/name.
- Users: paged query with role filters.

Delivery:

- Assigned orders: 1 shared listener by partner and active statuses.
- History: paged query, no realtime listener.

## Collection Shape Risks

Avoid:

- Embedding full status history forever inside `orders`.
- Storing base64 images in Firestore.
- Listening to all orders for a restaurant without status limits.
- Running client-side joins across restaurants, menus, offers, and orders.

Prefer:

- Compact order documents with line snapshots.
- Subcollections or event collections for verbose histories.
- Precomputed counters for dashboards.
- Cloud Functions for trusted fanout and payment/WhatsApp side effects.
