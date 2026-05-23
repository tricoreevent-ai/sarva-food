# Performance Audit

## Primary Goals

- Keep customer ordering fast on mobile.
- Keep Instagram deep links lightweight and conversion-focused.
- Avoid unnecessary client JavaScript on route shells.
- Reduce rerenders from unstable arrays and duplicated subscriptions.
- Prepare media-heavy studio flows for lazy loading.

## Current Performance Profile

Positive signals:

- App Router route boundaries already split customer, owner, admin, delivery, POS, studio, and catering bundles.
- Most route files are server components that mount specific client flows only where interactivity is needed.
- `next/image` is used for restaurant and food visuals.
- Customer mobile navigation and cart access are persistent and touch-friendly.
- Mock data is centralized, which avoids repeated in-route data creation.

Risks found:

- Client flow components do most of the interactive work and can grow large if backend behavior is added directly inside them.
- Studio image preview is media-heavy and should not be part of the initial app shell.
- Realtime hooks need stable dependencies to avoid unnecessary listener teardown/recreate cycles.
- Route state UI was duplicated and not fully reusable.
- PWA assets and offline fallback were minimal.

## Implemented Improvements

- Added `src/components/state/page-state.tsx` with reusable loading, error, and empty states.
- Updated `src/app/loading.tsx` and `src/app/error.tsx` to reuse shared state components.
- Added Suspense boundaries to restaurant listing and restaurant menu pages.
- Lazy-loaded the studio post creator from `src/app/studio/create-post/page.tsx`.
- Stabilized `useRestaurantOrders` status dependencies to reduce listener churn.
- Added `prefers-reduced-motion` handling in global CSS.
- Added touch optimization through `touch-action: manipulation`.
- Added route-level product metadata for customer item and Instagram deep-link pages.

## Bottlenecks To Watch

- Owner dashboards can become expensive if each widget opens its own listener.
- Admin analytics should not subscribe to raw transactional collections.
- Studio export should move from DOM preview to a dedicated canvas renderer only when real export quality is required.
- Large remote images should be stored in Firebase Storage with generated thumbnails or CDN transforms before production launch.

## Recommended Lighthouse Focus

Customer routes:

- `/`
- `/restaurants`
- `/restaurant/[slug]/menu`
- `/restaurant/[slug]/item/[itemId]?source=instagram&offer=INSTA20`
- `/checkout?mode=fast&offer=INSTA20`

Targets:

- Performance: 90+
- Accessibility: 95+
- Best practices: 95+
- SEO: 95+
- PWA installability: optional install prompt and valid manifest, not forced install

## Bundle Strategy

Current:

- App Router provides route-level splitting.
- Studio creator is dynamically imported.

Next:

- Dynamically import future chart libraries only inside admin/owner analytics pages.
- Dynamically import payment provider SDKs only when that payment tab is selected.
- Keep WhatsApp message generation as plain URL building, not an SDK dependency.

## Mobile UX

Implemented:

- Persistent bottom navigation.
- Sticky mobile order CTA on food item detail.
- Optional install prompt.
- Offline fallback route.
- Large touch controls.

Remaining:

- Add real device testing for iOS Safari bottom safe-area behavior.
- Validate checkout keyboard flow on low-end Android.
- Add analytics for abandoned checkout step and deep-link bounce rate once backend events are enabled.
