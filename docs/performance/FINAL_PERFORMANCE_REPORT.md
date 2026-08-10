# Final Performance Report

Date: 2026-08-10T07:35:15.479Z

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
| / | 20 | 491 KB | 195 KB | 250 KB | Over |
| /restaurants | 22 | 522 KB | 195 KB | - | Tracked |
| /checkout | 29 | 628 KB | 195 KB | - | Tracked |
| /orders | 23 | 552 KB | 195 KB | - | Tracked |
| /profile | 27 | 592 KB | 195 KB | 250 KB | Over |
| /owner | 30 | 655 KB | 195 KB | 350 KB | Over |
| /owner/orders | 35 | 808 KB | 195 KB | 500 KB | Over |
| /owner/settings | 36 | 816 KB | 195 KB | 300 KB | Over |
| /owner/kitchen | 33 | 772 KB | 195 KB | - | Tracked |
| /owner/pos | 31 | 660 KB | 195 KB | 650 KB | Over |
| /admin | 25 | 551 KB | 195 KB | - | Tracked |

## Over-Budget Routes

| Route | Current JS | Budget | Status |
| --- | --- | --- | --- |
| / | 491 KB | 250 KB | Over |
| /profile | 592 KB | 250 KB | Over |
| /owner | 655 KB | 350 KB | Over |
| /owner/orders | 808 KB | 500 KB | Over |
| /owner/settings | 816 KB | 300 KB | Over |
| /owner/pos | 660 KB | 650 KB | Over |

## Stress Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 1.78ms | 9.07ms | 26.99ms | <100ms update |
| Kitchen snapshot reconciliation | 0.08ms | 0.28ms | 1.23ms | <100ms update |
| POS 1000-item category switch | 0.30ms | 1.36ms | 17.70ms | <50ms switch |
| POS 1000-item search filter | 0.44ms | 1.55ms | 10.72ms | debounced |
| Active Orders 100-order filter/group | 0.65ms | 1.69ms | 5.54ms | <50ms interaction |

## Conclusion

Runtime smoothness is improved and local production validation passed, but route-owned JS remains above aspirational final goals. Production signoff stays blocked on hosted Chrome/Lighthouse/manual provider and hardware gates.
