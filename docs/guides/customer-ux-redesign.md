# Customer UX Redesign

## Goal

Move the customer-facing app from a functional commerce shell to a premium, mobile-first food ordering experience inspired by Zomato, Swiggy, and Uber Eats.

## Design Decisions

- Customer surfaces now use a dedicated `customer-theme` so food-commerce screens feel vibrant while owner/admin dashboards remain operational and restrained.
- The homepage is image-led with a full-bleed food gradient hero, featured restaurant card, trending dishes, nearby restaurants, offer carousel, cuisine categories, Instagram specials, and fast delivery messaging.
- Restaurant and food cards now prioritize imagery, rating, delivery time, offer cues, and clear add/order actions.
- Mobile navigation is customer-specific: Home, Search, Offers, Orders, Profile.
- Search is now treated as a destination with a rich hero, filter chips, large search input, and premium restaurant cards.

## Conversion Optimization

- Primary CTAs use food-commerce language: `Order now`, `Start order`, `Use offer`, and `Pay and place order`.
- Instagram routes still auto-apply offer codes and land directly on product pages.
- Product detail pages now show a large food image, rating, price, offer state, order CTA, checkout CTA, and WhatsApp dish CTA.
- Restaurant pages include a large cover image, social proof, offer cards, popular items, and sticky mobile start-order CTA.
- Checkout is visually simplified with UPI/Razorpay/COD choices and a sticky mobile payment button.

## Mobile UX Rationale

- Bottom nav uses five thumb-friendly tabs matching common consumer food app patterns.
- Menu pages use sticky search and category tabs so customers can browse without losing context.
- Cart access remains fixed near the bottom on mobile.
- Food cards use compact text plus strong image thumbnails to keep scanning fast.
- Horizontal scrolling sections are used for trending dishes, offers, and chips to keep mobile pages lively without deep nesting.

## Instagram Commerce Rationale

Instagram commerce is the platform USP:

1. Reel or post link opens `/instagram/[restaurantSlug]/[itemId]?offer=INSTA20`.
2. Link resolver applies the offer.
3. Customer lands on a premium product page with large food imagery.
4. Sticky `Order now` adds the item and opens fast checkout.
5. WhatsApp remains available as a trust-building fallback.

This keeps install optional and preserves browser-first ordering.

## Performance Notes

- Existing `next/image` usage is preserved.
- Animations remain lightweight and limited to micro interactions.
- The redesign reuses existing data, services, stores, and components.
- No backend architecture or business logic was rewritten.

## Updated Surfaces

- Homepage: `src/app/page.tsx`
- Search/listing: `src/components/flows/restaurant-browser-flow.tsx`
- Restaurant cards: `src/components/commerce/restaurant-card.tsx`
- Food cards: `src/components/commerce/food-item-card.tsx`
- Restaurant detail: `src/app/restaurant/[slug]/page.tsx`
- Menu flow: `src/components/flows/customer-menu-flow.tsx`
- Product detail: `src/components/flows/food-item-detail-flow.tsx`
- Checkout: `src/app/checkout/page.tsx`, `src/components/forms/checkout-form.tsx`, `src/components/commerce/checkout-summary.tsx`
- Offers: `src/app/offers/page.tsx`
- Tracking: `src/components/flows/order-tracking-flow.tsx`
- Customer shell/nav: `src/components/layout/customer-shell.tsx`, `src/components/layout/mobile-bottom-nav.tsx`, `src/components/layout/public-header.tsx`
