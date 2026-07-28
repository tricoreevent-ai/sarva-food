# Final Render Report

Date: 2026-07-28T07:36:44.690Z

## Hot Source Snapshot

| File | Lines | useMemo | useCallback | memo | Listeners | Timers | map/filter/sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/components/flows/customer-discovery-home.tsx | 697 | 10 | 0 | 1 | 0 | 1 | 11/6/4 |
| src/app/profile/page.tsx | 1368 | 0 | 0 | 0 | 0 | 2 | 10/4/0 |
| src/components/flows/owner-order-management-flow.tsx | 2042 | 13 | 15 | 1 | 2 | 4 | 28/39/2 |
| src/components/flows/owner-settings-flow.tsx | 2193 | 1 | 1 | 0 | 0 | 4 | 46/18/2 |
| src/components/flows/kitchen-display-flow.tsx | 2846 | 19 | 13 | 3 | 13 | 3 | 57/42/5 |
| src/components/flows/pos-billing-flow.tsx | 5351 | 33 | 20 | 1 | 13 | 17 | 95/60/11 |
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
