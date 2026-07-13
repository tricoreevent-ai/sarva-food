# Bundle Deep Analysis

Date: 2026-07-13T06:23:52.044Z
Branch: `release/production-nammude`
Analyzer: `.next/analyze/client.html`

## Summary

| Metric | Value |
| --- | --- |
| Client analyzer size | 1539 KB |
| Static JS total | 8776 KB |
| Static CSS total | 190 KB |
| App routes with client manifests | 102 |
| Largest tracked route warning | `/owner/orders` remains 1246 KB against the 1200 KB verification budget. |

## Largest 20 Route JS Owners

| Route | JS | CSS | Chunks |
| --- | --- | --- | --- |
| /handler/[...stack] | 1968 KB | 190 KB | 32 |
| /owner/orders | 1246 KB | 190 KB | 42 |
| /admin/settings/map | 1080 KB | 190 KB | 34 |
| /admin/system/firebase-diagnostics | 1076 KB | 190 KB | 33 |
| /restaurant/[slug]/item/[itemId] | 1075 KB | 190 KB | 37 |
| /restaurant/[slug]/menu | 1053 KB | 190 KB | 35 |
| /restaurant/[slug] | 1048 KB | 190 KB | 33 |
| /order/[id] | 1047 KB | 190 KB | 31 |
| /owner/menu/print | 821 KB | 190 KB | 39 |
| /owner/menu | 798 KB | 190 KB | 37 |
| /owner/settings/diagnostics | 691 KB | 190 KB | 34 |
| /owner/settings | 685 KB | 190 KB | 33 |
| /owner/kitchen | 647 KB | 190 KB | 32 |
| /owner/kitchen/history | 647 KB | 190 KB | 32 |
| /owner/tables | 641 KB | 190 KB | 32 |
| /owner/offers | 636 KB | 190 KB | 32 |
| /owner/inventory | 635 KB | 190 KB | 32 |
| /owner/accounting | 621 KB | 190 KB | 32 |
| /owner/social-posts | 615 KB | 190 KB | 33 |
| /owner/employees | 609 KB | 190 KB | 31 |

## Largest 20 Client Bundles

| Chunk | Parsed | Gzip | Initial ownership |
| --- | --- | --- | --- |
| c36f3faa.57c45a11a5cf23d9.js | 1704 KB | 460 KB | async/shared |
| 6848-1e4c70cfe2beefcc.js | 763 KB | 210 KB | app/handler/[...stack]/page |
| 3112-e2c122998d304c47.js | 575 KB | 145 KB | app/handler/[...stack]/page |
| 2170a4aa.4213bb2183c9cdf9.js | 402 KB | 136 KB | async/shared |
| 02df5fe5-df6f3a0af0949c2e.js | 260 KB | 77 KB | app/owner/orders/page, app/order/[id]/page, app/restaurant/[slug]/page |
| 3794-ba2500baa4c52d55.js | 218 KB | 59 KB | main-app |
| 4bd1b696-e356ca5ba0218e27.js | 195 KB | 61 KB | main-app |
| framework-b8f729f35b3f9ad7.js | 185 KB | 58 KB | main |
| 3547.328db1fdc9b7e673.js | 167 KB | 42 KB | async/shared |
| main-4b016b7dba122094.js | 130 KB | 38 KB | main |
| 5897.c6c0a7c722690e7b.js | 124 KB | 39 KB | async/shared |
| app/restaurant/[slug]/page-482aca82218ca0fb.js | 124 KB | 34 KB | app/restaurant/[slug]/page |
| 2bfc466f-a10da8950bc20412.js | 121 KB | 34 KB | app/owner/orders/page, app/order/[id]/page, app/restaurant/[slug]/page |
| 1613-ac312a3fcad59d2a.js | 121 KB | 39 KB | app/account/profile/page, app/cancellation-policy/page, app/cart/page |
| 450.f7c2f4df2620efac.js | 115 KB | 24 KB | async/shared |
| app/owner/menu/page-c154759a5ea9c379.js | 112 KB | 29 KB | app/owner/menu/page |
| 7289-395830f55db93b90.js | 100 KB | 33 KB | app/owner/orders/page, app/order/[id]/page, app/restaurant/[slug]/page |
| app/owner/settings/page-6fb8ed8f2896c35f.js | 88 KB | 22 KB | app/owner/settings/page |
| 2788.86c64a1b7db3fe8a.js | 78 KB | 22 KB | async/shared |
| 9197-2c0ddabba1af63ba.js | 71 KB | 19 KB | app/account/profile/page, app/cancellation-policy/page, app/checkout/page |

