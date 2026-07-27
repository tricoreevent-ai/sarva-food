# Performance Budget

Date: 2026-07-27T08:12:25.252Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 18 | 481 KB | 193 KB | 250 KB | Over |
| /restaurants | 20 | 510 KB | 193 KB | - | Tracked |
| /checkout | 27 | 615 KB | 193 KB | - | Tracked |
| /orders | 21 | 538 KB | 193 KB | - | Tracked |
| /profile | 25 | 578 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 631 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 775 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 757 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 736 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 636 KB | 193 KB | 650 KB | Pass |
| /admin | 23 | 540 KB | 193 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Incremental SSE patches, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
