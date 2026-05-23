# Realtime Flow

## Customer Order Tracking

Hook:

- `useRealtimeOrder(orderId)`

Service:

- `listenToOrder(orderId, callback)`

Firestore query:

- Single document listener on `orders/{orderId}`.

Why:

- One document listener is cheap and avoids polling.
- Customers only need their own order status.

## Owner Live Orders

Hook:

- `useRestaurantOrders(restaurantId, statuses)`

Service:

- `listenToRestaurantOrders`

Firestore query:

- `orders`
- `where restaurantId == selectedRestaurant`
- `where status in [new, accepted, preparing, ready]`
- `orderBy createdAt desc`
- `limit 25`

Why:

- Bounded listener avoids a noisy full restaurant history stream.
- Old orders should be loaded through paginated history, not realtime.

## Delivery Updates

Service:

- `listenToPartnerDeliveries(partnerId)`

Firestore query:

- `deliveries`
- `where partnerId == uid`
- `where status in [assigned, picked-up]`
- `orderBy updatedAt desc`
- `limit 20`

## Avoiding Duplicated Listeners

Guidelines:

- One listener per page-level flow.
- Do not subscribe inside repeated cards.
- Pass subscribed data down as props.
- Use paginated reads for historical lists.

## Optimistic UI

Recommended pattern:

1. Update local UI immediately.
2. Call service write.
3. Reconcile with listener snapshot.
4. Roll back only if Firebase write fails.

The current mock store already behaves similarly, so the migration should feel natural.
