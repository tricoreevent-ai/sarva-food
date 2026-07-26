# Runtime Profile

Date: 2026-07-26T10:09:15.417Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 465 KB | 198 KB | 250 KB | Over |
| /restaurants | 19 | 495 KB | 198 KB | - | Tracked |
| /checkout | 26 | 599 KB | 198 KB | - | Tracked |
| /orders | 20 | 523 KB | 198 KB | - | Tracked |
| /profile | 24 | 563 KB | 198 KB | 250 KB | Over |
| /owner | 28 | 609 KB | 198 KB | 350 KB | Over |
| /owner/orders | 33 | 746 KB | 198 KB | 500 KB | Over |
| /owner/settings | 32 | 735 KB | 198 KB | 300 KB | Over |
| /owner/kitchen | 31 | 714 KB | 198 KB | - | Tracked |
| /owner/pos | 29 | 614 KB | 198 KB | 650 KB | Pass |
| /admin | 21 | 513 KB | 198 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.79ms | 1.18ms | 3.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.16ms | 1.07ms | <100ms update |
| POS 1000-item category switch | 0.13ms | 0.25ms | 4.18ms | <50ms switch |
| POS 1000-item search filter | 0.25ms | 0.55ms | 1.17ms | debounced |
| Active Orders 100-order filter/group | 0.34ms | 0.89ms | 1.80ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
