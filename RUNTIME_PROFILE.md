# Runtime Profile

Date: 2026-07-10T07:08:25.318Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

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

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.90ms | 1.84ms | 4.94ms | <100ms update |
| Kitchen snapshot reconciliation | 0.08ms | 0.17ms | 0.99ms | <100ms update |
| POS 1000-item category switch | 0.28ms | 0.55ms | 0.83ms | <50ms switch |
| POS 1000-item search filter | 0.37ms | 0.66ms | 1.71ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
