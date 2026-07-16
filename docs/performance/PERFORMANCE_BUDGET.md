# Performance Budget

Date: 2026-07-16T04:35:18.415Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 462 KB | 192 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 192 KB | - | Tracked |
| /checkout | 26 | 589 KB | 192 KB | - | Tracked |
| /orders | 20 | 513 KB | 192 KB | - | Tracked |
| /profile | 23 | 553 KB | 192 KB | 250 KB | Over |
| /owner | 27 | 579 KB | 192 KB | 350 KB | Over |
| /owner/orders | 32 | 708 KB | 192 KB | 500 KB | Over |
| /owner/settings | 31 | 693 KB | 192 KB | 300 KB | Over |
| /owner/kitchen | 30 | 654 KB | 192 KB | - | Tracked |
| /owner/pos | 28 | 584 KB | 192 KB | - | Tracked |
| /admin | 21 | 503 KB | 192 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Snapshot reconciliation, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
