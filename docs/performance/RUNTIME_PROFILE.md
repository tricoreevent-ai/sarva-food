# Runtime Profile

Date: 2026-07-27T07:22:44.027Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 467 KB | 192 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 192 KB | - | Tracked |
| /checkout | 26 | 601 KB | 192 KB | - | Tracked |
| /orders | 20 | 525 KB | 192 KB | - | Tracked |
| /profile | 24 | 564 KB | 192 KB | 250 KB | Over |
| /owner | 28 | 614 KB | 192 KB | 350 KB | Over |
| /owner/orders | 33 | 757 KB | 192 KB | 500 KB | Over |
| /owner/settings | 32 | 744 KB | 192 KB | 300 KB | Over |
| /owner/kitchen | 31 | 719 KB | 192 KB | - | Tracked |
| /owner/pos | 29 | 618 KB | 192 KB | 650 KB | Pass |
| /admin | 21 | 521 KB | 192 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.53ms | 0.66ms | 1.22ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.09ms | 0.52ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.24ms | 0.46ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.23ms | 0.71ms | debounced |
| Active Orders 100-order filter/group | 0.22ms | 0.33ms | 0.80ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
