# Final Release Readiness

Date: 2026-07-21T12:21:43.575Z

## Local Validation

| Check | Status |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed with accepted Firebase/protobuf warning. |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning. |
| `npm run audit:release` | Passed. |
| `npm run smoke:operational` | Passed 35/35, including POS Display Options, hidden-image performance, workflow settings, incremental POS realtime stream, sequential numbering, owner-login UX, waiter Serve/Complete RBAC, Kitchen cannot Serve, Firestore role parity, waiter KOT fallback, Kitchen History density, payment-independent split, and partial-payment bill-only merge guards. |
| `npm run profile:runtime` | Passed. |
| `git diff --check` | Passed as a final release gate. |

## Certification Audit

| Area | Result |
| --- | --- |
| Branch baseline | `release/production-nammude` RC5 enterprise waiter workflow plus POS realtime/display/numbering hardening. |
| Workflow | Payment remains independent of Kitchen/service state; completion still requires Served + Paid. Review Order honors Owner Settings Payment First, Kitchen First, or Flexible workflow. |
| Billing merge | Partial-payment open tickets can merge billing-only; locked, authorized, paid, refunded, closed, or already merged bills remain blocked in UI and repository. |
| Firestore | No rule/index change in this pass. OrderRepository writes per-restaurant sequence counters transactionally; POS realtime uses a bounded incremental stream endpoint for order/kitchen changes. |
| Security | Tenant checks, owner permissions, payment locks, and provider-secret boundaries remain unchanged. |
| Performance | Hidden POS images do not mount image components, long menu rendering is capped incrementally, and realtime updates patch changed cards by id. |

## Production Readiness

| Area | Status |
| --- | --- |
| Repository readiness | 100% |
| Production readiness | 92% |
| Recommendation | NO-GO until final RC5 is deployed and hosted authenticated multi-role, provider, browser/device, Firebase Console, Lighthouse, Chrome profiling, long-run heap, and hardware gates pass. |

## Remaining Manual Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | Chrome and React DevTools are available, but the owner route requires a valid production-equivalent authenticated session. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the final RC5 hardening commit is deployed with production env and provider values. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
| Hosted VAPID | Manual | Set the documented public key in Hostinger, redeploy, and verify `vapidConfigured=true`. |
| Push delivery | Manual | Register real devices and verify foreground/background/action/deep-link behavior in Chrome, Edge, Firefox, Android, and supported Safari/iPhone PWA. |
| Razorpay | Manual | Complete owner sandbox checkout, failed/cancel/timeout, capture/refund, dashboard webhook, live key rotation, and settlement checks. |
| Hostinger redeploy | Manual | Deploy the final RC5 hardening commit, clear cache, and verify release info plus all health endpoints. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