## Largest 20 Client Modules

| Module | Parsed | Gzip | Chunk |
| --- | --- | --- | --- |
| node_modules/mapbox-gl/dist/mapbox-gl.js | 1704 KB | 460 KB | c36f3faa.57c45a11a5cf23d9.js |
| node_modules/xlsx/xlsx.mjs | 401 KB | 136 KB | 2170a4aa.4213bb2183c9cdf9.js |
| node_modules/@firebase/firestore/dist/common-b3e8012f.esm.js | 260 KB | 77 KB | 02df5fe5-df6f3a0af0949c2e.js |
| node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js | 195 KB | 61 KB | 4bd1b696-e356ca5ba0218e27.js |
| node_modules/react-dom/cjs/react-dom-client.production.js | 171 KB | 54 KB | framework-b8f729f35b3f9ad7.js |
| node_modules/@firebase/auth/dist/esm/index-9d184c40.js | 121 KB | 34 KB | 2bfc466f-a10da8950bc20412.js |
| src/components/flows/pos-billing-flow.tsx + 9 modules (concatenated)/src/components/flows/pos-billing-flow.tsx | 117 KB | 28 KB | 3547.328db1fdc9b7e673.js |
| node_modules/@stackframe/stack/dist/esm/providers/theme-provider.js + 3 modules (concatenated)/node_modules/@stackframe/stack/dist/esm/generated/global-css.js | 117 KB | 15 KB | 6848-1e4c70cfe2beefcc.js |
| src/components/flows/owner-menu-management-flow.tsx | 95 KB | 24 KB | app/owner/menu/page-c154759a5ea9c379.js |
| src/components/flows/restaurant-detail-flow.tsx + 1 modules (concatenated)/src/components/flows/restaurant-detail-flow.tsx | 82 KB | 21 KB | app/restaurant/[slug]/page-482aca82218ca0fb.js |
| node_modules/@stackframe/stack/dist/esm/lib/stack-app/apps/interfaces/client-app.js + 44 modules (concatenated)/node_modules/@stackframe/stack/dist/esm/lib/stack-app/apps/implementations/client-app-impl.js | 71 KB | 17 KB | 3112-e2c122998d304c47.js |
| src/components/flows/owner-settings-flow.tsx + 1 modules (concatenated)/src/components/flows/owner-settings-flow.tsx | 69 KB | 17 KB | app/owner/settings/page-6fb8ed8f2896c35f.js |
| node_modules/@stackframe/stack/dist/esm/lib/stack-app/url-targets.js + 4 modules (concatenated)/node_modules/@stackframe/stack-shared/dist/esm/interface/page-component-versions.js | 69 KB | 16 KB | 3112-e2c122998d304c47.js |
| node_modules/@stackframe/stack/dist/esm/dev-tool/dev-tool-core.js + 2 modules (concatenated)/node_modules/@stackframe/stack/dist/esm/dev-tool/dev-tool-core.js | 64 KB | 14 KB | 450.f7c2f4df2620efac.js |
| src/components/flows/kitchen-display-flow.tsx | 62 KB | 15 KB | 1062-a6a075125cbdf2a1.js |
| node_modules/@stackframe/stack-ui/dist/esm/components/data-table/data-table.js + 3 modules (concatenated)/node_modules/@tanstack/table-core/build/lib/index.mjs | 53 KB | 14 KB | 6848-1e4c70cfe2beefcc.js |
| node_modules/@stackframe/stack-shared/dist/esm/index.js + 4 modules (concatenated)/node_modules/@stackframe/stack-shared/dist/esm/interface/client-interface.js | 53 KB | 12 KB | 3112-e2c122998d304c47.js |
| node_modules/@stackframe/stack/dist/esm/dev-tool/dev-tool-core.js + 2 modules (concatenated)/node_modules/@stackframe/stack/dist/esm/dev-tool/dev-tool-styles.js | 49 KB | 10 KB | 450.f7c2f4df2620efac.js |
| src/lib/app-store.ts | 44 KB | 12 KB | 9154-4e1dbdb8a278943c.js |
| src/components/flows/owner-order-management-flow.tsx + 2 modules (concatenated)/src/components/flows/owner-order-management-flow.tsx | 43 KB | 12 KB | app/owner/orders/page-4a6bef98d7bd5e72.js |

## Largest Vendor Contributors

