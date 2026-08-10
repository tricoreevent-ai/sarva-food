# Runtime Profile

Date: 2026-08-10T06:35:54.107Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 20 | 491 KB | 195 KB | 250 KB | Over |
| /restaurants | 22 | 522 KB | 195 KB | - | Tracked |
| /checkout | 29 | 628 KB | 195 KB | - | Tracked |
| /orders | 23 | 552 KB | 195 KB | - | Tracked |
| /profile | 27 | 592 KB | 195 KB | 250 KB | Over |
| /owner | 30 | 655 KB | 195 KB | 350 KB | Over |
| /owner/orders | 35 | 808 KB | 195 KB | 500 KB | Over |
| /owner/settings | 36 | 816 KB | 195 KB | 300 KB | Over |
| /owner/kitchen | 33 | 772 KB | 195 KB | - | Tracked |
| /owner/pos | 31 | 660 KB | 195 KB | 650 KB | Over |
| /admin | 25 | 551 KB | 195 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.35ms | 0.43ms | 1.56ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.07ms | 0.37ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.10ms | 0.23ms | <50ms switch |
| POS 1000-item search filter | 0.11ms | 0.24ms | 0.70ms | debounced |
| Active Orders 100-order filter/group | 0.18ms | 0.35ms | 0.77ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
