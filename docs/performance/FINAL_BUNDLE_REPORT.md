# Final Bundle Report

Date: 2026-07-16T09:34:49.846Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 192 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 192 KB | - | Tracked |
| /checkout | 26 | 589 KB | 192 KB | - | Tracked |
| /orders | 20 | 514 KB | 192 KB | - | Tracked |
| /profile | 23 | 553 KB | 192 KB | 250 KB | Over |
| /owner | 27 | 583 KB | 192 KB | 350 KB | Over |
| /owner/orders | 32 | 710 KB | 192 KB | 500 KB | Over |
| /owner/settings | 31 | 697 KB | 192 KB | 300 KB | Over |
| /owner/kitchen | 30 | 660 KB | 192 KB | - | Tracked |
| /owner/pos | 28 | 587 KB | 192 KB | - | Tracked |
| /admin | 21 | 504 KB | 192 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 463 KB | 250 KB | Over |
| /profile | 553 KB | 250 KB | Over |
| /owner | 583 KB | 350 KB | Over |
| /owner/orders | 710 KB | 500 KB | Over |
| /owner/settings | 697 KB | 300 KB | Over |

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
