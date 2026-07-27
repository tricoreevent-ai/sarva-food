# Performance Budget

Date: 2026-07-27T07:32:46.675Z

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 467 KB | 193 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 193 KB | - | Tracked |
| /checkout | 26 | 601 KB | 193 KB | - | Tracked |
| /orders | 20 | 525 KB | 193 KB | - | Tracked |
| /profile | 24 | 564 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 614 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 757 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 744 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 719 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 618 KB | 193 KB | 650 KB | Pass |
| /admin | 21 | 522 KB | 193 KB | - | Tracked |

## Runtime Budgets

| Surface | Budget | Current control |
| --- | --- | --- |
| POS category switch | <50ms | Debounced search, precomputed product arrays, memoized product cards. |
| Kitchen realtime update | <100ms | Incremental SSE patches, memoized cards, desktop queue windowing. |
| Memory stability | 30 minutes stable | No new unbounded listeners/timers; manual Chrome heap profiling required. |
| CPU usage | Minimized | Expensive filter/sort paths are memoized or debounced where touched. |
