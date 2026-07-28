# Food Gedi Branding Audit

Generated: 2026-07-28T07:23:07.951Z

## Summary

- Brand config: completed
- Brand resolver/provider: completed
- Brand components: completed
- Actionable old-brand public hits: 0
- Documented compatibility old-brand hits: 10
- Direct asset references outside brand layer: 0
- Nested SVG image/currentColor dependencies: 0

## Root Cause Closed

The visible text + blank icon defect came from wrapper SVG assets that used nested `<image href="/icons/...">` references. Those wrappers reserve layout space but the nested SVG/image is not reliably rendered when the wrapper is loaded through `<img>`/`next/image`, so Customer and Owner headers could show only the wordmark. RC6.1 replaces the Food Gedi SVG family with self-contained vector geometry and renders the primary header icon as inline SVG paths.

## Surface Inventory

| Surface | API | Background | Status |
| --- | --- | --- | --- |
| Header / Navbar | BrandLogo + compact header mark | light | surface-aware component |
| Sidebar | BrandLogo sidebar/compact | light | shared component |
| Login / Auth | BrandLogo | light panel | shared component |
| Customer website | BrandLogo / BrandIcon | light | shared component |
| Owner / Admin shell | BrandLogo | light | owner design system |
| Kitchen / POS | BrandLogo / BrandIcon | light and utility states | shared component |
| Splash / Loading | LoadingLogo | auto | dedicated loading icon |
| Empty states | BrandIllustration | light | configured illustration |
| Browser tab | getFavicon | n/a | manifest/layout metadata |
| PWA icons | BrandAssets.pwa | maskable/any | manifest |
| Notifications | getNotificationIcon | n/a | browser + FCM webpush |
| Receipts / invoices / print | getLogoForBackground('print') | print | black/print-safe assets |
| OpenGraph / Twitter | BrandAssets.social | n/a | metadata |
| High contrast | getLogoForBackground('high-contrast') | high contrast | explicit asset |

## Required asset checks

| Asset | Status |
| --- | --- |
| src/config/branding.ts | completed |
| src/lib/brand-system.ts | completed |
| src/components/brand/brand-provider.tsx | completed |
| src/components/brand/brand-logo.tsx | completed |
| src/app/manifest.ts | completed |
| public/icons/food-gedi-icon.svg | completed |
| public/icons/food-gedi-icon-white.svg | completed |
| public/icons/food-gedi-icon-black.svg | completed |
| public/icons/food-gedi-icon-small.svg | completed |
| public/icons/food-gedi-loading-icon.svg | completed |
| public/brand/food-gedi-logo.svg | completed |
| public/brand/food-gedi-logo-white.svg | completed |
| public/brand/food-gedi-logo-black.svg | completed |
| public/brand/food-gedi-logo-high-contrast.svg | completed |
| public/brand/food-gedi-logo-print.svg | completed |
| public/brand/food-gedi-logo-text.svg | completed |
| public/brand/food-gedi-logo-text-white.svg | completed |
| public/brand/food-gedi-logo-small.svg | completed |
| public/brand/food-gedi-logo-animated.svg | completed |
| public/favicon.ico | completed |
| public/apple-touch-icon.png | completed |
| public/android-chrome-192x192.png | completed |
| public/android-chrome-512x512.png | completed |
| public/android-chrome-maskable-512.png | completed |

## Direct Asset Containment

