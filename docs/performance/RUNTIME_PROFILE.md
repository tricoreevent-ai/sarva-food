# Runtime Profile

Date: 2026-08-06T07:00:09.795Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 19 | 488 KB | 195 KB | 250 KB | Over |
| /restaurants | 22 | 523 KB | 195 KB | - | Tracked |
| /checkout | 28 | 624 KB | 195 KB | - | Tracked |
| /orders | 22 | 549 KB | 195 KB | - | Tracked |
| /profile | 25 | 584 KB | 195 KB | 250 KB | Over |
| /owner | 29 | 651 KB | 195 KB | 350 KB | Over |
| /owner/orders | 34 | 804 KB | 195 KB | 500 KB | Over |
| /owner/settings | 33 | 773 KB | 195 KB | 300 KB | Over |
| /owner/kitchen | 32 | 768 KB | 195 KB | - | Tracked |
| /owner/pos | 30 | 656 KB | 195 KB | 650 KB | Over |
| /admin | 24 | 548 KB | 195 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.75ms | 1.24ms | 2.50ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.17ms | 1.03ms | <100ms update |
| POS 1000-item category switch | 0.17ms | 0.37ms | 0.74ms | <50ms switch |
| POS 1000-item search filter | 0.30ms | 0.51ms | 1.75ms | debounced |
| Active Orders 100-order filter/group | 0.50ms | 0.74ms | 1.59ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
