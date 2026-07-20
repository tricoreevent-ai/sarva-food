# Final Runtime Report

Date: 2026-07-20T09:37:00.019Z

## Runtime Measurements

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.50ms | 1.39ms | 6.26ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.06ms | 0.53ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.17ms | 0.34ms | <50ms switch |
| POS 1000-item search filter | 0.12ms | 0.23ms | 0.60ms | debounced |
| Active Orders 100-order filter/group | 0.21ms | 0.30ms | 0.74ms | <50ms interaction |

## Continuous Operation Controls

| Surface | Control |
| --- | --- |
| Kitchen | EventSource cleanup preserved, unchanged ticket references are retained, card renders are memoized, and long desktop columns are windowed. |
| POS | Debounced search, memoized product lists, memoized grid/cards, memoized billing templates, and stable cart handlers reduce repeat input work. |
| Owner Orders | Debounced search and deferred hidden operations panel code reduce idle render work. |
| Active Orders | Waiter stage columns reuse memoized cards; Kitchen/payment/progress badges are derived from existing fields; details/timeline/history remain lazy-mounted. |
| Delay Alerts | Owner Orders, Kitchen, and POS reuse `getKitchenDelay` with the persisted prepared-not-served threshold; no new realtime listener was added. |
| Owner Settings | Heavy tab-only dependencies are dynamically imported only for visible tabs. |
| Profile | Preferences and toast runtime are action/surface loaded instead of static startup ownership. |

## Manual Runtime Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | Chrome and React DevTools are available, but the owner route requires a valid production-equivalent authenticated session. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the RC5 waiter workflow commit is deployed with production VAPID/configuration. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
