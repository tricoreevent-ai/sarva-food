# Advanced Menu System

Food Gedi's restaurant menu engine extends the existing Firebase and Zustand architecture instead of replacing it. The owner menu surface now models categories, cuisines, dual menus, GST, modifiers, combos, inventory signals, QR menus, translations, imports, and analytics from one operational screen.

## Firestore Architecture

Primary collections are `restaurants`, `branches`, `menuCategories`, `cuisines`, `menus`, `menuVariants`, `modifierGroups`, `inventory`, `taxSettings`, `comboOffers`, `menuSchedules`, `orders`, and reports documents. Queries are branch-aware where stock or tax settings differ by outlet. Menu listeners are capped and ordered by `sortOrder` to control Firebase cost.

Writes go through typed collection helpers and safe service functions in `src/services/advanced-menu-service.ts`. The service validates categories, cuisines, tax setup, inventory, combos, and bulk price updates before writing. Real-time listeners are scoped to restaurant or restaurant plus branch.

## Menu Workflow

Owners manage unlimited categories independently from cuisines. Categories control display order, banners, active state, and schedules. Cuisines are tags used for discovery and filtering.

Menu items support images, descriptions, preparation time, food type, spice level, tags, allergens, translations, modifiers, add-ons, recipe links, schedules, and per-channel visibility.

## Dual Menu Logic

The engine treats `dine-in`, `parcel`, and `delivery` as separate commerce channels. Each channel can have a separate price, tax rate, packing charge, visibility, availability, and offer code. Delivery is the public customer menu, while dine-in remains POS and table-order focused.

The helper `cloneMenuForChannel` copies pricing from one channel to another without destroying independent channel configuration.

## Indian GST Workflow

Tax settings support GST enablement, GSTIN validation, inclusive or exclusive pricing, CGST, SGST, IGST, service charge, packing charge, and default SAC `996331`.

`calculateRestaurantTax` stores tax-ready order totals:
- taxable amount
- packing charge
- service charge
- CGST
- SGST
- IGST
- total GST
- invoice total

GST validation blocks invalid GSTIN state codes and mismatched tax splits.

## Inventory Linkage

Menu items can link recipes to inventory ingredients with quantity and unit. The engine can mark items sold out when required stock falls below recipe quantity. Inventory supports stock quantity, reorder level, low-stock status, and branch linkage.

## Combo Logic

Combos store item IDs, bundle price, discount, and active state. Validation prevents discounts greater than the bundle price. The UI prepares combo cards for family packs, meal bundles, and dynamic offer logic.

## Modifier System

Modifiers are grouped with required/optional flags, min/max selection, and price-adjusted options. Validation prevents negative pricing and invalid min/max rules. Simple owner entry accepts `Name:Price` tokens and maps them into structured option groups.

## Multilingual Architecture

Menu item and category translations support Hindi and Malayalam now, with Tamil, Kannada, and Arabic prepared in shared dictionaries. The app keeps English as the canonical field and stores translated names/descriptions alongside menu documents.

## Validation Strategy

Forms use Zod and React Hook Form. Shared validators cover GSTIN, prices, tax percentages, stock quantities, phone numbers, email, branch names, delivery radius, categories, modifier pricing, inventory, import rows, and combo rules. The store also prevents duplicate category and cuisine names.

## Import, QR, And Analytics

CSV/Excel import uses row-level validation with duplicate detection and an error summary before applying changes. QR payload helpers produce dine-in, delivery, parcel, and table menu links. Analytics cards prepare bestselling, low-performing, high-margin, reorder frequency, and profitability views without overbuilding AI features.
