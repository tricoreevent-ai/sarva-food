# Runtime Profile

Date: 2026-07-08T17:26:27.709Z

## Measurement Inputs

| Source | Result |
| --- | --- |
| Build route manifests | Unavailable until `npm run build` or `npm run analyze` runs. |
| Browser profiler | No local Chrome/Lighthouse executable is assumed by this script; production Chrome Performance remains manual. |
| Synthetic load | 100 kitchen orders and 1000 POS products measured with Node performance timers. |

## Route Runtime Budget Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |

## Stress Timing Snapshot

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.98ms | 2.22ms | 65.45ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.12ms | 1.56ms | <100ms update |
| POS 1000-item category switch | 0.16ms | 0.32ms | 0.60ms | <50ms switch |
| POS 1000-item search filter | 0.27ms | 0.61ms | 6.15ms | debounced |

## Notes

Hydration time, FPS, long tasks, Chrome memory, and real network waterfalls still require hosted production Chrome profiling because this workspace script cannot observe browser main-thread scheduling.
