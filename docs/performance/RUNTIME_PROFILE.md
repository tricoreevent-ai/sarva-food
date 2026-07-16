# Runtime Profile

Date: 2026-07-16T09:05:40.811Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 192 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 192 KB | - | Tracked |
| /checkout | 26 | 589 KB | 192 KB | - | Tracked |
| /orders | 20 | 514 KB | 192 KB | - | Tracked |
| /profile | 23 | 553 KB | 192 KB | 250 KB | Over |
| /owner | 27 | 583 KB | 192 KB | 350 KB | Over |
| /owner/orders | 32 | 709 KB | 192 KB | 500 KB | Over |
| /owner/settings | 31 | 697 KB | 192 KB | 300 KB | Over |
| /owner/kitchen | 30 | 656 KB | 192 KB | - | Tracked |
| /owner/pos | 28 | 587 KB | 192 KB | - | Tracked |
| /admin | 21 | 504 KB | 192 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.56ms | 0.78ms | 2.98ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.15ms | 0.80ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.18ms | 0.37ms | <50ms switch |
| POS 1000-item search filter | 0.16ms | 0.34ms | 0.69ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
