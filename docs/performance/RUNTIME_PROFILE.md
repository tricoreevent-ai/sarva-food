# Runtime Profile

Date: 2026-07-29T15:47:37.868Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 487 KB | 194 KB | 250 KB | Over |
| /restaurants | 21 | 521 KB | 194 KB | - | Tracked |
| /checkout | 27 | 622 KB | 194 KB | - | Tracked |
| /orders | 21 | 547 KB | 194 KB | - | Tracked |
| /profile | 25 | 586 KB | 194 KB | 250 KB | Over |
| /owner | 28 | 643 KB | 194 KB | 350 KB | Over |
| /owner/orders | 33 | 790 KB | 194 KB | 500 KB | Over |
| /owner/settings | 32 | 769 KB | 194 KB | 300 KB | Over |
| /owner/kitchen | 31 | 755 KB | 194 KB | - | Tracked |
| /owner/pos | 29 | 647 KB | 194 KB | 650 KB | Pass |
| /admin | 23 | 546 KB | 194 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.41ms | 0.60ms | 1.45ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.08ms | 0.34ms | <100ms update |
| POS 1000-item category switch | 0.07ms | 0.15ms | 0.28ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.26ms | 0.90ms | debounced |
| Active Orders 100-order filter/group | 0.18ms | 0.38ms | 0.64ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
