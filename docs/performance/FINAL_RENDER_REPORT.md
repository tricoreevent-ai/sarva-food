# Final Render Report

Date: 2026-08-06T07:00:09.795Z

## Hot Source Snapshot

| File | Lines | useMemo | useCallback | memo | Listeners | Timers | map/filter/sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/components/flows/customer-discovery-home.tsx | 844 | 13 | 0 | 1 | 0 | 1 | 15/7/5 |
| src/app/profile/page.tsx | 1367 | 0 | 0 | 0 | 0 | 2 | 10/4/0 |
| src/components/flows/owner-order-management-flow.tsx | 2099 | 16 | 16 | 1 | 2 | 4 | 28/32/2 |
| src/components/flows/owner-settings-flow.tsx | 2193 | 1 | 1 | 0 | 0 | 4 | 46/18/2 |
| src/components/flows/kitchen-display-flow.tsx | 2892 | 26 | 13 | 3 | 13 | 3 | 57/44/5 |
| src/components/flows/pos-billing-flow.tsx | 5366 | 37 | 20 | 1 | 13 | 17 | 95/60/11 |
| src/modules/owner/pos/components/product-grid.tsx | 85 | 1 | 0 | 1 | 0 | 0 | 1/0/0 |
| src/modules/owner/pos/components/product-card.tsx | 131 | 0 | 0 | 1 | 0 | 0 | 0/0/0 |

## Render Fixes

| Surface | Fix |
| --- | --- |
| Kitchen | Incremental SSE reconciliation preserves stable ticket references; cards are memoized by ticket ref/minute bucket; desktop columns window long queues. |
| POS | Search is debounced; product arrays, bill context, KOT context, templates, and totals are memoized; product grid/cards are memoized. |
| Owner Orders | Debounced search and memoized active order card path reduce broad row repaints. |
| Owner Settings | Hidden tab tooling no longer participates in initial settings render. |
| Profile | Preferences/toast code no longer renders as part of baseline profile startup. |

## Browser Render Gate

React Profiler flame graphs and real INP/long-task attribution still require production Chrome profiling after redeploy.
