# UX/UI Architecture

## Product Scope

Sarva Food is structured as a modular restaurant and hospitality commerce ecosystem. This foundation focuses on UX/UI, navigation, responsive layout, reusable components, mock data, and wireframe-level interactions only.

The ecosystem includes:

- Customer Ordering App
- Restaurant Owner Dashboard
- Super Admin Dashboard
- Delivery Partner App
- POS/Billing App
- Marketing and Instagram Post Studio
- Catering/Event Booking App

## Core Principles

- Browser-first customer ordering with optional app installation.
- PWA-friendly shell, manifest, mobile bottom navigation, and persistent cart access.
- Minimal customer steps: restaurant page, menu, cart, checkout, order tracking.
- Instagram deep links target `/restaurant/[slug]/menu?source=instagram&offer=INSTA20`.
- Offer codes are previewed in cart and checkout using frontend state.
- Dashboards use shared sidebar, cards, tables, tabs, dialogs, and empty states.
- Backend integrations are intentionally deferred.

## Information Architecture

Customer routes are public and optimized for mobile browsing. Dashboard routes use a shared shell with desktop sidebar and mobile drawer navigation. Each app owns a focused navigation set while sharing layout primitives.

Customer IA:

- Discover restaurants
- Open restaurant detail
- Order from menu
- Review cart
- Apply offer
- Checkout or WhatsApp fallback
- Track order

Operations IA:

- Owner: live orders, kitchen tickets, menu, inventory, reports, offers, social posts
- Admin: onboarding, users, subscriptions, campaigns, analytics
- Delivery: assigned orders, route placeholder, OTP verification, history
- POS: billing, table billing, invoice preview
- Studio: templates, create post, scheduled posts
- Catering: request capture, packages, request pipeline

## Responsive Behavior

- Public pages use `CustomerShell`, `PublicHeader`, and `MobileBottomNav`.
- Dashboard pages use `DashboardShell` and `DashboardSidebar`.
- Mobile layouts stack forms and cards with large touch targets.
- Desktop dashboards use two-column grids and sticky sidebars.
- Repeated fixed-format controls use stable dimensions to prevent layout shift.

## Accessibility Baseline

- Semantic `main`, `section`, `nav`, `time`, `fieldset`, and table structures.
- Buttons have icon text or `aria-label`.
- Dialogs and sheets use Radix primitives for focus management.
- Statuses are text plus badge labels, not color only.
- Inputs use labels and validation messages where relevant.

## Interaction Model

- Cart uses Zustand with local persistence for a fast browser/PWA feel.
- Checkout uses React Hook Form and Zod for frontend validation only.
- Framer Motion is used sparingly for lightweight tap and stats-card feedback.
- Tabs, sheets, drawers, and dialogs are available as reusable patterns.

## Future Backend Boundaries

The current UI is ready for:

- Auth and role-based access control
- Restaurant/menu APIs
- Order creation and payment providers
- Inventory sync
- Maps and delivery location SDKs
- Social publishing APIs
- Subscription billing
- Catering CRM workflows
