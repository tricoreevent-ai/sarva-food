# Architecture Audit

## Scope

This audit covers the current Next.js App Router project with customer ordering, owner operations, admin, delivery, POS, marketing studio, catering, Firebase services, mock flows, and documentation.

## Current Structure

The project is already modular:

- `src/app`: route entry points and layouts.
- `src/components`: reusable UI, commerce, dashboard, flow, layout, PWA, and state components.
- `src/lib`: mock data, constants, caches, schemas, social-commerce helpers, template helpers, and utility code.
- `src/services`: Firebase-facing service layer and no-op future integration adapters.
- `src/firebase`: client SDK, server/admin SDK, and typed collection helpers.
- `src/hooks`: realtime order and auth hooks.
- `functions`: Firebase Cloud Functions placeholders.
- `docs`: product, frontend, backend, Firebase, and optimization documentation.

## Strengths

- Routes are split by app surface, which keeps customer, owner, admin, delivery, POS, studio, and catering experiences independently evolvable.
- Mock flows remain demoable while Firebase services are introduced incrementally.
- UI components are reusable and largely domain-focused: `RestaurantCard`, `FoodItemCard`, `CartDrawer`, `CheckoutSummary`, `OrderTimeline`, `StatsCard`, and studio cards.
- Firebase calls live in services instead of leaking through UI components.
- Typed Firebase entities exist in `src/types/firebase.ts`.
- App Router layouts already provide separate shells for dashboard-style and customer-style surfaces.

## Duplication Report

Observed duplication:

- Loading and error UI had page-local implementations. This is now centralized through `src/components/state/page-state.tsx`.
- Offer/deep-link parsing was implicit in routes. This is now centralized through `src/lib/social-commerce.ts`.
- Firestore query setup was repeated across services. Shared pagination, cache, and listener helpers now live in `src/services/firestore-query.ts`.
- Form schemas were embedded in components. Checkout, menu, and catering schemas now live under `src/lib/schemas`.
- New feature scaffolding was undocumented. A lightweight template now exists under `templates/feature`.

Remaining opportunities:

- Some flow components still compose their own small status cards. Keep them local unless the pattern repeats at least three times.
- Dashboard table column definitions can move into feature constants once real backend sorting/filtering is added.
- Mock API and Firebase service contracts should be unified behind feature repositories when `NEXT_PUBLIC_USE_FIREBASE` is introduced.

## Component Reuse Opportunities

High-value reusable patterns:

- `PageLoading`, `InlineLoading`, `PageError`, and `PageEmpty` for route states.
- `DashboardShell` and `CustomerShell` for app-surface layout.
- `CheckoutSummary` as the single source of cart totals and offer display.
- `OfferBadge` for cart, deep-link, checkout, and studio contexts.
- `SocialTemplateCard` plus `buildTemplateExport` for every social output format.

Recommended next extraction:

- `StatusStepper` for owner order status, delivery status, and order tracking.
- `CrudToolbar` for menu, offers, inventory, and admin data pages.
- `MoneyMetricCard` for dashboard GMV/revenue/payment panels.

## Route Optimization Opportunities

Current route-level optimization:

- Public item pages now expose product metadata for sharing.
- `/restaurants` and `/restaurant/[slug]/menu` have Suspense boundaries.
- `/studio/create-post` lazy-loads the visual post creator.
- `app/loading.tsx` and `app/error.tsx` use reusable route-state components.

Next opportunities:

- Add static params for seeded restaurant and item routes while the app is mock-data driven.
- Move admin analytics charts behind dynamic imports when real charting is added.
- Keep owner and delivery realtime pages client-only at the leaf; keep surrounding layout server-rendered.

## Dependency Audit

Current dependencies match the requested stack:

- Next.js, React, TypeScript, Tailwind CSS.
- shadcn-style primitives through Radix.
- Firebase client and admin SDKs.
- Zustand for shared frontend state.
- React Hook Form and Zod for forms.
- Lucide icons.
- Framer Motion is installed and used lightly.

No dependency removal is recommended right now. Avoid adding generator, image, chart, or state libraries until production usage requires them.

## Maintainability Risks

- Mock state and Firebase services can drift if contracts are not documented per feature.
- Long-lived realtime listeners can become expensive if dashboard widgets start subscribing independently.
- Large client flow components may grow too large once backend-backed filtering, permissions, and optimistic updates are added.
- Social studio rendering can become hard to maintain if each platform format gets custom layout code.

## Decisions Made

- Added shared Firestore query helpers instead of changing every service into a large framework.
- Added a small cache layer with optional local persistence for menus.
- Added repository primitives for future CRUD consistency without rewriting current services.
- Added PWA install as progressive enhancement so browser-first and Instagram-first flows stay intact.
- Added barrel exports for stable imports, but kept Firebase admin out of the public Firebase barrel to avoid accidental client bundling.
