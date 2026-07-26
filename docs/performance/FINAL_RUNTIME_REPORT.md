# Final Runtime Report

Date: 2026-07-26T10:09:15.417Z

## Runtime Measurements

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.79ms | 1.18ms | 3.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.16ms | 1.07ms | <100ms update |
| POS 1000-item category switch | 0.13ms | 0.25ms | 4.18ms | <50ms switch |
| POS 1000-item search filter | 0.25ms | 0.55ms | 1.17ms | debounced |
| Active Orders 100-order filter/group | 0.34ms | 0.89ms | 1.80ms | <50ms interaction |

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
