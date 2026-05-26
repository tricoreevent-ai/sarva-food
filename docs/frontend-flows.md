# Frontend Flows

## Customer Order Flow

Route path:

- `/restaurants`
- `/restaurant/[slug]`
- `/restaurant/[slug]/menu`
- `/checkout`
- `/order-success?orderId=ORD-1234`
- `/order/[id]`

Flow:

1. Customer searches restaurants through `RestaurantBrowserFlow`.
2. Customer opens a restaurant and browses category-filtered menu items.
3. `FoodItemCard` adds items to the persisted cart and exposes quantity controls.
4. `CheckoutSummary` applies offer codes from manual input or deep links.
5. `CheckoutForm` validates delivery/payment details with React Hook Form and Zod.
6. `createOrder` calls the fake order API and writes a mock order into Zustand.
7. Success page shows the receipt and links to tracking.
8. Tracking reads the order status and renders a generated timeline.

Future Firebase point: replace `mockApi.orders.create` with a Firestore write to `orders/{orderId}` and subscribe to status updates in `OrderTrackingFlow`.

Backend-ready services now live in `src/services`; mock flows remain active until `NEXT_PUBLIC_USE_FIREBASE=true` is wired into the relevant route.

## Instagram Click-To-Order

Route path:

- `/instagram/[restaurantSlug]/[itemId]?offer=INSTA20`
- `/restaurant/[slug]/item/[itemId]?source=instagram&offer=INSTA20`

Flow:

1. Instagram route simulates a campaign link resolver.
2. Fake API resolves restaurant, item, source, and offer code.
3. Offer code is saved into cart state.
4. User is routed to the item detail page.
5. Item page shows the product, applied offer, add-to-cart, and checkout CTA.

Future Firebase point: store click attribution and campaign metadata in `campaignClicks/{clickId}` before redirecting.

## WhatsApp Order Flow

Component:

- `WhatsAppOrderFlow`

Flow:

1. Reads current cart lines and offer from Zustand.
2. Generates a prefilled WhatsApp message.
3. Opens `wa.me` in a new tab.
4. Simulates sent and confirmed states.

Future Firebase point: create a draft order before opening WhatsApp, then sync restaurant replies or staff confirmations back to `orders/{orderId}`.

## Owner Order Management

Route path:

- `/owner/orders`

Flow:

1. Owner sees seeded and newly created orders.
2. Orders move through `new`, `accepted`, `preparing`, `ready`, `picked-up`, and `delivered`.
3. Kitchen ticket tab shows active accepted/preparing/ready orders.
4. Completed tab shows delivered and rejected orders.

Future Firebase point: update `orders/{orderId}.status` and publish kitchen ticket events from Cloud Functions.

## Menu Management

Route path:

- `/owner/menu`

Flow:

1. Owner creates a menu item.
2. Owner edits an existing item.
3. Owner marks items sold out or restocked.
4. Menu, category, cuisine, combo, offer, CMS, profile, and social images are uploaded through the reusable Cloudinary upload widget.
5. The upload widget supports local file preview, center-crop optimization, remote web-address upload, progress state, remove/retry behavior, and stores only Cloudinary URLs in form state.

Future Firebase point: write menu item documents under `restaurants/{restaurantId}/menuItems/{itemId}`. Image binaries should remain in Cloudinary, not Firebase Storage.

## Instagram Post Creator

Route path:

- `/studio/create-post`
- `/owner/social-posts`

Flow:

1. User uploads or selects a food image through Cloudinary.
2. User selects a template.
3. User edits headline, caption, and offer code.
4. Preview auto-fits the image and overlays text.
5. Generate and export actions call fake studio APIs.

Future Firebase point: save drafts in `socialPosts/{postId}` and call a publisher function for scheduled posts. Image binaries should remain in Cloudinary.

## Delivery Flow

Route path:

- `/delivery`
- `/delivery/orders`

Flow:

1. Delivery partner sees assigned deliveries.
2. OTP is verified against the mock delivery assignment.
3. Partner marks picked up.
4. Partner marks delivered.
5. Order status updates alongside delivery status.

Future Firebase point: rider auth, geolocation, and delivery status can update `deliveries/{id}` and related `orders/{id}` documents.

## POS Flow

Route path:

- `/owner/pos`

Flow:

1. Step 1 `Select items`: waiter or cashier browses category-filtered menu and inventory products with a sticky live order panel.
2. Step 2 `Customer & order details`: order type, table, customer phone lookup, delivery address, waiter assignment, and kitchen note are captured.
3. Step 3 `Review order`: items remain editable while GST, parcel charge, discounts, coupons, and payment method are configured.
4. Step 4 `Processing`: UI shows live order save, KOT creation, and sync progress states.
5. Step 5 `Success`: order ID, KOT reference, print bill, new order, and active order actions are shown.
6. Hold, save, resume, active-order edit, and past-order export remain available through the POS sidebar.

Future Firebase point: create `bills/{billId}`, `payments/{paymentId}`, table occupancy updates, and dedicated wizard-state persistence for handheld waiter devices.

## Catering Flow

Route path:

- `/catering`

Flow:

1. Customer enters event inquiry details.
2. Customer chooses a package.
3. Fake API calculates quotation.
4. Preview shows subtotal, service fee, and total.

Future Firebase point: write `cateringRequests/{requestId}` and notify restaurant sales staff.
