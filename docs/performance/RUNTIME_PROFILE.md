# Runtime Profile

Date: 2026-07-17T05:53:33.987Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

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
| /owner/kitchen | 30 | 663 KB | 193 KB | - | Tracked |
| /owner/pos | 28 | 589 KB | 193 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 193 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.28ms | 0.37ms | 1.39ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.03ms | 0.23ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.09ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.07ms | 0.12ms | 0.32ms | debounced |
| Active Orders 100-order filter/group | 0.12ms | 0.18ms | 0.42ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
