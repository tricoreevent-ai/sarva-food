# Sarva Food Task Tracker

Last updated: 2026-06-04

This file is the project-visible source of truth for implementation progress. Update it whenever a task is started, completed, deferred, or blocked.

## In Progress

- [ ] Live Firestore data integrity verification for Cafe Al Arab owner/menu/offer/schedule mappings. Code paths and seed/demo leakage were fixed locally on 2026-06-04; final live database audit/repair still needs authenticated Firestore execution against the target environment.

## Blocked / External Access Required

- [ ] Verify and repair the live Cafe Al Arab Firestore relationship so `Cafe Al Arab` / `cafe-al-arab-thanisandra` is owned by `divakdi@gmail.com` only, with no Test Owner records, duplicate active restaurants, orphan menu items, or stale seeded offers. Requires running the audit/repair against the intended Firebase project.
- [ ] Deploy the latest verified application build to Hostinger. Local build verification passed on 2026-06-01; final deployment requires Hostinger hPanel/GitHub deployment access.
- [ ] Configure and verify the production outage alert recipient in Hostinger and Admin CMS. The Hostinger env template is ready; final setup requires Hostinger environment access and production Admin CMS login.

## Completed

- [x] Customer home width/category cleanup completed on 2026-06-04: the fixed `1180px` homepage restaurant/item sections now use the full shared page width, Admin-master categories render without hard borders, and category chips include lighter hover animation.
- [x] Public header/profile cleanup completed on 2026-06-04: desktop address/search controls are right-aligned, the stale/fake `Gold Member` profile card row was removed, logout immediately hides the customer profile state, and the extra desktop create-account action was removed from the header.
- [x] Customer login/profile completion cleanup completed on 2026-06-04: Google/customer login defaults to the homepage, while missing customer phone numbers still route to `/profile?phoneRequired=1` and now focus the phone number field.
- [x] Theme/font/fullscreen preference cleanup completed on 2026-06-04: visible theme color controls are hidden, compact font-size choices use icon buttons with tooltips, and compact fullscreen uses an icon-only control with explanatory title text.
- [x] Deals and loyalty configuration cleanup completed on 2026-06-04: Deals now uses the same owner-configured public offers fallback as the homepage, Admin CMS includes loyalty earning/redemption/tier settings, and the customer loyalty page reads those settings instead of fixed thresholds.
- [x] Owner menu item media/taxonomy cleanup completed on 2026-06-04: menu items can keep multiple food images with a cover image, cuisines are a searchable required selector backed by Admin master cuisines, and cuisine/food-type validation blocks incomplete item publishing.
- [x] Cafe Al Arab public duplicate normalization completed on 2026-06-04: customer-side public restaurant data now collapses Cafe Al Arab variants to the `Cafe Al Arab UL` launch identity to reduce duplicate/confusing listings while the live Firestore relationship audit remains external.
- [x] Owner profile tooltip cleanup completed on 2026-06-04: the owner avatar no longer opens the generic tooltip alongside the profile menu, and Firebase UID/session ids are no longer used as visible owner/email fallback text.
- [x] Restaurant page width and border cleanup completed on 2026-06-04: shared `container-page` now uses full available page width, the Cafe Al Arab restaurant hero renders as a full-width band, and restaurant menu/order/about/offer/cart panels were simplified with lighter spacing and fewer hard borders.
- [x] Restaurant discovery/data cleanup pass completed on 2026-06-04: public restaurant cards and detail pages now calculate Open/Closed from operating hours, optional holiday/temporary/emergency closure fields, and ordering enablement instead of treating `active`/`isOpen` as live status.
- [x] Restaurant browser filters redesigned on 2026-06-04: `/restaurants` now keeps search, quick chips, and the filter button on-page while advanced filters open in a desktop right drawer/mobile bottom sheet with reset and result count.
- [x] Hardcoded offer/demo leakage cleanup completed on 2026-06-04: seeded offer documents/coupons and default CMS sponsored offer cards were removed from seed/default paths, public menu offer cache was invalidated, restaurant cards no longer infer offers from tags, and targeted hardcoded offer/name search returned no matches.
- [x] Cafe Al Arab local fallback mapping cleanup completed on 2026-06-04: client fallback owner profile and bootstrap scripts no longer use `Test Owner`, stale persisted Test Owner profiles are purged, and Cafe Al Arab fallback contact email now resolves to `divakdi@gmail.com`.
- [x] Owner profile hover card fixed on 2026-06-04: hovering/clicking the owner profile icon now opens an owner information card with owner, restaurant, mobile, email, plan, restaurant status, joined date, and the expected profile/settings/billing/support/logout actions.
- [x] Duplicate owner restaurant-name guard added on 2026-06-04: owner profile saves now reject another active restaurant with the same normalized name for the same owner.
- [x] Restaurant schedule validation strengthened on 2026-06-04: customer scheduled orders still use native `date` and `time` inputs and now validate against restaurant hours plus configured prep/cutoff minutes.
- [x] Discovery cleanup verification completed on 2026-06-04: targeted hardcoded-offer/Test Owner search passed, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Owner/admin login speed pass completed on 2026-06-03: owner/admin portal login screens no longer import the heavy persisted app store just to redirect after module login cookies are written.
- [x] Owner Menu landing page compact redesign completed on 2026-06-03: menu items now use a POS-style dense desktop table, stacked mobile rows, compact KPIs, quick filters, advanced filter drawer, bulk actions, pagination, image preview, tooltipped icon actions, and preserved item wizard/import/export behavior.
- [x] Reusable WhatsApp marketing generator completed on 2026-06-03: added reusable templates, TinyURL shortening with original URL fallback, preview/copy/WhatsApp modal, share hook, admin marketing settings, owner restaurant WhatsApp settings, and share actions across owner menu, item detail, owner offers/campaigns, admin campaigns, and owner dashboard top items.
- [x] Menu redesign and WhatsApp marketing verification completed on 2026-06-03: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed.
- [x] Customer public page width alignment fixed on 2026-06-02: restaurant detail and restaurant item detail pages now use the shared `container-page` width so the header and body align consistently.
- [x] Live hardcoded menu leakage guard strengthened on 2026-06-02: public menu cache was invalidated, legacy seeded Cafe Al Arab item names were removed from fallback popular items, and production/client seed scripts no longer create sample menu items or sample menu-linked orders unless `SEED_SAMPLE_MENU_ITEMS=true` is explicitly set.
- [x] Hosted Cafe Al Arab legacy menu cleanup completed on 2026-06-02: 16 exact seeded menu documents were deleted from Firestore across `menuItems`, `dineInMenus`, `parcelMenus`, and `deliveryMenus`; hosted `/api/public/menu?restaurantId=cafe-al-arab-thanisandra` now returns an empty menu instead of the four hardcoded dishes.
- [x] Local dev OOM mitigation added on 2026-06-02: default `npm run dev` and `npm run dev:lan` now use the webpack dev server instead of Turbopack to avoid Windows filesystem cache compaction heap crashes.
- [x] Admin/local dev stale chunk crash fixed on 2026-06-02: dev startup now cleans `.next/dev`, the service worker no longer caches Next chunk files, local HTTP dev unregisters stale service workers before app boot, and chunk-load failures trigger one safe reload instead of stopping the app.
- [x] Hosted admin raw RSC page fix prepared on 2026-06-02: admin pages are now forced dynamic/no-store, admin responses emit RSC-aware `Vary` headers, and the service worker bypasses/refuses to cache Next RSC `text/x-component` payloads so CDN or browser cache cannot display RSC data as a page.
- [x] Login redirect and live-screen cleanup fixed on 2026-06-02: shared auth login now removes all development-login shortcut panels, skips hidden dev fixture sign-in, normalizes return paths to avoid login loops, and uses full-page post-auth navigation so server session cookies are honored before dashboard routing.
- [x] Mobile restaurant page cart/banner cleanup completed on 2026-06-03: removed the duplicate top mobile cart/name bar, hid the shared header cart on restaurant routes, restored a compact 30vh mobile restaurant banner on the menu step, and reduced the order-now/schedule-later selector into small mobile-friendly buttons.
- [x] Customer cart visibility cleanup completed on 2026-06-03: restored the desktop header cart on restaurant pages while keeping mobile restaurant pages bottom-cart-only, and removed the duplicate floating mobile home cart button that overlapped the bottom cart panel.
- [x] Mobile/tablet restaurant page redesign completed on 2026-06-03: restaurant routes now render a dedicated Zomato-style mobile/tablet layout with compact image hero, back/search/share/more controls, one-row search and filter, horizontal offers, dynamic item rows, bottom-cart-only mobile flow, and closed-restaurant guards while keeping desktop layout unchanged.
- [x] Mobile restaurant menu item cleanup completed on 2026-06-03: removed duplicate visible quick-filter chips from mobile, simplified item rows to veg/non-veg dot plus item text, removed Bestseller/Medium/mobile badge chips, reduced item image size, and separated the image from add/quantity controls while preserving image/name links to item detail pages.
- [x] Owner login repair completed on 2026-06-03: operational/admin login now always uses Firebase credentials instead of customer Stack Auth, auth form errors render through a reusable inline alert component instead of right-side toast popups, and session API profile errors are owner/admin aware.
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
