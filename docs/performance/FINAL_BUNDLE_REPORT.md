# Final Bundle Report

Date: 2026-07-27T08:12:25.252Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 481 KB | 193 KB | 250 KB | Over |
| /restaurants | 20 | 510 KB | 193 KB | - | Tracked |
| /checkout | 27 | 615 KB | 193 KB | - | Tracked |
| /orders | 21 | 538 KB | 193 KB | - | Tracked |
| /profile | 25 | 578 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 631 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 775 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 757 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 736 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 636 KB | 193 KB | 650 KB | Pass |
| /admin | 23 | 540 KB | 193 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 481 KB | 250 KB | Over |
| /profile | 578 KB | 250 KB | Over |
| /owner | 631 KB | 350 KB | Over |
| /owner/orders | 775 KB | 500 KB | Over |
| /owner/settings | 757 KB | 300 KB | Over |

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
