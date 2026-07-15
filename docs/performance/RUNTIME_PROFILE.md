# Runtime Profile

Date: 2026-07-10T15:21:34.484Z

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
| /owner/orders | 34 | 692 KB | 190 KB | 500 KB | Over |
| /owner/settings | 31 | 683 KB | 190 KB | 300 KB | Over |
| /owner/kitchen | 29 | 644 KB | 190 KB | - | Tracked |
| /owner/pos | 28 | 574 KB | 190 KB | - | Tracked |
| /admin | 21 | 499 KB | 190 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.49ms | 0.91ms | 2.67ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.05ms | 0.36ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.15ms | 0.33ms | <50ms switch |
| POS 1000-item search filter | 0.12ms | 0.20ms | 0.54ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
