# Final Performance Report

Date: 2026-07-16T05:56:03.220Z

This final report pack consolidates Phase 2, Phase 3, Active Orders, image delivery, observability, and Phase 4C push/payment readiness measurements. Business workflows, Firestore collections, auth flows, and provider contracts remain backward compatible.

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
| / | 17 | 462 KB | 192 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 192 KB | - | Tracked |
| /checkout | 26 | 589 KB | 192 KB | - | Tracked |
| /orders | 20 | 513 KB | 192 KB | - | Tracked |
| /profile | 23 | 553 KB | 192 KB | 250 KB | Over |
| /owner | 27 | 579 KB | 192 KB | 350 KB | Over |
| /owner/orders | 32 | 708 KB | 192 KB | 500 KB | Over |
| /owner/settings | 31 | 694 KB | 192 KB | 300 KB | Over |
| /owner/kitchen | 30 | 655 KB | 192 KB | - | Tracked |
| /owner/pos | 28 | 584 KB | 192 KB | - | Tracked |
| /admin | 21 | 503 KB | 192 KB | - | Tracked |

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 462 KB | 250 KB | Over |
| /profile | 553 KB | 250 KB | Over |
| /owner | 579 KB | 350 KB | Over |
| /owner/orders | 708 KB | 500 KB | Over |
| /owner/settings | 694 KB | 300 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.38ms | 0.48ms | 1.66ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.05ms | 0.32ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.11ms | 0.25ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.16ms | 0.46ms | debounced |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
