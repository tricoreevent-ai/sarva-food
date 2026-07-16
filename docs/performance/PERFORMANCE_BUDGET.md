# Performance Budget

Date: 2026-07-16T08:41:42.670Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 193 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 193 KB | - | Tracked |
| /checkout | 26 | 589 KB | 193 KB | - | Tracked |
| /orders | 20 | 514 KB | 193 KB | - | Tracked |
| /profile | 23 | 553 KB | 193 KB | 250 KB | Over |
| /owner | 27 | 582 KB | 193 KB | 350 KB | Over |
| /owner/orders | 32 | 710 KB | 193 KB | 500 KB | Over |
| /owner/settings | 31 | 696 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 30 | 657 KB | 193 KB | - | Tracked |
| /owner/pos | 28 | 587 KB | 193 KB | - | Tracked |
| /admin | 21 | 504 KB | 193 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Snapshot reconciliation, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
