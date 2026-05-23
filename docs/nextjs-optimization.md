# Next.js Optimization

## Rendering Strategy

Keep the app shell server-rendered and push interactivity to leaf components.

Recommended split:

- Server components: route pages, metadata, layout shells, static documentation-style surfaces.
- Client components: cart, forms, dialogs, drawers, live order queues, delivery actions, POS billing, and studio editor.
- Dynamic imports: media-heavy studio, future charts, future payment SDKs.

## Implemented Changes

- Added product metadata to `/restaurant/[slug]/item/[itemId]`.
- Added social metadata to `/instagram/[restaurantSlug]/[itemId]`.
- Added `robots.ts` and `sitemap.ts`.
- Added root metadata, icons, manifest linkage, and OpenGraph defaults.
- Added Suspense boundaries to restaurant listing and menu routes.
- Added reusable root `loading.tsx` and `error.tsx` behavior through `PageLoading` and `PageError`.
- Dynamically imported the studio post creator.

## SEO Strategy

Public routes should be indexable:

- `/`
- `/restaurants`
- `/restaurant/[slug]`
- `/restaurant/[slug]/menu`
- `/restaurant/[slug]/item/[itemId]`
- `/offers`
- `/catering`

Private or operational routes should not be indexed:

- `/admin`
- `/owner`
- `/delivery`
- `/pos`

The `robots.ts` file disallows operational roots, and `sitemap.ts` includes customer-facing restaurant and product routes.

## Metadata Rules

For food item pages:

- Title includes item and restaurant.
- Description includes direct ordering intent.
- OpenGraph image uses the food image.
- Twitter card uses `summary_large_image`.
- Canonical URL points to the product route.

For Instagram deep links:

- Title includes offer code.
- Description emphasizes browser-first direct ordering.
- Offer parsing is centralized through `parseOfferCode`.

## Route Loading

Use:

- `app/loading.tsx` for broad page skeletons.
- `InlineLoading` inside dynamically imported feature blocks.
- Route-level Suspense only where data or client bundle boundaries benefit the page.

Avoid:

- Loading spinners for every small card.
- Client-only full pages when only one widget is interactive.

## Image Optimization

Current:

- Food and restaurant assets use `next/image`.
- Uploads are compressed client-side before Storage write.

Next:

- Add Storage thumbnails for menu item list cards.
- Add `sizes` consistently to any future image-heavy components.
- Keep social editor preview local until export needs true canvas generation.

## Caching

Current:

- Menu service has TTL cache with optional browser persistence.
- Service worker caches navigations and restaurant pages for offline fallback.

Future:

- Add route handlers for public restaurant/menu reads if server-side Firebase reads are enabled.
- Use Next fetch caching only for public data that does not require user-specific security.

## Accessibility

Current:

- Inputs use labels.
- Dialog/sheet primitives come from Radix.
- Icon-only buttons use labels in existing UI.
- New route error/loading states expose clear text and busy states.

Next:

- Run keyboard-only audits for checkout, cart drawer, owner order state changes, and POS billing.
- Add focus management to successful checkout and delivery OTP transitions.
