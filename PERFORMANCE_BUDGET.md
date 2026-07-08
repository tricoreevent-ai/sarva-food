# Performance Budget

Date: 2026-07-08T16:48:19.354Z

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

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Snapshot reconciliation, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
