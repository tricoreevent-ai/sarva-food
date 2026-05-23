# Backend Architecture

## Current State

The app keeps the completed mock frontend flows while adding Firebase backend architecture incrementally. This lets the product stay demoable while real backend services are wired route by route.

## Source Structure

```text
src/
  app/
  components/
  features/
  firebase/
  hooks/
  lib/
  services/
  types/
docs/
functions/
```

## Firebase Modules

### `src/firebase/client.ts`

Client SDK setup for:

- Auth
- Firestore
- Storage
- Local emulator wiring

### `src/firebase/admin.ts`

Admin SDK setup for:

- Server Components
- Route handlers
- Server Actions
- Vercel-compatible server access

### `src/firebase/collections.ts`

Typed collection helpers with Firestore converters.

## Services

Services are intentionally thin. They own Firebase calls, not UI state.

- `auth-service.ts`: Google, email, phone auth.
- `order-service.ts`: create orders, status updates, realtime tracking, history.
- `menu-service.ts`: CRUD menu items, availability, image upload.
- `delivery-service.ts`: assignment, status, history.
- `social-post-service.ts`: image upload, template/post metadata.
- `catering-service.ts`: catering request and quote updates.
- `payment-service.ts`: Razorpay, Stripe, and UPI abstraction placeholder.
- `whatsapp-service.ts`: message draft builders for order/status/OTP hooks.

## Cloud Functions

Functions live in `functions/src/index.ts`.

Prepared functions:

- `onOrderCreated`
- `onOrderStatusUpdated`
- `assignDelivery`
- `verifyDeliveryOtp`
- `createPaymentIntentDraft`

External WhatsApp and payment APIs are not fully implemented yet. Hooks write queue-style placeholder events so production integrations can be added without changing the frontend contract.

## Cost Controls

- Top-level collections keep query paths predictable.
- Dashboards query by indexed `restaurantId` and `status`.
- Live listeners are scoped to one order or one restaurant queue.
- History queries are paginated.
- Storage writes are direct-to-bucket from the client with rules validation.
- Server work is event-driven only where it prevents client trust issues.

## Migration Path

Recommended order:

1. Enable Firebase Auth and create user profiles.
2. Seed restaurants, menus, offers, and social templates.
3. Replace mock order creation with `order-service.ts`.
4. Replace owner order queue with `useRestaurantOrders`.
5. Replace delivery assignment flow with `delivery-service.ts`.
6. Move payment intent creation into Cloud Functions.
7. Add WhatsApp provider worker.