| File | Line | Status |
| --- | ---: | --- |
| scripts\brand-audit.mjs | 22 | contained |
| scripts\brand-audit.mjs | 23 | contained |
| scripts\brand-audit.mjs | 24 | contained |
| scripts\brand-audit.mjs | 86 | contained |
| src\components\brand\brand-logo.tsx | 138 | contained |
| src\components\brand\brand-logo.tsx | 139 | contained |
| src\components\brand\brand-logo.tsx | 140 | contained |
| src\components\brand\brand-logo.tsx | 141 | contained |
| src\lib\brand-system.ts | 19 | contained |
| src\lib\brand-system.ts | 20 | contained |
| src\lib\brand-system.ts | 21 | contained |
| src\lib\brand-system.ts | 22 | contained |
| src\lib\brand-system.ts | 23 | contained |
| src\lib\brand-system.ts | 24 | contained |
| src\lib\brand-system.ts | 25 | contained |
| src\lib\brand-system.ts | 26 | contained |
| src\lib\brand-system.ts | 27 | contained |
| src\lib\brand-system.ts | 28 | contained |
| src\lib\brand-system.ts | 29 | contained |
| src\lib\brand-system.ts | 30 | contained |
| src\lib\brand-system.ts | 31 | contained |
| src\lib\brand-system.ts | 32 | contained |
| src\lib\brand-system.ts | 35 | contained |
| src\lib\brand-system.ts | 36 | contained |
| src\lib\brand-system.ts | 37 | contained |
| src\lib\brand-system.ts | 38 | contained |
| src\lib\brand-system.ts | 39 | contained |
| src\lib\brand-system.ts | 40 | contained |
| src\lib\brand-system.ts | 41 | contained |
| src\lib\brand-system.ts | 42 | contained |
| src\lib\brand-system.ts | 43 | contained |
| src\lib\brand-system.ts | 44 | contained |
| src\lib\brand-system.ts | 45 | contained |
| src\lib\brand-system.ts | 46 | contained |
| src\lib\brand-system.ts | 49 | contained |
| src\lib\brand-system.ts | 50 | contained |
| src\lib\brand-system.ts | 51 | contained |
| src\lib\brand-system.ts | 52 | contained |
| src\lib\brand-system.ts | 53 | contained |
| src\lib\brand-system.ts | 54 | contained |
| src\lib\brand-system.ts | 57 | contained |
| src\lib\brand-system.ts | 58 | contained |
| src\lib\brand-system.ts | 78 | contained |
| src\lib\brand-system.ts | 93 | contained |
| src\lib\brand-system.ts | 109 | contained |
| src\lib\brand-system.ts | 110 | contained |
| src\lib\brand-system.ts | 111 | contained |
| src\lib\brand-system.ts | 112 | contained |
| src\lib\brand-system.ts | 113 | contained |
| src\lib\brand-system.ts | 114 | contained |
| src\lib\brand-system.ts | 115 | contained |
| src\lib\brand-system.ts | 116 | contained |
| src\lib\brand-system.ts | 117 | contained |
| src\lib\brand-system.ts | 118 | contained |

## SVG Render-Safety Scan

| Rule | Status |
| --- | --- |
| No nested `<image href>` in Food Gedi SVG assets | completed |
| No `currentColor` dependency in Food Gedi SVG assets | completed |

## Legacy reference scan

| Old Brand | File | Line | Replacement | Status |
| --- | --- | ---: | --- | --- |
| nammude | scripts\release\release-report.md | 6 | Food Gedi public brand or documented compatibility namespace | release-branch |
| nammude | scripts\release\release-report.md | 34 | Food Gedi public brand or documented compatibility namespace | release-branch |
| nammude | scripts\release\performance-phase3-reports.mjs | 361 | Food Gedi public brand or documented compatibility namespace | release-branch |
| nammude | scripts\release\performance-phase3-reports.mjs | 433 | Food Gedi public brand or documented compatibility namespace | release-branch |
| nammude | src\components\forms\checkout-form.tsx | 58 | Food Gedi public brand or documented compatibility namespace | compatibility-namespace |
| nammude | src\components\flows\table-qr-ordering-flow.tsx | 38 | Food Gedi public brand or documented compatibility namespace | compatibility-namespace |
| nammude | src\components\flows\table-qr-ordering-flow.tsx | 454 | Food Gedi public brand or documented compatibility namespace | compatibility-namespace |
| nammude | src\lib\release.ts | 1 | Food Gedi public brand or documented compatibility namespace | release-branch |
| nammude | src\lib\schedule-slots.ts | 4 | Food Gedi public brand or documented compatibility namespace | compatibility-namespace |
| nammude | src\lib\server\secret-box.ts | 13 | Food Gedi public brand or documented compatibility namespace | compatibility-namespace |
