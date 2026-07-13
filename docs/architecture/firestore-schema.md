# Firestore Schema

## Design Goals

- Flat top-level collections for simple security rules and indexed queries.
- Every restaurant-scoped document includes `restaurantId`.
- Avoid nested N+1 reads for dashboards.
- Keep high-write collections like `orders` and `deliveries` top-level.

## Collections

### `users`

User profile and role source of truth.

Fields:

- `displayName`
- `email`
- `phone`
- `photoURL`
- `role`: `customer | owner | admin | delivery | cashier`
- `restaurantIds`
- `active`
- `createdAt`
- `updatedAt`

### `restaurants`

Restaurant profile and ownership.

Fields:

- `name`
- `slug`
- `ownerIds`
- `location`
- `cuisine`
- `active`
- `imagePath`
- `subscriptionId`

### `menus`

Menu item documents.

Fields:

- `restaurantId`
- `categoryId`
- `name`
- `description`
- `price`
- `imagePath`
- `isVeg`
- `available`
- `sortOrder`

### `menuCategories`

Reusable menu sections.

Fields:

- `restaurantId`
- `name`
- `sortOrder`
- `active`

### `orders`

Customer, Instagram, WhatsApp, POS, and catering order records.

Fields:

- `restaurantId`
- `customerId`
- `customerName`
- `customerPhone`
- `deliveryAddress`
- `channel`
- `status`
- `lines`
- `offerCode`
- `subtotal`
- `discount`
- `tax`
- `deliveryFee`
- `total`
- `paymentStatus`
- `deliveryOtp`

### `offers`

Restaurant offers and promo codes.

Fields:

- `restaurantId`
- `code`
- `title`
- `discountType`
- `discountValue`
- `minimumOrder`
- `active`
- `startsAt`
- `endsAt`

### `inventory`

Owner inventory alerts.

Fields:

- `restaurantId`
- `itemName`
- `unit`
- `quantity`
- `reorderAt`
- `status`

### `deliveries`

Delivery assignments.

Fields:

- `orderId`
- `restaurantId`
- `partnerId`
- `pickupAddress`
- `dropAddress`
- `status`
- `otpHash`

### `campaigns`

Marketing campaigns.

Fields:

- `restaurantId`
- `title`
- `channel`
- `offerCode`
- `status`
- `scheduledFor`

### `socialTemplates`

Public or restaurant-specific post templates.

Fields:

- `restaurantId`
- `name`
- `format`
- `settings`
- `public`

### `socialPosts`

Generated post metadata.

Fields:

- `restaurantId`
- `campaignId`
- `templateId`
- `imagePath`
- `headline`
- `caption`
- `offerCode`
- `exportMetadata`

### `cateringRequests`

Catering inquiries and quotation state.

Fields:

- `restaurantId`
- `customerId`
- `name`
- `phone`
- `guestCount`
- `packageId`
- `eventDate`
- `notes`
- `status`
- `quotedTotal`

### `subscriptions`

Restaurant billing plan state.

Fields:

- `restaurantId`
- `plan`
- `status`
- `currentPeriodEnd`

## Indexes

Composite indexes live in `firestore.indexes.json`.

Primary query patterns:

- Restaurant live orders by `restaurantId`, `status`, `createdAt`.
- Customer order history by `customerId`, `createdAt`.
- Menu listing by `restaurantId`, `sortOrder`.
- Delivery queue by `partnerId`, `status`, `updatedAt`.
- Campaigns by `restaurantId`, `status`, `scheduledFor`.
- Catering requests by `restaurantId`, `status`, `eventDate`.
