# Final Render Report

Date: 2026-07-10T15:21:34.484Z

## Hot Source Snapshot

| File | Lines | useMemo | useCallback | memo | Listeners | Timers | map/filter/sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/components/flows/customer-discovery-home.tsx | 696 | 10 | 0 | 1 | 0 | 1 | 11/6/4 |
| src/app/profile/page.tsx | 1371 | 0 | 0 | 0 | 0 | 2 | 10/4/0 |
| src/components/flows/owner-order-management-flow.tsx | 1550 | 9 | 5 | 1 | 0 | 4 | 24/22/2 |
| src/components/flows/owner-settings-flow.tsx | 2101 | 1 | 1 | 0 | 0 | 4 | 46/18/2 |
| src/components/flows/kitchen-display-flow.tsx | 2047 | 16 | 5 | 2 | 8 | 3 | 46/39/5 |
| src/components/flows/pos-billing-flow.tsx | 3875 | 23 | 6 | 0 | 9 | 12 | 83/60/9 |
| src/modules/owner/pos/components/product-grid.tsx | 48 | 0 | 0 | 1 | 0 | 0 | 1/0/0 |
| src/modules/owner/pos/components/product-card.tsx | 79 | 0 | 0 | 1 | 0 | 0 | 0/0/0 |

## Render Fixes

| Surface | Fix |
| --- | --- |
| Kitchen | Snapshot reconciliation preserves stable ticket references; cards are memoized by ticket ref/minute bucket; desktop columns window long queues. |
| POS | Search is debounced; product arrays, bill context, KOT context, templates, and totals are memoized; product grid/cards are memoized. |
| Owner Orders | Debounced search and memoized active order card path reduce broad row repaints. |
| Owner Settings | Hidden tab tooling no longer participates in initial settings render. |
| Profile | Preferences/toast code no longer renders as part of baseline profile startup. |

## Browser Render Gate

React Profiler flame graphs and real INP/long-task attribution still require production Chrome profiling after redeploy.
