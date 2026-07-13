# Firebase Cost Optimization

## Implemented Helpers

### Query Pagination

File: `src/services/firestore-query.ts`

`getPage` fetches `pageSize + 1` documents, returns a cursor, and exposes `hasMore`. This keeps list pages bounded and avoids accidental full-collection reads.

Used by:

- `getOrderHistory`
- `listDeliveryHistory`
- Repository helper `getPage`

### Shared Realtime Listeners

File: `src/services/firestore-query.ts`

`listenShared` and `listenToQueryShared` deduplicate listeners by stable keys. If multiple components ask for the same live order or same active order queue, only one Firestore listener is opened.

Used by:

- `listenToOrder`
- `listenToRestaurantOrders`
- `listenToPartnerDeliveries`

### Cache Layer

File: `src/lib/cache.ts`

The cache supports:

- In-memory TTL cache.
- Optional localStorage persistence for browser-safe data.
- Prefix invalidation after writes.

Menus use persistent cache because they are read often and change less frequently than order queues.

### Repository Pattern

File: `src/services/repository.ts`

The repository helper provides consistent typed primitives:

- `getById`
- `set`
- `update`
- `getPage`
- `batchSet`

Use it for new CRUD features instead of creating one-off Firestore access patterns.

## Optimized Service Behavior

### Orders

- `createOrder` uses a batched write for the current single-document order create.
- `listenToOrder` shares the single-document listener.
- `listenToRestaurantOrders` limits active order queues to `FIRESTORE_LIMITS.restaurantOrders`.
- `getOrderHistory` is paginated.

Future scale path:

- Add inventory reservation to the same batch or a Cloud Function.
- Move verbose status history to `orderEvents`.
- Use aggregate counters for reports.

### Menus

- `listMenuItems` uses a cached, limited, sorted query.
- `uploadMenuImage` compresses images before Storage upload.
- Availability updates write only the changed field plus `updatedAt`.

Future scale path:

- Cache menus by restaurant and updated version.
- Store generated thumbnails in Storage.
- Split menu categories and item detail only if documents become oversized.

### Delivery

- Active delivery assignments use one shared listener by partner.
- Delivery history is paginated.
- Status changes are compact document updates.

Future scale path:

- Store route/location pings in a separate TTL collection.
- Avoid writing location updates to the delivery document more often than needed.

## Indexing Strategy

Indexes are kept intentional in `firestore.indexes.json`:

- Orders by restaurant/status/createdAt.
- Orders by customer/createdAt.
- Restaurants by active/location/name.
- Menus by restaurant/sortOrder.
- Menus by restaurant/available/sortOrder.
- Menus by restaurant/category/sortOrder.
- Deliveries by partner/status/updatedAt.
- Offers by restaurant/active/startsAt.
- Campaigns by restaurant/status/scheduledFor.
- Catering requests by restaurant/status/eventDate.

Do not add indexes speculatively. Add an index only when a concrete query needs it.

## Local Cache Policy

Recommended TTLs:

- Menu and restaurant detail: 5 to 10 minutes.
- Static lists and social templates: 30 minutes.
- Order and delivery active state: realtime listener, no persisted cache.
- Admin aggregates: 1 to 5 minutes depending on freshness needs.

Invalidate:

- Menu cache after owner menu writes.
- Offer cache after offer writes.
- Restaurant cache after profile/image/status writes.

## Optimistic UI

Use optimistic updates where user intent is reversible or low-risk:

- Cart quantity changes.
- Menu sold-out toggles.
- Owner order status changes after permission check.
- Delivery picked-up/delivered transitions after OTP verification.

Avoid optimistic UI:

- Payment success.
- Admin role changes.
- Subscription state.
- WhatsApp confirmation delivery.

## Cost Checklist

Before adding a new Firebase call:

- Can the route load data once instead of opening a listener?
- Is the query paginated and indexed?
- Can the result be derived from existing state?
- Can several widgets share one listener?
- Is the document small enough for repeated reads?
- Should a Cloud Function own trusted fanout?
- Is the image compressed before Storage upload?
