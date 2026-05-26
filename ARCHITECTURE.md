# Sarva Food App Architecture Reference

## Scope

This reference covers the core architecture of the Sarva Food App repository. It describes the main frontend and backend layers, route layout organization, reusable UI patterns, data/service separation, Firebase integration, and the key user surfaces supported by the project.

It is intended for developers who need a quick map of where features live and how the project is structured.

## Overview

This project is a Next.js App Router application built for a restaurant commerce ecosystem. It includes customer-facing ordering, owner operations, delivery management, admin tools, POS workflows, catering, social marketing studio, and Firebase-backed services.

The architecture is intentionally modular:
- `src/app`: route entry points and layouts for each user surface.
- `src/components`: reusable UI primitives and shared components.
- `src/components/flows`: high-level feature flows and screen compositions.
- `src/stores`: migration-safe Zustand domain entrypoints that wrap the current persisted stores.
- `src/services`: Firebase-facing service layer and feature adapters.
- `src/lib`: shared utilities, caches, schemas, constants, and server helpers.
- `src/hooks`: custom hooks for auth, realtime listeners, and public data.
- `src/types`: shared TypeScript models and Firestore entity typings.
- `functions/`: Firebase Cloud Functions backend code.
- `docs/`: architecture, feature, Firebase, and optimization documentation.

## Key Layers

### 1. Presentation Layer

- `src/app`
  - Defines route pages, layouts, and route-scoped metadata.
  - Contains separate shells and layouts for customer, owner, delivery, studio, and admin surfaces.
  - Examples: `/checkout`, `/track-order`, `/owner`, `/delivery`, `/catering`, `/studio`, `/admin`.

- `src/components`
  - UI primitives: buttons, inputs, cards, dialogs, tables, badges, loaders.
  - Domain widgets: `RestaurantCard`, `FoodItemCard`, `CheckoutSummary`, `OrderTimeline`, `StatsCard`.
  - State components: `PageLoading`, `PageError`, `PageEmpty`, reusable route states.
  - Layout components: `CustomerShell`, `DashboardShell`, mobile nav, headers.

- `src/components/flows`
  - Composite workflows built from smaller UI components.
  - Example flows: `customer-menu-flow`, `restaurant-detail-flow`, `pos-billing-flow`, `owner-order-management-flow`, `catering-flow`, `order-tracking-flow`.
  - These flows encapsulate presentation and interaction patterns for major user journeys.

### 2. State & Data Layer

- `src/lib/app-store.ts`
  - Root persisted Zustand store managing shared client state across routes and flows.
  - Remains the compatibility source of truth for existing imports and persisted key `sarva-production-state`.
  - Contains restaurant, owner, POS, delivery, admin, catering, studio, auth, and local feature state.

- `src/lib/cart-store.ts`
  - Existing persisted customer cart store.
  - Remains the compatibility source of truth for existing cart imports and persisted key `sarva-cart`.

- `src/stores`
  - Phase 1 modular store facade layer.
  - Provides domain entrypoints: `customer-store`, `cart-store`, `pos-store`, `delivery-store`, `owner-store`, `admin-store`, and `studio-store`.
  - Reuses the existing store instances instead of creating new Zustand stores, so selectors, persistence, hydration, and runtime behavior stay backward-compatible.
  - New feature code should prefer domain entrypoints, while existing `@/lib/app-store` and `@/lib/cart-store` imports remain valid during migration.

- `src/hooks`
  - Custom hooks for modular logic and reusable behavior.
  - Examples: `use-auth-user`, `use-public-data`, `use-restaurant-orders`, `use-realtime-order`, `use-location-commerce`.

- `src/lib/cache.ts` and `src/lib/public-cache.ts`
  - Shared cache utilities for public data and Firebase query results.
  - Helps avoid repeated reads and reduce Firebase usage.

### 3. Service Layer

- `src/services`
  - Encapsulates Firebase calls, Firestore queries, and feature adapters.
  - Keeps UI components free of direct Firebase logic.
  - Important service files:
    - `auth-service.ts`
    - `order-service.ts`
    - `menu-service.ts`
    - `delivery-service.ts`
    - `catering-service.ts`
    - `printing-service.ts`
    - `payment-service.ts`
    - `public-data-service.ts`
    - `firestore-query.ts`
    - `firestore-init-service.ts`

