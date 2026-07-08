# Render Analysis

Date: 2026-07-08T10:50:32.956Z

## Source Hot Paths

| File | Lines | useMemo | useCallback | memo | Listeners | Timers | map/filter/sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/components/flows/customer-discovery-home.tsx | 696 | 10 | 0 | 1 | 0 | 1 | 11/6/4 |
| src/app/profile/page.tsx | 1371 | 0 | 0 | 0 | 0 | 2 | 10/4/0 |
| src/components/flows/owner-order-management-flow.tsx | 1245 | 9 | 5 | 1 | 2 | 4 | 19/19/2 |
| src/components/flows/owner-settings-flow.tsx | 2048 | 1 | 1 | 0 | 0 | 4 | 45/18/2 |
| src/components/flows/kitchen-display-flow.tsx | 1974 | 16 | 5 | 2 | 8 | 3 | 45/37/5 |
| src/components/flows/pos-billing-flow.tsx | 4095 | 23 | 7 | 0 | 13 | 12 | 85/60/9 |
| src/modules/owner/pos/components/product-grid.tsx | 48 | 0 | 0 | 1 | 0 | 0 | 1/0/0 |
| src/modules/owner/pos/components/product-card.tsx | 79 | 0 | 0 | 1 | 0 | 0 | 0/0/0 |

## Phase 3 Render Fixes

| Area | Fix |
| --- | --- |
| Kitchen | SSE snapshots now reconcile unchanged tickets, memoized Kitchen cards receive minute-bucket time props, and desktop columns window long queues. |
| POS | Product search is debounced, product lists are precomputed per data refresh, product cards are memoized, and stable cart handlers use the latest bill ref. |
| Owner Orders | Search filtering is debounced and hidden partner dialogs/cards load only when opened. |
| Owner Settings | Mapbox, Cloudinary upload, push permission, fullscreen, and loyalty tab code load only when their tabs render. |
| Profile | App preferences and toast runtime are lazy loaded. |
