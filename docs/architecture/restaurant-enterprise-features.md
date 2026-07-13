# Restaurant Enterprise Features

This document records the production-readiness coverage added on top of the existing Nammude architecture. The implementation stays incremental: persisted mock state models the workflows now, while Firebase collections and Cloud Functions can replace the mock store later.

## Operational Workflows

Customer flow supports discovery, quick checkout, dine-in/takeaway/delivery-ready order modes, payment options, social offer links, lightweight profile, saved address placeholders, order history, reorder, call restaurant, and realtime-style tracking pages.

Owner operations cover menu management, offers, table ordering, KDS, printer settings, inventory hooks, reports, digital signage, and onboarding gates. Owner tools are mobile/tablet oriented with cards, sticky actions, and touch-sized buttons.

## Waiter Flow

Waiter operations use `/owner/tables`:

1. Select table.
2. Select waiter mobile mode.
3. Add menu items.
4. Confirm order and send KOT.
5. Auto-print if enabled.
6. Kitchen updates order status.
7. Waiter marks served.
8. Cashier generates bill.
9. Split/merge bill actions are surfaced as architecture hooks.

Statuses are `vacant`, `occupied`, `preparing`, `ready`, `served`, and `billed`.

## KDS Flow

The Kitchen Display System receives table orders from shared state. It provides priority sorting, large cards, fullscreen mode, order timers, modifiers, allergy notes, and touch controls. Status changes are optimistic and can later sync through Firebase realtime listeners.

## Printer Flow

Printer support is browser-print first:

- kitchen ticket printing
- billing receipt printing
- auto print option
- compact thermal layout
- test print
- separated kitchen and billing printers
- multiple printer profiles
- ESC/POS placeholder profile

Future printer bridges should subscribe to the same KOT and billing events.

## Menu System

Menu management supports add, edit, delete, image upload preview, category, pricing, availability, sold-out state, modifiers, and add-ons. Printable menu output is available through the premium A4 two-column menu template with branding and bordered sections.

## Digital Signage

The digital menu supports TV, monitor, and tablet display with fullscreen mode, landscape/portrait layout, resolution selector, slideshow banners, QR ordering, font scaling, layout scaling, and theme selection.

## Offer And Loyalty Hooks

Offers support coupon code, flat/percentage architecture, validity, category restriction, banner, channel, and dine-in/delivery/takeaway applicability. Loyalty points, VIP customers, gamification, and one-click reorder are represented as hooks, not full systems.

## Staff Roles

Operational roles are modeled as owner, manager, cashier, waiter, chef, and delivery staff. Each staff member has branch, status, permissions, and activity tracking. Admin modules remain separate from operational staff navigation.

## Reporting Structure

Reports cover:

- daily sales summary
- order reports
- item popularity
- dine-in revenue
- delivery performance
- waiter performance
- kitchen speed placeholder
- GST/tax liability
- sales journal
- food cost percentage placeholder
- gross profit and P&L hooks

Exports use browser PDF print and CSV/Excel download.

Every transaction stores timestamp, user ID, payment method, tax data, branch/location data, order ID, and type.

## Accounting Architecture

The transaction model is accounting-ready for sales journal, expense report, GST liability, gross profit, food cost percentage, P&L, cash flow, and balance sheet architecture. Deep ledger posting is intentionally deferred until payment and inventory sources are real.

## Inventory Roadmap

Inventory state includes stock, unit, reorder level, supplier, branch, low-stock alerts, recipe deduction placeholders, and supplier purchase drafts. Future work can add recipe-based deduction, variance, and purchase automation without changing the page structure.

## Multi-Branch Roadmap

Branch state supports branch-specific menus, printers, reports, staff, and centralized owner dashboard summaries. The model avoids duplicating restaurant data and scopes operational records by `branchId`.

## Offline Strategy

Offline-safe placeholders include cached menu intent, optimistic updates, and retry queue state for KDS, POS, billing, and order updates. Critical actions can queue locally and replay once Firebase/network connectivity returns.

## Social Commerce

The flow remains:

Owner creates post -> Admin approves -> Nammude social account publishes -> Customer clicks deep link -> Food page opens -> Offer auto applies -> Fast checkout.
