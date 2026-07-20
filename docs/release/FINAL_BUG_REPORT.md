# Final Bug Report

Date: 2026-07-20T09:37:00.019Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | RC5 waiter workflow hardens Active Orders, Kitchen Operations Center, waiter notifications, timelines, and Owner Settings sound preferences without changing order repository contracts or Firestore collection/rule/index contracts. |
| Waiter visibility | Paid orders no longer mask Kitchen state; Active Orders Waiter view keeps Kitchen status/progress visible until completion/history. |
| Kitchen density | Kitchen cards now adapt to item count and remove the fixed blank item area while preserving touch-friendly actions and desktop windowing. |
| Notifications | Ready/customer/Kitchen sounds use persisted operational settings, duplicate bootstrap alerts are suppressed, and Ready notifications remain idempotent. |
| Timeline | Timeline rows now tag Kitchen, Payment, Print, and Audit categories independently. |
| Push retry | A transport exception could leave a notification in `dispatching`; bounded recovery now returns it to `pending` and stops after three attempts. |
| Payment configuration | Production validation accepts owner-scoped Razorpay as the primary path; global keys are optional legacy fallback. |
| Security | Payment test actions reuse same-origin owner permissions, redact responses, and block provider mutations in live mode. |
| Firestore audit | No collection, schema, rule, index, or repository contract changed. No duplicate listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/components/flows/pos-billing-flow.tsx` | Added Waiter stage board, independent Kitchen/payment/progress card indicators, and explicit timeline categories. |
| `src/components/flows/kitchen-display-flow.tsx` | Removed fixed blank Kitchen card item wells and wired configured operational sounds with deduped customer-request alerts. |
| `src/components/flows/owner-settings-flow.tsx` | Persisted six operational sound targets in Owner Settings. |
| `src/lib/order-delay-settings.ts` | Added normalized operational notification sound settings. |
| `src/app/api/owner/kitchen/notify-waiter/route.ts` | Sanitizes and forwards the configured Ready for Pickup sound. |
| `src/lib/server/push-notifications.ts` | Added bounded queue retry and terminal failure state. |
| `src/components/pwa/notification-test-center.tsx` | Added owner device, foreground/background, badge, sound, action, deep-link, and history diagnostics. |
| `src/app/api/owner/payment-settings/route.ts` | Added redacted test-mode diagnostics for keys, orders, signatures, webhooks, capture, and refund. |
| `src/components/owner/payment-verification-center.tsx` | Added owner-operated payment verification and redacted in-memory logs. |
| `src/services/razorpay-checkout-client.ts` | Shared the unchanged checkout loader between customer and owner test checkout. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
