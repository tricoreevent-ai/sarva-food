# Final Runtime Report

Date: 2026-07-16T08:41:42.670Z

## Runtime Measurements

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.47ms | 0.58ms | 2.41ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.61ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.14ms | 0.30ms | <50ms switch |
| POS 1000-item search filter | 0.12ms | 0.20ms | 0.50ms | debounced |

## Continuous Operation Controls

| Surface | Control |
| --- | --- |
| Kitchen | EventSource cleanup preserved, unchanged ticket references are retained, card renders are memoized, and long desktop columns are windowed. |
| POS | Debounced search, memoized product lists, memoized grid/cards, memoized billing templates, and stable cart handlers reduce repeat input work. |
| Owner Orders | Debounced search and deferred hidden operations panel code reduce idle render work. |
| Active Orders | Status/Priority/Progress/ETA/Quick View/Actions columns keep fixed desktop tracks; mobile Quick View expands inline without overlaying row controls. |
| Delay Alerts | Owner Orders, Kitchen, and POS reuse `getKitchenDelay` with the persisted prepared-not-served threshold; no new realtime listener was added. |
| Owner Settings | Heavy tab-only dependencies are dynamically imported only for visible tabs. |
| Profile | Preferences and toast runtime are action/surface loaded instead of static startup ownership. |

## Manual Runtime Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | No local Chrome/Lighthouse executable was available to capture flame graphs, Coverage, FPS, long tasks, or heap snapshots. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the Phase 4C commit is deployed with the production VAPID value. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
