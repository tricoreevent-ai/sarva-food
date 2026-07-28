# Runtime Profile

Date: 2026-07-28T12:15:59.211Z

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
| /restaurants | 20 | 516 KB | 194 KB | - | Tracked |
| /checkout | 27 | 620 KB | 194 KB | - | Tracked |
| /orders | 21 | 546 KB | 194 KB | - | Tracked |
| /profile | 25 | 584 KB | 194 KB | 250 KB | Over |
| /owner | 28 | 637 KB | 194 KB | 350 KB | Over |
| /owner/orders | 33 | 786 KB | 194 KB | 500 KB | Over |
| /owner/settings | 32 | 763 KB | 194 KB | 300 KB | Over |
| /owner/kitchen | 31 | 750 KB | 194 KB | - | Tracked |
| /owner/pos | 29 | 642 KB | 194 KB | 650 KB | Pass |
| /admin | 23 | 546 KB | 194 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.34ms | 0.39ms | 0.99ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.29ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.10ms | 0.22ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.41ms | debounced |
| Active Orders 100-order filter/group | 0.14ms | 0.22ms | 0.47ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
