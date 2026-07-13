# Routing

The app uses Next.js App Router with route folders under `app`.

## Public Customer App

- `/`: ordering-first home with search, restaurants, cart, and ecosystem links.
- `/restaurants`: restaurant listing and filter/search shell.
- `/restaurant/[slug]`: restaurant detail, trust signals, WhatsApp CTA.
- `/restaurant/[slug]/menu`: menu ordering page with cart drawer.
- `/restaurant/[slug]/menu?source=instagram&offer=INSTA20`: Instagram click-to-order state.
- `/restaurant/[slug]/item/[itemId]`: food item detail page for direct campaign/product links.
- `/instagram/[restaurantSlug]/[itemId]?offer=INSTA20`: Instagram deep-link resolver.
- `/checkout`: checkout details and offer-code summary.
- `/order-success`: order success and receipt preview.
- `/order/[id]`: shareable order tracking page.
- `/offers`: offer discovery and apply routes.
- `/track-order`: standalone order lookup.

## Owner Dashboard

- `/owner`: live operations overview.
- `/owner/orders`: live order dashboard and kitchen tickets.
- `/owner/menu`: menu editor preview.
- `/owner/inventory`: inventory alerts.
- `/owner/reports`: analytics cards and chart placeholder.
- `/owner/offers`: offer management.
- `/owner/social-posts`: compact post creator.

## Super Admin

- `/admin`: platform overview.
- `/admin/restaurants`: restaurant onboarding and table.
- `/admin/users`: permissions and roles.
- `/admin/subscriptions`: plans and billing status.
- `/admin/campaigns`: campaign cards.
- `/admin/analytics`: platform analytics.

## Delivery Partner

- `/delivery`: assigned orders and OTP verification.
- `/delivery/orders`: route placeholder and next stop.
- `/delivery/history`: delivery history table.

## Marketing Studio

- `/studio`: studio overview.
- `/studio/templates`: template gallery.
- `/studio/create-post`: upload, template, text edit, preview, generate actions.
- `/studio/scheduled-posts`: scheduled publishing queue.

## Catering

- `/catering`: event booking enquiry and packages.
- `/catering/requests`: request pipeline.
- `/catering/packages`: package management.

## POS/Billing

- `/pos`: billing screen and invoice preview.
- `/pos/tables`: table billing grid.
- `/pos/invoice`: printable invoice preview.
