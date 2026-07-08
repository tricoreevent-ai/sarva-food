# Final Performance Report

Date: 2026-07-08T10:50:32.956Z

This final report pack consolidates Phase 2 and Phase 3 measurements. No business workflow, API contract, Firestore collection, schema, auth flow, payment flow, or UI redesign change is included.

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

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 455 KB | 250 KB | Over |
| /profile | 544 KB | 250 KB | Over |
| /owner | 556 KB | 350 KB | Over |
| /owner/orders | 1188 KB | 500 KB | Over |
| /owner/settings | 667 KB | 300 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.26ms | 0.39ms | 1.23ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.25ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.08ms | 0.20ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.15ms | 0.30ms | debounced |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
