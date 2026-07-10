# Final Performance Report

Date: 2026-07-10T07:08:25.318Z

This final report pack consolidates Phase 2, Phase 3, and the 2026-07-08 certification hotfix measurements. Business workflows, API contracts, Firestore collections, auth flows, and provider contracts remain backward compatible.

## Root Cause Summary

| Area | Finding | Final action |
| --- | --- | --- |
| Startup JS | Route-owned shared customer/profile/owner chunks remain the largest production risk. | Phase 2 removed eager Firebase/Auth/Stack/XLSX/Mapbox ownership from critical initial routes where safe. |
| Runtime CPU | POS search/category and Kitchen filter/reconciliation paths were the highest repeat-interaction risks. | Phase 3 added debouncing, precomputation, memoized cards/grids, stable refs, and Kitchen reconciliation/windowing. |
| Hydration | Profile and settings surfaces owned action/tab-only code too early. | Toast, preferences, Mapbox, Cloudinary, push, fullscreen, and loyalty code now load only when needed. |
| Browser proof | Flame graphs, Coverage, FPS, INP, and real heap growth remain unmeasured locally. | Manual production Chrome profiling is required after Hostinger redeploy. |

## Route Budget Snapshot

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

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 459 KB | 250 KB | Over |
| /profile | 548 KB | 250 KB | Over |
| /owner | 569 KB | 350 KB | Over |
| /owner/orders | 1243 KB | 500 KB | Over |
| /owner/settings | 683 KB | 300 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.90ms | 1.84ms | 4.94ms | <100ms update |
| Kitchen snapshot reconciliation | 0.08ms | 0.17ms | 0.99ms | <100ms update |
| POS 1000-item category switch | 0.28ms | 0.55ms | 0.83ms | <50ms switch |
| POS 1000-item search filter | 0.37ms | 0.66ms | 1.71ms | debounced |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
