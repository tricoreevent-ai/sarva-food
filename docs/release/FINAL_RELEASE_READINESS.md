# Final Release Readiness

Date: 2026-07-23T16:03:45.662Z

## Local Validation

| Check | Status |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed with accepted Firebase/protobuf warning. |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning. |
| `npm run audit:release` | Passed. |
| `npm run smoke:operational` | Passed 46/46. |
| `npm run smoke:production` | Passed 7/7 automated routes; 18 credential/provider/hardware checks remain manual. |
| Production-browser UAT | Passed public route, menu item, share, cart, login, responsive overflow, dead-link, console, and request checks. |
| `npm run stress:operational`, `profile:realtime`, `profile:memory:long` | Passed 4/4 each. |
| `npm run theme:contrast` | Passed. |
| `npm run profile:runtime` | Passed. |
| `git diff --check` | Passed as a final release gate. |

## Certification Audit

| Area | Result |
| --- | --- |
| Branch baseline | `release/production-nammude` RC5 enterprise waiter workflow before this production-hardening pass. |
| Workflow | Payment remains independent of Kitchen/service state; completion still requires Served + Paid. Split Bill and Smart Bill Merge now follow payment-state guards consistently. |
| Billing merge | Partial-payment open tickets can merge billing-only; locked, authorized, paid, refunded, closed, or already merged bills remain blocked in UI and repository. |
| Firestore | No collection/schema/rule/index change; idempotent Kitchen create semantics and scoped Kitchen/Reports SSE read paths are covered. |
| Security | Tenant checks, owner permissions, payment locks, and provider-secret boundaries remain unchanged. |

## Production Readiness

| Area | Status |
| --- | --- |
| Repository readiness | 100% |
| Production readiness | 92% |
| Recommendation | READY FOR STAGING. Repository P0/P1 closure is complete; hosted authenticated multi-role, provider, Firebase Console, device, and hardware gates remain pending. |

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
