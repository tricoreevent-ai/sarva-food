# Final Performance Report

Date: 2026-07-20T06:49:20.172Z

This final report pack consolidates Phase 2, Phase 3, Active Orders, image delivery, observability, Phase 4C push/payment readiness, and Phase 5C workflow/UI correction measurements. Firestore collections, auth flows, and provider contracts remain backward compatible; payment is now independent of Kitchen/service state while completion remains Served + Paid.

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
| / | 17 | 463 KB | 193 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 193 KB | - | Tracked |
| /checkout | 26 | 589 KB | 193 KB | - | Tracked |
| /orders | 20 | 514 KB | 193 KB | - | Tracked |
| /profile | 23 | 553 KB | 193 KB | 250 KB | Over |
| /owner | 27 | 584 KB | 193 KB | 350 KB | Over |
| /owner/orders | 32 | 711 KB | 193 KB | 500 KB | Over |
| /owner/settings | 31 | 699 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 30 | 666 KB | 193 KB | - | Tracked |
| /owner/pos | 28 | 589 KB | 193 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 193 KB | - | Tracked |

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 463 KB | 250 KB | Over |
| /profile | 553 KB | 250 KB | Over |
| /owner | 584 KB | 350 KB | Over |
| /owner/orders | 711 KB | 500 KB | Over |
| /owner/settings | 699 KB | 300 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.32ms | 0.40ms | 1.53ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.32ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.10ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.35ms | debounced |
| Active Orders 100-order filter/group | 0.14ms | 0.21ms | 0.44ms | <50ms interaction |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
