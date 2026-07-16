# Final Bug Report

Date: 2026-07-16T05:56:03.220Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | Phase 4C adds production push diagnostics and backward-compatible owner payment verification without changing order, Kitchen, POS, auth, repository, or Firestore collection contracts. |
| Push retry | A transport exception could leave a notification in `dispatching`; bounded recovery now returns it to `pending` and stops after three attempts. |
| Payment configuration | Production validation accepts owner-scoped Razorpay as the primary path; global keys are optional legacy fallback. |
| Security | Payment test actions reuse same-origin owner permissions, redact responses, and block provider mutations in live mode. |
| Firestore audit | No collection, schema, rule, index, or repository contract changed. No duplicate listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |
| POS draft autosave | Confirmed waiter/cashier authorization mismatch, remote-first state loss, absent browser recovery, repeated generic toasts, and uncoalesced writes; fixed with scoped local recovery and one retry coordinator. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/lib/server/push-notifications.ts` | Added bounded queue retry and terminal failure state. |
| `src/components/pwa/notification-test-center.tsx` | Added owner device, foreground/background, badge, sound, action, deep-link, and history diagnostics. |
| `src/app/api/owner/payment-settings/route.ts` | Added redacted test-mode diagnostics for keys, orders, signatures, webhooks, capture, and refund. |
| `src/components/owner/payment-verification-center.tsx` | Added owner-operated payment verification and redacted in-memory logs. |
| `src/services/razorpay-checkout-client.ts` | Shared the unchanged checkout loader between customer and owner test checkout. |
| `src/lib/pos-draft-recovery.ts` | Added categorized draft transport errors, localStorage/IndexedDB recovery, and safe Firestore API retry messaging. |
| `src/components/flows/pos-billing-flow.tsx` | Made draft state local-first, coalesced rapid writes, added exponential recovery and development diagnostics, and removed duplicate generic toasts. |
| `src/app/api/owner/pos/route.ts`, `src/lib/access-control.ts` | Aligned waiter/cashier POS read/create and draft authorization with the existing UI. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
