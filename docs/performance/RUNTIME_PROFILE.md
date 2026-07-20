# Runtime Profile

Date: 2026-07-20T15:28:42.110Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 198 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 198 KB | - | Tracked |
| /checkout | 26 | 589 KB | 198 KB | - | Tracked |
| /orders | 20 | 514 KB | 198 KB | - | Tracked |
| /profile | 23 | 553 KB | 198 KB | 250 KB | Over |
| /owner | 27 | 586 KB | 198 KB | 350 KB | Over |
| /owner/orders | 32 | 712 KB | 198 KB | 500 KB | Over |
| /owner/settings | 31 | 702 KB | 198 KB | 300 KB | Over |
| /owner/kitchen | 30 | 693 KB | 198 KB | - | Tracked |
| /owner/pos | 28 | 590 KB | 198 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 198 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.30ms | 0.36ms | 1.71ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.27ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.09ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.36ms | debounced |
| Active Orders 100-order filter/group | 0.13ms | 0.19ms | 0.47ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
