# Social Commerce

## Goal

Make Instagram and WhatsApp sales feel direct, fast, and browser-first. A customer should tap a food post, see the exact item, keep the offer applied, and order without installing the app.

## Implemented Instagram Flow

Routes:

- `/instagram/[restaurantSlug]/[itemId]?offer=INSTA20`
- `/restaurant/[slug]/item/[itemId]?source=instagram&offer=INSTA20`
- `/checkout?mode=fast&offer=INSTA20`

Behavior:

- Deep-link route resolves the restaurant, item, and offer.
- Offer code is parsed through `parseOfferCode`.
- Customer is redirected to the product page.
- Product page displays offer state and product-level metadata.
- Sticky mobile CTA adds the item and jumps into fast checkout.
- Checkout applies URL offer codes.

## Helpers

File: `src/lib/social-commerce.ts`

- `parseOfferCode`: validates and normalizes offer codes.
- `buildInstagramDeepLink`: creates campaign-safe app links.
- `parseDeepLinkParams`: normalizes route params.
- `buildFoodItemMetadata`: returns product OpenGraph and Twitter metadata.

## Metadata

Product pages:

- Include product title and restaurant.
- Include food image in OpenGraph and Twitter metadata.
- Add canonical URL.

Instagram pages:

- Include offer code in title and description.
- Reuse product image metadata.

## Conversion UX

Implemented:

- Product-level "Order now" button.
- Sticky mobile "Order now" CTA.
- Fast checkout mode.
- Offer auto-apply from URL.
- Browser-first flow with no install requirement.

Recommended next:

- Add one-click reorder from previous order history after auth is enabled.
- Add campaign click IDs to track attribution.
- Add lightweight availability precheck before checkout.
- Add abandoned checkout analytics after consent and privacy review.

## WhatsApp Ordering

Current:

- `WhatsAppOrderFlow` creates a prefilled order message from cart state.
- Backend hooks are prepared in `whatsapp-service.ts`.

Future:

- Create a draft order before opening WhatsApp.
- Send status and OTP messages through a provider queue.
- Store provider message IDs in a compact notification collection.

## Analytics Events

Prepared no-op service:

- `trackAnalyticsEvent` in `src/services/analytics-service.ts`.

Suggested events:

- `instagram_link_opened`
- `offer_applied`
- `checkout_started`
- `order_created`
- `whatsapp_cta_clicked`

Keep analytics writes batched or queued to avoid writing on every tap in production.
