# Final Firestore Audit

Date: 2026-07-20T09:37:00.019Z

## Scope

No Firestore collection, rule, index, or repository contract changed. RC5 waiter workflow stores backward-compatible operational notification sound preferences inside the existing `restaurantSettings.operationalSettings` document field.

## Result

| Area | Result |
| --- | --- |
| Push tokens | Existing `user_preferences` storage and tenant targeting are reused. |
| Notification queue | Existing notification fields are reused for bounded retry. |
| Operational sounds | Existing `restaurantSettings` storage is reused; missing sound preferences normalize to defaults. |
| Razorpay settings | Existing encrypted owner profile settings and legacy restaurant fallback are reused. |
| Payment intents | Existing owner/restaurant/tenant/provider mapping is unchanged. |
| Listeners and indexes | No listener, rule, or index added. |

Firebase Console deployment and authenticated protected read/write smoke remain manual.
