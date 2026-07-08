# Runtime Profile

Date: 2026-07-08T16:48:19.354Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 459 KB | 191 KB | 250 KB | Over |
| /restaurants | 20 | 496 KB | 191 KB | - | Tracked |
| /checkout | 26 | 585 KB | 191 KB | - | Tracked |
| /orders | 20 | 508 KB | 191 KB | - | Tracked |
| /profile | 23 | 548 KB | 191 KB | 250 KB | Over |
| /owner | 25 | 560 KB | 191 KB | 350 KB | Over |
| /owner/orders | 38 | 1245 KB | 191 KB | 500 KB | Over |
| /owner/settings | 29 | 673 KB | 191 KB | 300 KB | Over |
| /owner/kitchen | 28 | 642 KB | 191 KB | - | Tracked |
| /owner/pos | 26 | 565 KB | 191 KB | - | Tracked |
| /admin | 21 | 498 KB | 191 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.41ms | 0.56ms | 2.75ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.40ms | <100ms update |
| POS 1000-item category switch | 0.07ms | 0.12ms | 0.28ms | <50ms switch |
| POS 1000-item search filter | 0.14ms | 0.28ms | 0.56ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
