# Render Analysis

Date: 2026-07-22T08:45:55.047Z

## Source Hot Paths

| File | Lines | useMemo | useCallback | memo | Listeners | Timers | map/filter/sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/components/flows/customer-discovery-home.tsx | 696 | 10 | 0 | 1 | 0 | 1 | 11/6/4 |
| src/app/profile/page.tsx | 1367 | 0 | 0 | 0 | 0 | 2 | 10/4/0 |
| src/components/flows/owner-order-management-flow.tsx | 1841 | 11 | 6 | 1 | 2 | 4 | 29/44/2 |
| src/components/flows/owner-settings-flow.tsx | 2193 | 1 | 1 | 0 | 0 | 4 | 46/18/2 |
| src/components/flows/kitchen-display-flow.tsx | 2850 | 19 | 13 | 3 | 13 | 3 | 57/42/5 |
| src/components/flows/pos-billing-flow.tsx | 5335 | 33 | 20 | 1 | 13 | 17 | 94/59/10 |
| src/modules/owner/pos/components/product-grid.tsx | 85 | 1 | 0 | 1 | 0 | 0 | 1/0/0 |
| src/modules/owner/pos/components/product-card.tsx | 131 | 0 | 0 | 1 | 0 | 0 | 0/0/0 |

## Phase 3 Render Fixes

| Area | Fix |
| --- | --- |
| Kitchen | Incremental SSE deltas patch changed tickets only, memoized Kitchen cards receive minute-bucket time props, and desktop columns window long queues. |
| POS | Product search is debounced, product lists are precomputed per data refresh, product cards are memoized, and stable cart handlers use the latest bill ref. |
| Owner Orders | Search filtering is debounced and hidden partner dialogs/cards load only when opened. |
| Owner Settings | Mapbox, Cloudinary upload, push permission, fullscreen, and loyalty tab code load only when their tabs render. |
| Profile | App preferences and toast runtime are lazy loaded. |
