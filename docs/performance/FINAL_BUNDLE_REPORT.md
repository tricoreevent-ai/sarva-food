# Final Bundle Report

Date: 2026-07-26T13:15:01.436Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 465 KB | 199 KB | 250 KB | Over |
| /restaurants | 19 | 495 KB | 199 KB | - | Tracked |
| /checkout | 26 | 599 KB | 199 KB | - | Tracked |
| /orders | 20 | 523 KB | 199 KB | - | Tracked |
| /profile | 24 | 563 KB | 199 KB | 250 KB | Over |
| /owner | 28 | 609 KB | 199 KB | 350 KB | Over |
| /owner/orders | 33 | 747 KB | 199 KB | 500 KB | Over |
| /owner/settings | 32 | 735 KB | 199 KB | 300 KB | Over |
| /owner/kitchen | 31 | 714 KB | 199 KB | - | Tracked |
| /owner/pos | 29 | 614 KB | 199 KB | 650 KB | Pass |
| /admin | 21 | 513 KB | 199 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 465 KB | 250 KB | Over |
| /profile | 563 KB | 250 KB | Over |
| /owner | 609 KB | 350 KB | Over |
| /owner/orders | 747 KB | 500 KB | Over |
| /owner/settings | 735 KB | 300 KB | Over |

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
