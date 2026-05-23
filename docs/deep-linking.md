# Deep Linking

## Instagram Click-To-Order Route

Route:

- `/instagram/[restaurantSlug]/[itemId]?offer=INSTA20`

Example:

- `/instagram/tamarind-table/m1?offer=INSTA20`

Purpose:

- Simulates an Instagram post/story click.
- Resolves the restaurant, food item, and campaign offer.
- Applies the promo code to cart state.
- Redirects to the product page.

## Product Page Route

Route:

- `/restaurant/[slug]/item/[itemId]?source=instagram&offer=INSTA20`

Purpose:

- Shows the food item as the first screen after the deep link.
- Keeps the offer visibly applied.
- Provides add-to-cart and checkout actions.
- Links back to the full menu.

## Menu URL Offer Support

Route:

- `/restaurant/[slug]/menu?source=instagram&offer=INSTA20&item=m1`

Purpose:

- Applies the offer code from the URL.
- Highlights the food item opened from the campaign.
- Preserves browser-first ordering without requiring app installation.

## Future Integration

Recommended future flow:

1. Instagram link opens `/instagram/[restaurantSlug]/[itemId]`.
2. Backend validates campaign, restaurant, and offer state.
3. Backend writes click attribution.
4. Frontend stores the offer in cart state.
5. User lands on the item page.
6. Checkout order includes `channel: "Instagram"` and `offerCode`.

Suggested Firebase documents:

- `campaigns/{campaignId}`
- `campaignClicks/{clickId}`
- `offers/{offerCode}`
- `orders/{orderId}`
