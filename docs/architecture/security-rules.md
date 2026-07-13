# Security Rules

## Files

- `firestore.rules`
- `storage.rules`

## Role Model

Roles are stored on `users/{uid}`:

- `customer`
- `owner`
- `admin`
- `delivery`
- `cashier`

Restaurant access is controlled by `users/{uid}.restaurantIds`.

## Firestore Rules Summary

Customers can:

- Create their own orders.
- Read their own orders.
- Create catering requests.
- Update limited own order cancellation states.

Owners and cashiers can:

- Read and manage restaurant-scoped documents for their assigned restaurants.
- Manage menus, categories, offers, inventory, campaigns, social posts, orders, and deliveries.

Delivery partners can:

- Read deliveries assigned to them.
- Update assigned delivery status.

Admins can:

- Read and write platform-level collections.
- Manage subscriptions.
- Assign and repair operational data.

## Restaurant Isolation

Every restaurant-scoped document includes `restaurantId`.

Rules use:

- `isOwnerFor(restaurantId)`
- `restaurantScopedRead()`
- `restaurantScopedCreate()`
- `restaurantScopedUpdate()`

This avoids duplicated rule logic and keeps collection design scalable.

## Storage Rules Summary

Allowed upload paths:

- `restaurants/{restaurantId}/menu/{fileName}`
- `restaurants/{restaurantId}/social/{fileName}`
- `users/{userId}/{fileName}`

Images are limited to 8 MB and must have an image content type.

## Notes

Security rules protect client access. Admin SDK and Cloud Functions bypass rules, so server functions must validate roles explicitly. The functions placeholders include role checks for delivery assignment and OTP verification.