| Vendor | Parsed | Gzip | Modules |
| --- | --- | --- | --- |
| mapbox-gl | 1704 KB | 460 KB | 1 |
| next | 710 KB | 295 KB | 470 |
| @stackframe/stack | 539 KB | 127 KB | 103 |
| xlsx | 401 KB | 136 KB | 1 |
| lucide-react | 302 KB | 214 KB | 1285 |
| @firebase/firestore | 289 KB | 85 KB | 2 |
| @stackframe/stack-shared | 270 KB | 73 KB | 51 |
| react-dom | 174 KB | 55 KB | 4 |
| @firebase/auth | 126 KB | 36 KB | 3 |
| rrweb | 124 KB | 39 KB | 36 |
| @radix-ui/react-slot | 104 KB | 47 KB | 59 |
| motion-dom | 91 KB | 32 KB | 180 |
| @stackframe/stack-ui | 75 KB | 30 KB | 59 |
| zod | 71 KB | 21 KB | 21 |
| zustand | 69 KB | 36 KB | 81 |
| react-hot-toast | 61 KB | 24 KB | 6 |
| @tanstack/table-core | 53 KB | 14 KB | 1 |
| @firebase/webchannel-wrapper | 48 KB | 18 KB | 2 |
| tailwind-merge | 45 KB | 14 KB | 2 |
| class-variance-authority | 39 KB | 21 KB | 52 |

## Duplicate Import Sources

| Import source | Occurrences |
| --- | --- |
| react | 173 |
| lucide-react | 161 |
| @/components/ui/button | 120 |
| @/lib/types | 109 |
| @/lib/utils | 108 |
| next/server | 80 |
| @/components/ui/card | 68 |
| @/components/ui/badge | 65 |
| @/types/firebase | 65 |
| @/firebase/admin | 57 |
| @/components/layout/section-header | 49 |
| @/lib/app-store | 49 |
| next/link | 48 |
| @/lib/tenant | 46 |
| @/lib/server-auth | 44 |
| @/components/ui/input | 41 |
| @/repositories/shared | 40 |
| next/navigation | 40 |
| firebase-admin/firestore | 37 |
| server-only | 33 |

## Dependency Usage Scan

| Dependency | Static usage | Status |
| --- | --- | --- |
| @hookform/resolvers | 3 | Used by static source scan |
| @radix-ui/react-dialog | 2 | Used by static source scan |
| @radix-ui/react-popover | 1 | Used by static source scan |
| @radix-ui/react-slot | 1 | Used by static source scan |
| @radix-ui/react-tabs | 1 | Used by static source scan |
| @radix-ui/react-tooltip | 1 | Used by static source scan |
| @stackframe/stack | 2 | Used by static source scan |
| class-variance-authority | 3 | Used by static source scan |
| clsx | 1 | Used by static source scan |
| firebase | 36 | Used by static source scan |
| firebase-admin | 41 | Used by static source scan |
| framer-motion | 10 | Used by static source scan |
| lucide-react | 161 | Used by static source scan |
| mapbox-gl | 0 | Manual review before removal |
| next | 218 | Used by static source scan |
| nodemailer | 6 | Used by static source scan |
| qrcode | 1 | Used by static source scan |
| razorpay | 19 | Used by static source scan |
| react | 173 | Used by static source scan |
| react-dom | 1 | Used by static source scan |
| react-hook-form | 3 | Used by static source scan |
| react-hot-toast | 10 | Used by static source scan |
| react-map-gl | 1 | Used by static source scan |
| tailwind-merge | 1 | Used by static source scan |
| xlsx | 19 | Used by static source scan |
| zod | 13 | Used by static source scan |
| zustand | 4 | Used by static source scan |

## Verification Notes

| Check | Result |
| --- | --- |
| Previous auth-route optimization | `/login`, `/signup`, and `/forgot-password` route-owned JS dropped from about 1641 KB to about 497 KB in the PH3 report; current auth routes remain out of the largest route-owner list except Stack handler. |
| Previous public/profile split | Phase 2 reduced `/` from about 1017 KB to about 455 KB and `/profile` from about 1714 KB to about 562 KB; current `/` is 459 KB and `/profile` is 549 KB. |
| Duplicate packages | No package name is duplicated across `dependencies` and `devDependencies`. |
| Unused dependencies | No dependency is marked safe to remove from static evidence alone; low/no static-use entries require manual flow validation because this app uses dynamic imports, scripts, and provider-gated routes. |
| Accepted warning | Firebase/protobuf dynamic dependency warning remains upstream and accepted; no bundler alias or Firebase internals rewrite was attempted during release freeze. |
