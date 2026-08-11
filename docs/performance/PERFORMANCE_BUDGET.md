# Performance Budget

Date: 2026-08-11T06:45:00.609Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 20 | 491 KB | 195 KB | 250 KB | Over |
| /restaurants | 22 | 522 KB | 195 KB | - | Tracked |
| /checkout | 29 | 628 KB | 195 KB | - | Tracked |
| /orders | 23 | 552 KB | 195 KB | - | Tracked |
| /profile | 27 | 592 KB | 195 KB | 250 KB | Over |
| /owner | 30 | 653 KB | 195 KB | 350 KB | Over |
| /owner/orders | 35 | 806 KB | 195 KB | 500 KB | Over |
| /owner/settings | 36 | 814 KB | 195 KB | 300 KB | Over |
| /owner/kitchen | 33 | 770 KB | 195 KB | - | Tracked |
| /owner/pos | 31 | 658 KB | 195 KB | 650 KB | Over |
| /admin | 25 | 551 KB | 195 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Incremental SSE patches, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
