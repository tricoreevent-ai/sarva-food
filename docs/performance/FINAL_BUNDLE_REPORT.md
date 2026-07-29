# Final Bundle Report

Date: 2026-07-29T02:26:24.876Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 487 KB | 194 KB | 250 KB | Over |
| /restaurants | 20 | 516 KB | 194 KB | - | Tracked |
| /checkout | 27 | 620 KB | 194 KB | - | Tracked |
| /orders | 21 | 546 KB | 194 KB | - | Tracked |
| /profile | 25 | 584 KB | 194 KB | 250 KB | Over |
| /owner | 28 | 647 KB | 194 KB | 350 KB | Over |
| /owner/orders | 33 | 790 KB | 194 KB | 500 KB | Over |
| /owner/settings | 32 | 773 KB | 194 KB | 300 KB | Over |
| /owner/kitchen | 31 | 754 KB | 194 KB | - | Tracked |
| /owner/pos | 29 | 652 KB | 194 KB | 650 KB | Over |
| /admin | 23 | 546 KB | 194 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 487 KB | 250 KB | Over |
| /profile | 584 KB | 250 KB | Over |
| /owner | 647 KB | 350 KB | Over |
| /owner/orders | 790 KB | 500 KB | Over |
| /owner/settings | 773 KB | 300 KB | Over |
| /owner/pos | 652 KB | 650 KB | Over |

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
