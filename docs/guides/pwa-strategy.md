# PWA Strategy

## Principle

Installation must stay optional. The customer should complete a full order from:

- Browser.
- Instagram deep link.
- WhatsApp link.
- Installed PWA shortcut.

No critical checkout step should require installation.

## Implemented PWA Pieces

- `public/manifest.json` with name, theme color, icon, categories, and shortcuts.
- `public/icons/food-gedi-icon.svg` for install surfaces.
- `public/sw.js` for offline fallback and lightweight restaurant page caching.
- `src/components/pwa/pwa-registrar.tsx` for production service worker registration.
- `src/components/pwa/install-prompt.tsx` for optional install prompt.
- `/offline` route for navigation fallback.

## Service Worker Policy

Navigation:

- Network first.
- Falls back to the cached route or `/offline`.

Restaurant pages:

- Stale while revalidate.
- Supports reopening recently visited restaurant/menu pages.

Static assets:

- Cache first for Next static assets and manifest.

Checkout and writes:

- Do not attempt offline order submission yet.
- Show offline guidance and resume when connection returns.

## Mobile UX

Implemented:

- Touch-friendly controls.
- Safe-area-aware bottom navigation.
- Sticky mobile item-page order CTA.
- Optional install prompt above bottom navigation.
- Reduced motion support.

Recommended next tests:

- iOS Safari add-to-home-screen behavior.
- Android Chrome install prompt.
- Keyboard overlap on checkout address input.
- Deep link load time on 3G/4G throttling.

## Cached Menu Strategy

Today:

- Menus are cached in the browser by the service layer using localStorage TTL.
- Recently visited restaurant pages can be served by the service worker.

Future:

- Move menu cache to IndexedDB if documents become too large for localStorage.
- Add versioned menu cache keys, such as `restaurantId:menuUpdatedAt`.
- Add a visible stale-data hint only when the user is offline.

## Install Prompt Rules

Show prompt only when:

- Browser fires `beforeinstallprompt`.
- User has not dismissed it.
- Customer is on a public shell.

Never block:

- Instagram order flow.
- Cart drawer.
- Checkout.
- WhatsApp handoff.

## Splash Screens

The manifest provides theme/background colors and a maskable SVG icon. For production app-store quality, add generated PNG icons in 192, 512, and Apple touch sizes.
