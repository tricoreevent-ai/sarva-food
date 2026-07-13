# Restaurant Operations System

Nammude now extends the existing commerce platform into a restaurant operating ecosystem without replacing the completed architecture. The current implementation uses the persisted mock store as the integration layer so each workflow can later move to Firebase collections, Cloud Functions, and realtime listeners.

## Onboarding Restrictions

Owners must complete the business profile before owner dashboard access is available. Mandatory fields are hotel name, logo, business address, Google map location, cuisine type, phone number, operating hours, delivery radius, dining availability, and cloud kitchen status. GST and FSSAI/license fields are optional placeholders.

The owner dashboard shell checks the completed profile state and redirects attention to `/owner/onboarding` until setup is complete.

## Table Ordering Flow

1. Customer scans a table QR or waiter creates an order from `/owner/tables`.
2. The order is mapped to a table number and stored as a table order.
3. The ticket appears in the kitchen display system.
4. Kitchen moves the order through `new`, `preparing`, `ready`, `served`, and `completed`.
5. Billing/POS can use the same table order state for final settlement.

## Kitchen Workflow

The KDS at `/owner/kitchen` is optimized for tablets and TVs with large table numbers, readable items, timers, priority badges, and touch-sized status actions. It is ready to be connected to realtime order listeners and waiter/counter notifications.

## Thermal Printer Workflow

The printer panel at `/owner/printers` supports browser-print compatible operation first:

- auto print orders when new KOTs arrive
- kitchen ticket preview
- receipt preview for billing
- compact 58/80mm thermal layout
- test print through `window.print()`
- connection status placeholders

Future native printer bridges can subscribe to the same table order and POS bill events.

## Menu PDF Generation

The print menu screen at `/owner/menu/print` provides a premium A4 black-and-white menu card with hotel logo, hotel name, bordered sections, category grouping, item names, prices, and descriptions. Browser print can save this as PDF.

## Digital Display Flow

The digital menu at `/owner/digital-menu` is designed for TVs, monitors, and tablets. It includes large landscape menu cards, offer rotation space, promotional banners, and QR ordering display. It is ready for fullscreen mode and autoplay/auto-scroll enhancement.

## Social Approval Workflow

Owners do not publish Instagram or Facebook posts directly.

1. Owner creates a post in `/owner/social-posts`.
2. Owner uploads/selects food image, headline, offer code, caption, CTA, location tag, and optional schedule.
3. Post is submitted with `pending` status.
4. Admin reviews in `/admin/social-queue`.
5. Admin approves, rejects, or publishes through official Nammude accounts.
6. Published posts become location-based promotional content.

The Meta integration panel at `/admin/meta` contains Instagram/Facebook account connection management, Graph API placeholders, token fields, page selection actions, and posting history.
