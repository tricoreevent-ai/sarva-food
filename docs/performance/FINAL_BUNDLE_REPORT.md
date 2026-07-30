# Final Bundle Report

Date: 2026-07-30T11:52:26.491Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 487 KB | 194 KB | 250 KB | Over |
| /restaurants | 21 | 521 KB | 194 KB | - | Tracked |
| /checkout | 27 | 622 KB | 194 KB | - | Tracked |
| /orders | 21 | 547 KB | 194 KB | - | Tracked |
| /profile | 25 | 586 KB | 194 KB | 250 KB | Over |
| /owner | 28 | 643 KB | 194 KB | 350 KB | Over |
| /owner/orders | 33 | 792 KB | 194 KB | 500 KB | Over |
| /owner/settings | 32 | 769 KB | 194 KB | 300 KB | Over |
| /owner/kitchen | 31 | 756 KB | 194 KB | - | Tracked |
| /owner/pos | 29 | 648 KB | 194 KB | 650 KB | Pass |
| /admin | 23 | 546 KB | 194 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 487 KB | 250 KB | Over |
| /profile | 586 KB | 250 KB | Over |
| /owner | 643 KB | 350 KB | Over |
| /owner/orders | 792 KB | 500 KB | Over |
| /owner/settings | 769 KB | 300 KB | Over |

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
