# Performance Budget

Date: 2026-07-26T10:09:15.417Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 465 KB | 198 KB | 250 KB | Over |
| /restaurants | 19 | 495 KB | 198 KB | - | Tracked |
| /checkout | 26 | 599 KB | 198 KB | - | Tracked |
| /orders | 20 | 523 KB | 198 KB | - | Tracked |
| /profile | 24 | 563 KB | 198 KB | 250 KB | Over |
| /owner | 28 | 609 KB | 198 KB | 350 KB | Over |
| /owner/orders | 33 | 746 KB | 198 KB | 500 KB | Over |
| /owner/settings | 32 | 735 KB | 198 KB | 300 KB | Over |
| /owner/kitchen | 31 | 714 KB | 198 KB | - | Tracked |
| /owner/pos | 29 | 614 KB | 198 KB | 650 KB | Pass |
| /admin | 21 | 513 KB | 198 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Incremental SSE patches, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
