# Runtime Profile

Date: 2026-07-26T13:15:01.436Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Read from `.next/server/app/**/page_client-reference-manifest.js`. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 465 KB | 199 KB | 250 KB | Over |
| /restaurants | 19 | 495 KB | 199 KB | - | Tracked |
| /checkout | 26 | 599 KB | 199 KB | - | Tracked |
| /orders | 20 | 523 KB | 199 KB | - | Tracked |
| /profile | 24 | 563 KB | 199 KB | 250 KB | Over |
| /owner | 28 | 609 KB | 199 KB | 350 KB | Over |
| /owner/orders | 33 | 747 KB | 199 KB | 500 KB | Over |
| /owner/settings | 32 | 735 KB | 199 KB | 300 KB | Over |
| /owner/kitchen | 31 | 714 KB | 199 KB | - | Tracked |
| /owner/pos | 29 | 614 KB | 199 KB | 650 KB | Pass |
| /admin | 21 | 513 KB | 199 KB | - | Tracked |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.47ms | 0.92ms | 1.21ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.09ms | 0.39ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.15ms | 0.33ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.22ms | 0.66ms | debounced |
| Active Orders 100-order filter/group | 0.19ms | 0.28ms | 0.70ms | <50ms interaction |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
