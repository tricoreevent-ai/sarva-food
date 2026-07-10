# Final Bundle Report

Date: 2026-07-10T07:08:25.318Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 459 KB | 190 KB | 250 KB | Over |
| /restaurants | 19 | 492 KB | 190 KB | - | Tracked |
| /checkout | 26 | 585 KB | 190 KB | - | Tracked |
| /orders | 20 | 509 KB | 190 KB | - | Tracked |
| /profile | 23 | 548 KB | 190 KB | 250 KB | Over |
| /owner | 27 | 569 KB | 190 KB | 350 KB | Over |
| /owner/orders | 40 | 1243 KB | 190 KB | 500 KB | Over |
| /owner/settings | 31 | 683 KB | 190 KB | 300 KB | Over |
| /owner/kitchen | 29 | 644 KB | 190 KB | - | Tracked |
| /owner/pos | 28 | 574 KB | 190 KB | - | Tracked |
| /admin | 21 | 499 KB | 190 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 459 KB | 250 KB | Over |
| /profile | 548 KB | 250 KB | Over |
| /owner | 569 KB | 350 KB | Over |
| /owner/orders | 1243 KB | 500 KB | Over |
| /owner/settings | 683 KB | 300 KB | Over |

## Dependency Notes

| Dependency area | Status |
| --- | --- |
| Firebase/Auth/Stack | Critical customer/profile/POS initial ownership reduced in Phase 2; auth routes still intentionally own auth code. |
| Mapbox | Removed from checked non-map initial route ownership; settings/location map code is tab/action loaded. |
| XLSX | Import/export tooling remains action-loaded for owner/admin menu library paths. |
| react-hot-toast | Owner/admin/profile action paths use lazy toast facade where touched. |
| lucide/framer-motion/shared chunks | Still present where UI surfaces use them; replacing them was not attempted because it would risk visual/interaction regressions before production smoke. |

## Firebase Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
