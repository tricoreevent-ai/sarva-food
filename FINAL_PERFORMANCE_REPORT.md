# Final Performance Report

Date: 2026-07-08T17:26:27.709Z

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

## Over-Budget Routes

All tracked routes are inside the configured script budgets.

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.98ms | 2.22ms | 65.45ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.12ms | 1.56ms | <100ms update |
| POS 1000-item category switch | 0.16ms | 0.32ms | 0.60ms | <50ms switch |
| POS 1000-item search filter | 0.27ms | 0.61ms | 6.15ms | debounced |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
