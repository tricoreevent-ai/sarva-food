# Final Performance Report

Date: 2026-07-30T11:52:26.491Z

This final report pack consolidates Phase 2, Phase 3, Active Orders, RC5 enterprise waiter workflow, RC6 brand/customer/order-classification hardening, image delivery, observability, and push/payment readiness measurements. RC6.5 is tracker/release reconciliation only; Firestore collections, auth flows, APIs, listeners, and provider contracts remain backward compatible.

## Root Cause Summary

| Area | Finding | Final action |
| --- | --- | --- |
| Startup JS | Route-owned shared customer/profile/owner chunks remain the largest production risk. | Phase 2 removed eager Firebase/Auth/Stack/XLSX/Mapbox ownership from critical initial routes where safe. |
| Runtime CPU | POS search/category and Kitchen filter/reconciliation paths were the highest repeat-interaction risks. | Phase 3 added debouncing, precomputation, memoized cards/grids, stable refs, and Kitchen reconciliation/windowing. |
| Hydration | Profile and settings surfaces owned action/tab-only code too early. | Toast, preferences, Mapbox, Cloudinary, push, fullscreen, and loyalty code now load only when needed. |
| Owner Login | Owner auth rendered as a compact legacy card with limited operational states. | Rebuilt as a responsive SaaS auth surface with remembered email, Caps Lock detection, session-timeout state, and stronger loading/a11y feedback. |
| Kitchen History | Long card history was not scalable for thousands of tickets or management workflows. | Replaced it with server-filtered paging, table sorting, column controls, bulk actions, sticky action column, and lazy Excel export. |
| Browser proof | Flame graphs, Coverage, FPS, INP, and real heap growth remain unmeasured locally. | Manual production Chrome profiling is required after Hostinger redeploy. |

## Route Budget Snapshot

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

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 487 KB | 250 KB | Over |
| /profile | 586 KB | 250 KB | Over |
| /owner | 643 KB | 350 KB | Over |
| /owner/orders | 792 KB | 500 KB | Over |
| /owner/settings | 769 KB | 300 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.40ms | 0.47ms | 0.96ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.05ms | 0.31ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.12ms | 0.27ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.17ms | 0.62ms | debounced |
| Active Orders 100-order filter/group | 0.17ms | 0.24ms | 0.57ms | <50ms interaction |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