- `src/lib/server/*`
  - Server-only helpers for public Firestore access and cache behavior.
  - Example: `public-firestore.ts`, `public-cache.ts`.

### 4. Shared Domain Models

- `src/types/firebase.ts`
  - Firebase entity typings.
  - Shared Firestore document shapes for restaurants, menu items, orders, offers, inventory, user sessions.

- `src/lib/schemas`
  - Zod schemas for validation of checkout, menu, catering, printing, and shared form data.
  - Ensures consistent validation across routes and flows.

- `src/lib/tenant.ts`
  - Access model and tenant resolution logic for multi-restaurant / branch contexts.

- `src/lib/rbac.ts`
  - Role-based access helpers for owner, admin, delivery, and customer surfaces.

## Firebase & Backend

- `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
  - Firebase project configuration and security rules.

- `functions/`
  - Firebase Cloud Functions package used for backend integrations, admin write paths, mailing, or webhook logic.
  - `functions/src/index.ts` is the entry point.

- `scripts/`
  - Dev and deployment tooling for local emulators, HTTPS LAN serving, Firebase seeding, environment validation, and production cleanup.
  - Main scripts: `show-lan-ip.mjs`, `generate-dev-cert.mjs`, `https-dev-server.mjs`, `seed-firebase-production.mjs`, `validate-production-env.mjs`.

## User Surfaces

### Customer Workflow
- Restaurant discovery: `/`, `/restaurants`, `/restaurant/[slug]`.
- Menu browsing and item selection.
- Offers and loyalty: `/offers`, `/loyalty`.
- Checkout: `/checkout`.
- Order tracking: `/track-order`.
- Customer profile: `/profile`.

### Owner / POS Workflow
- Owner dashboard: `/owner`.
- Menu management: `/owner/menu`, `/owner/offers`, `/owner/tables`, `/owner/orders`, `/owner/inventory`, `/owner/settings`.
- POS billing: `/owner/pos`.
- Social/media studio: `/studio`, `/studio/create-post`, `/studio/templates`, `/studio/scheduled-posts`.

### Delivery & Logistics
- Delivery dashboard: `/delivery`, `/delivery/orders`, `/delivery/history`, `/delivery/reports`.
- Parcel pickup: `/parcel`.
- Catering management: `/catering`, `/catering/packages`, `/catering/requests`.

### Admin & Platform Management
- Admin login and management surfaces under `/admin`.
- Admin features include user/admin settings, restaurants, subscriptions, analytics, campaigns, and social queue.

## Design Principles

- Feature-first route organization using Next.js App Router.
- Separation of concerns: routes compose flows, flows compose UI, services handle data.
- Shared validation via Zod and centralized schemas.
- Path alias imports with `@/*` for stability.
- Progressive enhancement for PWA and mobile-first experiences.
- Firebase abstraction so UI code can switch between mock/public and authenticated / admin data.
- Migration-safe state modularization: domain store entrypoints can be adopted incrementally without changing persisted state or route behavior.

## Current Architecture Improvement Status

### Phase 1: Zustand Store Modularization

Implemented as a compatibility-first facade layer:

- `src/stores/root-store.ts` re-exports the existing root store and exported store types.
- `src/stores/cart-store.ts` re-exports the existing customer cart store and cart helpers.
- Domain store files expose typed selector entrypoints for customer, POS, owner, delivery, admin, and studio surfaces.
- `src/stores/store-utils.ts` contains the shared selector binding helper used by domain facades.

This phase intentionally does not split the live store implementation yet. That extraction can happen later behind tests once screens have migrated to domain imports.

### Runtime Surface Separation Guardrails

Recent production-safety fixes keep global runtime helpers from crossing module boundaries:

- `SyncCenterScope` mounts the offline sync center only on owner/POS routes and only for operational roles.
- `AppStartupGate` starts the offline sync engine only for owner/POS routes.
- `DashboardShell` shows offline banners only for owner/POS workspaces.
- `FirestoreStoreHydrator` skips admin and login surfaces, loads public data for customer surfaces, and attaches kitchen/inventory/loyalty listeners only for owner/POS surfaces.
- Development/test login sessions use `/api/auth/test-session` directly and do not depend on Firebase network availability.
- `/api/auth/session` supports a cookie-backed GET check so client state can hydrate from the active backend session instead of stale local role data.
- Switching between admin, owner, customer, and staff test sessions clears stale tenant / branch / restaurant cookies before creating the new session. This keeps admin, owner, and customer modules independently scoped.
- Owner/POS offline queue retries submit to `/api/owner/sync`; the backend validates the active session and applies queued writes with Firebase Admin SDK instead of relying on client Firestore write permissions.
- `public-cache.ts` now consumes slow public Firestore loader failures without unhandled promise rejections. Public routes still return their configured fallback response while background refresh failures are logged.
- Owner surfaces no longer subscribe to public restaurant/menu/offer listeners. This prevents owner-edited profile, restaurant, and offer state from being overwritten by customer/public snapshots after login.
- Image uploads are Cloudinary-backed. `/api/cloudinary/signature` signs uploads server-side, `CloudinaryUploadWidget` provides crop/upload UI, and menu, offer, CMS, profile, and social post image flows store Cloudinary URLs instead of Firebase Storage paths. Firebase Storage remains only in diagnostics/client plumbing and is not used for product image writes.

Admin, owner, and customer modules should remain independently routable. Shared client helpers must be scoped by route and role before subscribing to Firebase, offline queues, or operational listeners.

### Owner/POS Operational Updates

- Owner profile and offer writes persist through the store and now save first through `/api/owner/profile` and `/api/owner/offers`, which use Firebase Admin SDK after validating the owner/manager session. Client Firestore writes remain a fallback, and local persisted state remains the offline fallback.
- The shared dashboard header in `components/layout/dashboard-topbar.tsx` is the canonical owner/POS header and is rendered by `DashboardShell` for `/owner`, `/owner/*`, and `/owner/pos`. It provides compact product branding, inline breadcrumb chips, global debounced search, live operational chips, notifications, sound mute, fullscreen, and the profile/settings/logout menu. POS screens should not render a second top header; POS may keep its compact operational sidebar for New Order, Active Orders, Hold Orders, Past Orders, and Customers.
- The owner overview (`/owner`) is a live operations control center, not a reporting-only page. Active orders, kitchen queue, delayed alerts, staff activity, sync health, and quick actions stay above low-priority analytics.
- Owner dashboard widget visibility and ordering are stored locally under `sarva-owner-dashboard-prefs:v2` as a migration-safe customization layer. Database persistence can be added later without changing widget component contracts.
- POS cart UI is wizard-oriented: setup, food selection, and preview/confirmation. Selected items remain editable before billing or kitchen submission, with a wider cart panel and compact line rows.
- Employee management now uses a four-step owner wizard: basic information, RBAC role/permissions, branch assignment, and payroll setup. Staff records support login metadata and payroll estimate fields while remaining backward compatible with existing staff rows.
- Payroll estimate logic lives in `src/lib/payroll.ts` and is intentionally configurable/estimate-based; statutory deductions should be reviewed by the restaurant accountant before filing.
- Accounting now exposes daily transactions, report catalog, ledger, cashbook, GST, tax summary, and employee payroll report tabs using existing table/export components.

## Existing Documentation

This repository already includes deep documentation in `docs/` for:
- `docs/developer-guide.md`
- `docs/architecture-audit.md`
- `docs/frontend-flows.md`
- `docs/firestore-schema.md`
- `docs/firebase-setup.md`
- `docs/pwa-strategy.md`
- `docs/routing.md`
- `docs/state-management.md`
- `docs/social-commerce.md`

Use `docs/developer-guide.md` and `docs/architecture-audit.md` as the canonical starting points for future enhancements.

## Recommended Reference Map

- Route entrypoints: `src/app`
- Shared UI / primitives: `src/components`
- Composite flows: `src/components/flows`
- Client state compatibility root: `src/lib/app-store.ts`
- Domain state entrypoints: `src/stores`
- Customer cart compatibility root: `src/lib/cart-store.ts`
- Service layer: `src/services`
- Validation schemas: `src/lib/schemas`
- Type definitions: `src/types`
- Firebase backend: `functions/`
- Static assets / PWA: `public/`
- Dev tooling: `scripts/`

---

Created as a project architecture reference for the `Sarva Food App` repository.
