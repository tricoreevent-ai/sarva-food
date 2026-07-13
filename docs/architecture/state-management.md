# State Management

## Stores

The MVP uses two small Zustand stores.

## `useCartStore`

File:

- `lib/cart-store.ts`

Owns:

- Cart lines
- Quantity updates
- Offer code
- Cart totals
- Cart persistence

Used by:

- `FoodItemCard`
- `CartDrawer`
- `CheckoutSummary`
- `CheckoutForm`
- `WhatsAppOrderFlow`
- Instagram deep-link components

## `useAppStore`

File:

- `lib/app-store.ts`

Owns:

- Mock auth user
- Restaurants
- Menu items
- Offers
- Orders
- Delivery assignments
- Social templates
- Catering packages
- POS tables
- POS bill
- Latest catering quote
- API loading/message state

Actions:

- `createOrder`
- `updateOrderStatus`
- `createMenuItem`
- `updateMenuItem`
- `toggleSoldOut`
- `updateDeliveryStatus`
- `verifyDeliveryOtp`
- `addPosItem`
- `updatePosQuantity`
- `setPosTable`
- `setPosPayment`
- `payPosBill`
- `createCateringQuote`

## Persistence

Both stores persist to local storage:

- `sarva-cart`
- `sarva-demo-state`

This gives the demo a startup MVP feel across refreshes. During real backend integration, persistence should move to Firebase Auth plus Firestore snapshots.

## Future Backend Mapping

Recommended Firebase collections:

- `restaurants`
- `restaurants/{restaurantId}/menuItems`
- `orders`
- `deliveries`
- `offers`
- `campaigns`
- `socialPosts`
- `posBills`
- `cateringRequests`

The current state shape intentionally mirrors these future collection boundaries.
