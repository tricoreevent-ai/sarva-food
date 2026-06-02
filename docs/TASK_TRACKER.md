# Sarva Food Task Tracker

Last updated: 2026-06-02

This file is the project-visible source of truth for implementation progress. Update it whenever a task is started, completed, deferred, or blocked.

## In Progress

- [ ] None.

## Blocked / External Access Required

- [ ] Deploy the latest verified application build to Hostinger. Local build verification passed on 2026-06-01; final deployment requires Hostinger hPanel/GitHub deployment access.
- [ ] Configure and verify the production outage alert recipient in Hostinger and Admin CMS. The Hostinger env template is ready; final setup requires Hostinger environment access and production Admin CMS login.

## Completed

- [x] Customer restaurant menu filters redesigned on 2026-06-02: the old hardcoded chip section was removed, search and Filters now sit beside the menu item list, and the filter UI opens as a desktop slide-over/mobile bottom sheet with outside-click close, Escape close, scroll lock, reset, multi-select chips, dynamic category/cuisine/tag options, and result counts.
- [x] Customer home and restaurant pages now use the same shared header on 2026-06-02, including a desktop/mobile address picker with saved profile addresses, recent delivery locations, GPS detect, and an Add new address action.
- [x] Public CMS branding now hydrates on every customer/public route and caches CMS settings in local storage to reduce visible brand-name flicker between the fallback app name and Admin-configured branding.
- [x] Build-time app naming now reads `NEXT_PUBLIC_APP_NAME`/`NEXT_PUBLIC_BRAND_NAME`, and the environment templates include `NEXT_PUBLIC_APP_NAME` for production metadata/header fallback alignment.
- [x] Google customer signup/session repair was strengthened on 2026-06-02: Google sign-in creates the customer profile before session sync and client Firestore writes omit undefined phone/photo/email values.
- [x] Admin CMS legal policy fields now use a rich text editor with bold, italic, bulleted list, numbered list, and font-size controls; legal pages render formatted policy HTML through a sanitizer.
- [x] Customer footer no longer displays the restaurant responsibility disclaimer sentence; the disclaimer remains available as policy/legal content.
- [x] Hostinger/Next build trace guard added on 2026-06-02: `npm run build` uses a wrapper that creates `.next/server/middleware.js.nft.json` only when the hosting trace artifact is missing.
- [x] Customer header/auth/CMS/policy/build verification completed on 2026-06-02: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Owner menu item promotion links added on 2026-06-02: each item row can copy the customer item URL, open the public item page, or launch WhatsApp with a prefilled item promotion message.
- [x] Customer restaurant ordering now supports right-now or scheduled mode from the same restaurant landing/menu flow, including schedule date/time validation, details-step editing, confirmation summary, and scheduled order metadata submission through the existing order API/store contract.
- [x] Customer item detail pages now include a Schedule action for shared item links; it adds the configured item/customizations to cart and opens the restaurant page in scheduled mode.
- [x] Menu promotion and schedule verification completed on 2026-06-02: `npm run typecheck`, `npm run lint`, and `npm run build` passed.
- [x] Google customer account creation fixed on 2026-06-02: customer Google sign-in now asks the session API to create or repair the customer `users/{uid}` and `customerProfiles/{uid}` documents server-side before writing the session cookie.
- [x] Google auth error handling improved on 2026-06-02: session setup now returns clear messages when Firebase Admin credentials are missing or customer profile creation fails.
- [x] Google account creation verification completed on 2026-06-02: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Google signup session repair fixed on 2026-06-02: customer profile creation now omits undefined Firestore fields such as missing phone/photo values and customer-surface session POSTs repair missing customer profiles automatically.
- [x] Google signup session repair verification completed on 2026-06-02: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Owner menu Add item/New item flow now resets to a truly empty draft on 2026-06-02, including blank name, image URL, category, cuisine, base price, food type, spice, tags, descriptions, modifiers, add-ons, and channel prices.
- [x] Owner menu creation validation now shows clearer required-field messages for empty base price, food type, and spice selections instead of default enum/number errors.
- [x] Application text inputs now preserve native text selection behavior: inputs/textareas/contenteditable fields are excluded from fast-tap interaction rules, selection colors are visible, and mobile pull-to-refresh ignores form controls.
- [x] Pending menu reset/input-selection verification completed on 2026-06-02: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and `/owner/menu` route protection returned the expected owner-login redirect.
- [x] Owner menu page cleanup completed on 2026-06-01: Categories and Cuisines management tabs were removed because taxonomy is now managed through Admin master lists.
- [x] Owner menu Excel template now generates from the active item-creation fields plus current Admin master category/cuisine data, with channel prices treated as optional import fields.
- [x] Menu item channel availability now comes from channel prices: blank or zero dine-in, parcel, or delivery price hides that item from that channel.
- [x] Owner menu cleanup verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and `/owner/menu` route protection returned the expected owner-login redirect.
- [x] Owner menu page readability improved on 2026-06-01: menu item wizard labels, headings, text boxes, select boxes, multiselect/listbox options, placeholders, disabled values, and preview text now use dark readable owner-module colors.
- [x] Owner menu readability verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and `/owner/menu` route protection returned the expected owner-login redirect.
- [x] Customer restaurant detail page redesigned toward the attached food-delivery reference with a stronger visual hero, desktop offer/about side panel, recommended item list, sticky order panel, and mobile-friendly ordering layout.
- [x] Admin Food Categories and Cuisine Types APIs now merge the configured master list with default app taxonomy so customer, owner, and POS screens can use one shared source even before Firestore is seeded.
- [x] Added Indian cuisine master data with icons, images, colors, sort order, and descriptions, including Punjabi, Hyderabadi, Bengali, Gujarati, Rajasthani, Maharashtrian, Goan, Awadhi, Kashmiri, and North East Indian.
- [x] Owner menu creation, customer restaurant/menu filters, and POS menu filters now read category/cuisine options from the shared public master taxonomy instead of each screen relying only on local labels.
- [x] Restaurant page and master taxonomy verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, `/restaurant/cafe-al-arab-thanisandra`, `/api/public/categories`, and `/api/public/cuisines`.
- [x] Customer restaurant item detail page redesigned for desktop and mobile with image gallery, dish metadata, customization controls, allergen chips, dish information, reviews, recommendations, sticky desktop order panel, and mobile sticky add-to-cart bar.
- [x] Owner-created menu item detail fields now persist into public menu data: prep time, calories, spice level, ratings, modifiers, add-ons, variant groups, modifier groups, images, badges, dietary labels, and allergen labels.
- [x] Item detail customization now updates quantity, modifiers, add-ons, and cart price from the configured owner menu item instead of hardcoded dish content.
- [x] Item detail redesign verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, and `/restaurant/cafe-al-arab-thanisandra/item/menu-7c49c932-f7a1-46c4-bc39-6fd42efe1aa7` returned HTTP 200 locally.
- [x] Customer Cafe Al Arab restaurant page no longer shows the legacy seeded menu items: Chicken Shawarma Roll, Al Faham Chicken Half, Chicken Mandi, or Falafel Pita.
- [x] Customer public menu loading now filters stale seeded Cafe Al Arab items from API results, in-memory responses, and persisted client menu cache by using a new menu cache key.
- [x] Owner-created menu items are treated as customer-visible when any customer channel is enabled: delivery, parcel, or dine-in.
- [x] Hardcoded menu removal verification completed on 2026-06-01: `/api/public/menu?restaurantId=cafe-al-arab-thanisandra` returned an empty list after seed filtering, `/restaurant/cafe-al-arab-thanisandra` returned HTTP 200, and `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Customer restaurant mobile view now uses a smaller first-screen hero, mobile-first quick filters, and a cart-first ordering flow.
- [x] The large customer restaurant banner is hidden on mobile once the customer has selected items or entered the ordering wizard; restaurant routes also skip the bulky customer footer.
- [x] Mobile item add now moves the first selected item directly into the Offers step, with explicit apply and remove controls for coupon/offer selection.
- [x] Customer restaurant mobile update verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, `/restaurant/cafe-al-arab-thanisandra`, and `/restaurant/cafe-al-arab-thanisandra/menu`.
- [x] Owner menu Items tab now lands on the created-item list first, with search plus category, food type, channel, customer visibility, availability, price, image, modifier, and sort filters.
- [x] Owner menu list rows show item image, customer visibility, food type, operational status, and all three prices: dine-in, parcel, and delivery.
- [x] Owner menu create/edit wizard now opens from Add/Edit actions, includes Back to list, dark readable labels, field help tooltips with examples, manual image URL support, and stronger validation before save.
- [x] Menu item validation now checks required image, duplicate item names, at least one enabled channel, valid channel prices, and modifier/add-on `Name:Price` format.
- [x] Menu screen verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Local route check on 2026-06-01: `/restaurant/cafe-al-arab-thanisandra/menu` returned HTTP 200, and `/api/public/menu?restaurantId=cafe-al-arab-thanisandra` returned the Cafe Al Arab menu items.
- [x] Owner menu Items page redesigned with a six-step wizard flow: basic information, description, customization, additional info, channel visibility, and review/publish.
- [x] Owner menu item creation now has a desktop step rail, mobile step dots, live image/menu preview, channel price summary, and customer-visible catalogue status.
- [x] Customer public menu hook now merges matching owner-created local menu items into restaurant/menu pages when Firestore/public API data is empty, delayed, or missing local drafts.
- [x] No runtime hardcoded customer menu list was found; customer menu pages remain API/store-driven instead of static arrays.
- [x] Cafe Al Arab public menu API check on 2026-06-01 returned Firestore-backed items: Chicken Shawarma Roll, Al Faham Chicken Half, Chicken Mandi, and Falafel Pita.
- [x] Menu redesign verification completed on 2026-06-01: `/owner/menu`, `/restaurant/cafe-al-arab-thanisandra`, and `/restaurant/cafe-al-arab-thanisandra/menu` returned HTTP 200 locally.
- [x] Verification completed after menu redesign on 2026-06-01: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Application file structure documentation now matches the current owner POS and shared auth/config module layout.
- [x] Local deployment readiness verification completed on 2026-06-01: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Hostinger environment template contains every variable required by `scripts/validate-production-env.mjs`.
- [x] POS UI files moved from `src/components/pos` into `src/modules/owner/pos/components` with imports updated.
- [x] POS store selector source moved under `src/modules/owner/pos/pos-store.ts`; the generic store barrel now re-exports the owner POS source.
- [x] Admin, owner, customer, and environment config files consolidated under `src/modules/shared/config`.
- [x] Admin, owner, and customer auth role helpers consolidated under `src/modules/shared/auth`.
- [x] Old config/POS/auth import paths were removed from application code.
- [x] Fresh dev smoke test passed after module structure cleanup: customer restaurants, admin login, owner login, and owner POS routing respond correctly.
- [x] Owner login no longer shows a success toast after redirecting into the owner dashboard.
- [x] Owner module header redesigned as a cleaner navigation bar: simple breadcrumbs, no branch selector, no online/status KPI pills, icon-only actions, Radix tooltips, quick actions, and profile icon-only menu.
- [x] Owner profile menu closes on outside click, focus loss, and Escape.
- [x] Owner settings saves use a centered animated success confirmation that remains visible for up to 30 seconds or until dismissed.
- [x] Owner restaurant banner cards include a clear Delete action.
- [x] Customer restaurant hero uses only configured owner banners when available, instead of appending unrelated fallback images.
- [x] Owner profile API no longer writes the restaurant logo into customer carousel banners; the Cafe Al Arab UL Firestore record was repaired to exactly three banners.
- [x] Added `npm run firebase:repair:banners -- <restaurant-slug>` for narrowly scoped restaurant banner cleanup.
- [x] Restaurant ordering wizard is positioned after offers and filters; the redundant swipe instruction was removed.
- [x] Restaurant menu cards use consistent full-height layout, bottom-aligned price/actions, two-line descriptions, and item-detail links from image, name, and More.
- [x] Customer images skip known invalid seeded Cloudinary placeholders, and the development PWA prompt no longer intercepts browser install events.
- [x] Admin and owner login routes bypass the lazy dashboard shell to avoid Next.js dev HMR router initialization errors during login.
- [x] Customer, owner, and admin shells now load through independent `React.lazy()` + `Suspense` runtime boundaries.
- [x] Customer, owner, and admin modules each have independent route/runtime error recovery so one module crash does not take down another module.
- [x] Module retry and scoped auth hydration updates use `useTransition()` to keep the interface responsive during recovery/session updates.
- [x] Customer high-traffic routes now have customer-scoped error boundaries: home/root, restaurants, restaurant detail, offers, cart, checkout, orders, profile, account, and tracking.
- [x] Admin and owner route errors now use the same transition-safe module recovery component.
- [x] Module API ownership remains separated by endpoint family: customer/public APIs under `/api/public` plus customer order/payment APIs, owner APIs under `/api/owner`, and admin APIs under `/api/admin`.
- [x] Owner POS opens without requiring branch onboarding first.
- [x] Owner POS uses a safe fallback main branch when a branch document is not available yet.
- [x] Customer listing is restricted to restaurants with complete public profile, location, contact, media, cuisine, hours, and delivery configuration.
- [x] `divakdi@gmail.com` is linked to `Cafe Al Arab UL`.
- [x] Cafe Al Arab UL baseline owner profile, customer listing data, location, hours, delivery settings, contacts, cuisines, and banners are seeded.
- [x] Owner Branding supports multiple restaurant banners.
- [x] Owner Branding includes a live customer-facing banner preview.
- [x] Owner sidebar includes a Banners shortcut.
- [x] Admin CMS supports configurable homepage content and branding.
- [x] Customer homepage and restaurant listing use CMS-backed public content.
- [x] Hostinger production environment template and deployment notes are present.
- [x] Customer, owner, and admin auth guardrails are separated by role.
- [x] Customer homepage and restaurant listing show simple, non-technical recovery messages when restaurant data cannot be loaded.
- [x] Public restaurant, category, menu, offer, CMS, and review API failures trigger a throttled database outage alert email.
- [x] Admin CMS includes customer service alert controls for recipient email, enable/disable, and customer-facing recovery copy.
- [x] Hostinger environment template includes the `DATABASE_ALERT_EMAIL` outage fallback recipient.
- [x] Printer settings use the safe default operational branch when onboarding has not created a branch document yet.
- [x] Verification completed on 2026-05-31: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Customer homepage loading uses a branded animated state instead of blank restaurant-card placeholders while public data loads in the background.
- [x] Verification completed after homepage loader update on 2026-05-31: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Admin Firebase startup diagnostics now run through a server-side Admin SDK endpoint instead of browser Firestore aggregation queries.
- [x] Admin dashboard no longer triggers client-side `permission-denied` aggregation errors for protected Firestore collections.
- [x] Admin startup banner now uses a lightweight health check; full collection and index scans stay on the Firebase Diagnostics page.
- [x] Admin, owner, and customer route guards now use module-scoped session cookies instead of one shared `sarva_role` cookie.
- [x] Admin and owner logins can coexist without redirecting the owner app back to the admin dashboard.
- [x] Local same-browser session verification passed on 2026-05-31: admin and owner scoped sessions remain valid in the same cookie jar.

## Deployment Follow-Up

- [ ] Add the required production environment variables in Hostinger.
- [ ] Set `DATABASE_ALERT_EMAIL` in Hostinger to the admin mailbox that should receive database outage alerts.
- [ ] Open Admin → System Settings → Customer service alerts and save the same recipient address.
- [ ] Confirm SMTP settings in Hostinger so outage alerts and credentials email can be delivered.
- [ ] Run `npm run firebase:seed:production` after deploying if hosted Firestore still contains old test-owner records.
- [ ] Redeploy the latest GitHub commit to Hostinger.
- [ ] Verify customer homepage, `/owner/login`, `/owner/pos`, and `/admin/login` on the hosted URL.

## Notes

- Owners may use operational screens immediately after login.
- A restaurant is intentionally hidden from the customer portal until its public profile is complete.
- Public outage messages must never expose Firestore, Firebase, stack traces, environment variables, or other infrastructure details.
