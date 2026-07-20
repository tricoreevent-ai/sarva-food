# Runtime Profile

Date: 2026-07-20T14:04:49.897Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 197 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 197 KB | - | Tracked |
| /checkout | 26 | 589 KB | 197 KB | - | Tracked |
| /orders | 20 | 514 KB | 197 KB | - | Tracked |
| /profile | 23 | 553 KB | 197 KB | 250 KB | Over |
| /owner | 27 | 586 KB | 197 KB | 350 KB | Over |
| /owner/orders | 32 | 712 KB | 197 KB | 500 KB | Over |
| /owner/settings | 31 | 702 KB | 197 KB | 300 KB | Over |
| /owner/kitchen | 30 | 685 KB | 197 KB | - | Tracked |
| /owner/pos | 28 | 590 KB | 197 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 197 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.25ms | 0.32ms | 1.71ms | <100ms update |
| Kitchen snapshot reconciliation | 0.01ms | 0.03ms | 0.20ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.07ms | 0.18ms | <50ms switch |
| POS 1000-item search filter | 0.06ms | 0.11ms | 0.29ms | debounced |
| Active Orders 100-order filter/group | 0.11ms | 0.15ms | 0.54ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
