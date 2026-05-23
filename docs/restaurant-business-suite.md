# Restaurant Business Suite

Sarva Food now has production-oriented foundations for restaurant commerce, operations, accounting, inventory, loyalty, multilingual UX, and theming. The work remains incremental and keeps Firebase/service boundaries intact.

## Theme Architecture

The app uses CSS variables with light, dark, and system detection through `ThemeProvider`. Customer surfaces remain warm and food-forward, while owner/admin shells use operational command-center styling. Theme preference persists in local storage.

## i18n Architecture

`I18nProvider` centralizes dictionaries and exposes `useI18n`. English, Hindi, and Malayalam are active. Tamil, Kannada, and Arabic can be added by extending dictionaries. The architecture sets `lang` and includes an RTL-ready `dir` hook.

## Parcel Flow

Parcel pickup lives at `/parcel` and supports menu-driven takeaway checkout, parcel pickup statuses, and ready-notification placeholders. Checkout can receive `orderType=parcel` for future POS/counter handling.

## Delivery Workflow

Delivery staff use the delivery dashboard for assigned orders, accept/reject, pickup, on-the-way, delivered, and failed states. Route optimization, live location, ETA, distance, and driver performance hooks are surfaced without external API implementation.

## Loyalty Flow

The loyalty module tracks points, tiers, customer lifetime value, order frequency, inactive-risk detection, birthday coupon placeholders, referral hooks, and one-click reorder readiness. Advanced gamification is intentionally deferred.

## Inventory Workflow

Inventory supports ingredients, units, branch stock, low-stock alerts, supplier mapping, purchase drafts, stock inward/outward hooks, recipe/BOM deduction placeholders, wastage, and variance placeholders.

## Supplier Workflow

Suppliers have category, phone, and payment terms. Purchase orders can be drafted from low stock and later converted to inward stock entries and supplier payment records.

## Accounting Workflow

The accounting module includes chart of accounts, income, expenses, cash/bank tracking, GST/tax liability, sales journal, P&L hooks, cash flow hooks, and balance sheet architecture.

Every transaction is branch-aware and stores timestamp, user, branch, payment method, tax data, source order, and type.

## Financial Reporting Structure

Reports support daily sales journal, transaction ledger, GST/tax liability, expenses, gross profit, food cost percentage, P&L, cash flow, and balance sheet placeholders. Export patterns use browser print/PDF and CSV/Excel hooks.

## QR Ordering Flow

Table operations include dynamic QR hooks per table. Customer self-order QR, waitlist, reservation, and preorder placeholders are shown in the waiter workflow.

## Multi-Branch Accounting Strategy

Branches scope staff, inventory, printers, transactions, expenses, and reports by `branchId`. Central owner dashboards aggregate branch metrics without duplicating restaurant records.

## Aggregator Strategy

Swiggy, Zomato, UberEats, and DoorDash are modeled as sync hooks on the unified order dashboard. External orders can later tag source and flow into the same KDS, printer, reports, and accounting models.

## Offline And Reliability

Critical restaurant actions can queue through the offline placeholder model for KDS, POS, billing, and order updates. Optimistic UI and retry queues are ready for Firebase-backed replay.
