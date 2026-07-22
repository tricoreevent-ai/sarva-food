# Final Runtime Report

Date: 2026-07-22T06:06:06.139Z

## Runtime Measurements

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 1.54ms | 3.27ms | 16.70ms | <100ms update |
| Kitchen snapshot reconciliation | 0.10ms | 0.23ms | 1.31ms | <100ms update |
| POS 1000-item category switch | 0.33ms | 0.58ms | 1.13ms | <50ms switch |
| POS 1000-item search filter | 0.46ms | 0.77ms | 2.51ms | debounced |
| Active Orders 100-order filter/group | 0.77ms | 1.50ms | 3.96ms | <50ms interaction |

## Continuous Operation Controls

| Surface | Control |
| --- | --- |
| Kitchen | EventSource cleanup preserved, unchanged ticket references are retained, card renders are memoized, and long desktop columns are windowed. |
| POS | Debounced search, memoized product lists, memoized grid/cards, memoized billing templates, and stable cart handlers reduce repeat input work. |
| Owner Orders | Debounced search and deferred hidden operations panel code reduce idle render work. |
| Active Orders | Status/Priority/Progress/ETA/Quick View/Actions columns keep fixed desktop tracks; mobile Quick View expands inline without overlaying row controls. |
| Delay Alerts | Owner Orders, Kitchen, and POS reuse `getKitchenDelay` with the persisted prepared-not-served threshold; Kitchen ready signals now use SSE with listener cleanup instead of interval polling. |
| Owner Settings | Heavy tab-only dependencies are dynamically imported only for visible tabs. |
| Profile | Preferences and toast runtime are action/surface loaded instead of static startup ownership. |

## Manual Runtime Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | Chrome and React DevTools are available, but the owner route requires a valid production-equivalent authenticated session. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the final RC5 hardening commit is deployed with production env and provider values. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
