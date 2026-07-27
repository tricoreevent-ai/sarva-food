# Runtime Profile

Date: 2026-07-27T08:12:25.252Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 481 KB | 193 KB | 250 KB | Over |
| /restaurants | 20 | 510 KB | 193 KB | - | Tracked |
| /checkout | 27 | 615 KB | 193 KB | - | Tracked |
| /orders | 21 | 538 KB | 193 KB | - | Tracked |
| /profile | 25 | 578 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 631 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 775 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 757 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 736 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 636 KB | 193 KB | 650 KB | Pass |
| /admin | 23 | 540 KB | 193 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.64ms | 0.91ms | 1.50ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.10ms | 0.61ms | <100ms update |
| POS 1000-item category switch | 0.10ms | 0.20ms | 0.72ms | <50ms switch |
| POS 1000-item search filter | 0.18ms | 0.34ms | 0.82ms | debounced |
| Active Orders 100-order filter/group | 0.27ms | 0.39ms | 0.92ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
