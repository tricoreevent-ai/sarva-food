# Performance Budget

Date: 2026-07-08T10:50:32.956Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 455 KB | 190 KB | 250 KB | Over |
| /restaurants | 20 | 492 KB | 190 KB | - | Tracked |
| /checkout | 25 | 580 KB | 190 KB | - | Tracked |
| /orders | 20 | 504 KB | 190 KB | - | Tracked |
| /profile | 23 | 544 KB | 190 KB | 250 KB | Over |
| /owner | 24 | 556 KB | 190 KB | 350 KB | Over |
| /owner/orders | 35 | 1188 KB | 190 KB | 500 KB | Over |
| /owner/settings | 28 | 667 KB | 190 KB | 300 KB | Over |
| /owner/kitchen | 27 | 636 KB | 190 KB | - | Tracked |
| /owner/pos | 25 | 560 KB | 190 KB | - | Tracked |
| /admin | 21 | 494 KB | 190 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Snapshot reconciliation, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
