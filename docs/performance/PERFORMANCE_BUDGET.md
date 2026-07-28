# Performance Budget

Date: 2026-07-28T07:36:44.690Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 483 KB | 193 KB | 250 KB | Over |
| /restaurants | 20 | 512 KB | 193 KB | - | Tracked |
| /checkout | 27 | 617 KB | 193 KB | - | Tracked |
| /orders | 21 | 540 KB | 193 KB | - | Tracked |
| /profile | 25 | 580 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 633 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 777 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 759 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 738 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 638 KB | 193 KB | 650 KB | Pass |
| /admin | 23 | 542 KB | 193 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Incremental SSE patches, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
