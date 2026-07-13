# Design System

## Tokens

Tokens live in `app/globals.css` as CSS variables and Tailwind theme values.

Color roles:

- `background`: warm off-white application canvas.
- `foreground`: high-contrast ink text.
- `card`: white surfaces.
- `primary`: teal for main actions and active navigation.
- `secondary`: saffron for warm highlights and offers.
- `accent`: tomato for Instagram and promotional moments.
- `success`: completed/open states.
- `warning`: stock, preorder, and attention states.
- `info`: analytics and neutral system highlights.
- `destructive`: error and removal actions.

## Typography

The app uses Geist through `next/font`.

Scale:

- Page titles: `text-2xl` to `text-5xl` depending on surface.
- Section headings: `text-lg` to `text-3xl`.
- Body: `text-sm` to `text-base` with `leading-6` or `leading-7`.
- Compact labels: `text-xs` uppercase only for metadata, never core instructions.

## Spacing

Common rhythm:

- Page padding: `py-5 sm:py-8`.
- Container: `container-page` with max width `1180px`.
- Cards: `p-4` to `p-5`.
- Dashboard gaps: `gap-4` and `gap-6`.
- Touch targets: primary controls use `h-10` to `h-12`.

## Radius and Surfaces

- Cards and tool surfaces use `rounded-lg`, equivalent to 8px.
- Buttons use `rounded-md`.
- Sections remain full-width or unframed; cards are used for repeated items and tools.

## Components

Reusable system patterns:

- Buttons with `default`, `secondary`, `accent`, `outline`, `ghost`, `premium`, and `destructive`.
- Badges with channel and status variants.
- Cards for repeated restaurant, food, template, stats, package, and ticket items.
- Sheets for mobile navigation and cart drawer.
- Dialogs for focused create/edit forms.
- Tabs for internal states like live orders and restaurant detail.
- Tables for admin, inventory, subscriptions, delivery history, and request queues.
- Skeletons and empty states for loading and no-data UI.

## Motion

Motion is subtle and performance-friendly:

- `FoodItemCard` tap scale.
- `StatsCard` small entrance fade.
- No large background animation or decorative motion.

## Accessibility

- Radix handles focus for dialogs and sheets.
- Inputs include `Label`.
- Icon-only buttons use `aria-label`.
- Timeline uses ordered list semantics.
- Table data remains real table markup.
- Color status is paired with text badges.
