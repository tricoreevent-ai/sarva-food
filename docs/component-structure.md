# Component Structure

## UI Primitives

Located in `components/ui`.

- `button.tsx`: shadcn-style variants and sizes.
- `card.tsx`: shared card, header, title, description, content, footer.
- `badge.tsx`: status, offer, warning, success, and muted labels.
- `sheet.tsx`: mobile drawers and cart drawer shell.
- `dialog.tsx`: modal pattern for forms and focused tasks.
- `tabs.tsx`: route-internal content switching.
- `input.tsx`, `textarea.tsx`, `label.tsx`: form basics.
- `table.tsx`: reusable dashboard table styling.
- `skeleton.tsx`, `progress.tsx`, `separator.tsx`: state and layout helpers.

## Layout Components

Located in `components/layout`.

- `CustomerShell`: public customer wrapper with header and mobile nav.
- `PublicHeader`: customer nav, cart entry, and ecosystem mobile sheet.
- `MobileBottomNav`: large mobile navigation for public routes.
- `DashboardShell`: shared dashboard app frame.
- `DashboardSidebar`: desktop sidebar plus mobile drawer.
- `SectionHeader`: consistent page and section titles.
- `EmptyState`: accessible empty/error placeholder pattern.

## Commerce Components

Located in `components/commerce`.

- `RestaurantCard`: listing card with image, status, cuisine, delivery time.
- `FoodItemCard`: menu item card with add-to-cart action.
- `OfferBadge`: reusable offer code label.
- `CartDrawer`: sheet-based cart with quantities and totals.
- `CheckoutSummary`: cart, totals, delivery, tax, and offer code flow.
- `OrderTimeline`: order tracking timeline with done, active, pending states.

## Dashboard Components

Located in `components/dashboard`.

- `StatsCard`: animated KPI card.
- `SimpleDataTable`: reusable table wrapper for mock data.
- `KitchenTicket`: owner kitchen ticket pattern.
- `MenuEditorDialog`: modal form pattern for menu editing.

## Studio Components

Located in `components/studio`.

- `SocialTemplateCard`: template selection card.
- `PostPreviewCard`: feed/story preview card with action buttons.

## Form Components

Located in `components/forms`.

- `CheckoutForm`: React Hook Form plus Zod validation.
- `OtpForm`: delivery OTP verification placeholder.

## Data and State

Located in `lib`.

- `mock-data.ts`: centralized restaurants, menu items, offers, stats, orders, templates, packages.
- `navigation.ts`: app-specific navigation arrays.
- `cart-store.ts`: small Zustand cart store with persisted browser state.
- `types.ts`: shared TypeScript types.
- `utils.ts`: `cn`, currency formatting, slug helpers.
