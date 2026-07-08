# Final Bundle Report

Date: 2026-07-08T10:50:32.956Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 455 KB | 190 KB | 250 KB | Over |
| /restaurants | 20 | 492 KB | 190 KB | - | Tracked |
| /checkout | 25 | 580 KB | 190 KB | - | Tracked |
| /orders | 20 | 504 KB | 190 KB | - | Tracked |
| /profile | 23 | 544 KB | 190 KB | 250 KB | Over |
| /owner | 24 | 556 KB | 190 KB | 350 KB | Over |
| /owner/orders | 35 | 1188 KB | 190 KB | 500 KB | Over |
| /owner/settings | 28 | 667 KB | 190 KB | 300 KB | Over |
| /owner/kitchen | 27 | 636 KB | 190 KB | - | Tracked |
| /owner/pos | 25 | 560 KB | 190 KB | - | Tracked |
| /admin | 21 | 494 KB | 190 KB | - | Tracked |

## Remaining Route JS Risk

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 455 KB | 250 KB | Over |
| /profile | 544 KB | 250 KB | Over |
| /owner | 556 KB | 350 KB | Over |
| /owner/orders | 1188 KB | 500 KB | Over |
| /owner/settings | 667 KB | 300 KB | Over |

## Dependency Notes

| Dependency area | Status |
| --- | --- |
| Firebase/Auth/Stack | Critical customer/profile/POS initial ownership reduced in Phase 2; auth routes still intentionally own auth code. |
| Mapbox | Removed from checked non-map initial route ownership; settings/location map code is tab/action loaded. |
| XLSX | Import/export tooling remains action-loaded for owner/admin menu library paths. |
| react-hot-toast | Owner/admin/profile action paths use lazy toast facade where touched. |
| lucide/framer-motion/shared chunks | Still present where UI surfaces use them; replacing them was not attempted because it would risk visual/interaction regressions before production smoke. |

## Firebase Warning

The remaining Firebase/protobuf dynamic dependency warning is documented as an upstream SDK bundling pattern in the Firebase Admin/Firestore/protobuf dependency path. The application already keeps Firebase client startup behind config/accessor boundaries where touched; resolving the build warning would require an upstream dependency change or replacing Firebase internals, so it remains an accepted release warning.
