# Runtime Profile

Date: 2026-07-08T10:50:32.956Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

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

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.26ms | 0.39ms | 1.23ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.25ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.08ms | 0.20ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.15ms | 0.30ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
