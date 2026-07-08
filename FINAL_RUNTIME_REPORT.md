# Final Runtime Report

Date: 2026-07-08T10:50:32.956Z

## Runtime Measurements

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.26ms | 0.39ms | 1.23ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.25ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.08ms | 0.20ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.15ms | 0.30ms | debounced |

## Continuous Operation Controls

| Surface | Control |
| --- | --- |
| Kitchen | EventSource cleanup preserved, unchanged ticket references are retained, card renders are memoized, and long desktop columns are windowed. |
| POS | Debounced search, memoized product lists, memoized grid/cards, memoized billing templates, and stable cart handlers reduce repeat input work. |
| Owner Orders | Debounced search and deferred hidden operations panel code reduce idle render work. |
| Owner Settings | Heavy tab-only dependencies are dynamically imported only for visible tabs. |
| Profile | Preferences and toast runtime are action/surface loaded instead of static startup ownership. |

## Manual Runtime Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | No local Chrome/Lighthouse executable was available to capture flame graphs, Coverage, FPS, long tasks, or heap snapshots. |
| Hosted Lighthouse/Core Web Vitals | Manual | Hosted deployment is still stale/development until Hostinger env is corrected and redeployed. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
