# Final Release Readiness

Date: 2026-07-20T10:41:18.170Z

## Local Validation

| Check | Status |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed with accepted Firebase/protobuf warning. |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning. |
| `npm run verify:phase4c` | Passed notification, push lifecycle, payment security, deep-link, and ten-tenant checks. |
| `npm run audit:release` | Passed. |
| `npm run smoke:operational` | Passed. |
| `npm run profile:runtime` | Passed. |

## Certification Audit

| Area | Result |
| --- | --- |
| Branch baseline | `release/production-nammude` at `1735938074e71598befcff2578b5220df218ede2` before Phase 4C changes. |
| Push | Public VAPID value is configured in commit-safe templates; lifecycle, service worker, retry, and owner test-center contracts pass. Hosted env and real-device delivery remain manual. |
| Payments | Owner-scoped runtime, encrypted secrets, signatures, webhook controls, and ten-tenant mappings pass automated checks. Real Razorpay dashboard evidence remains manual. |
| Firestore | No collection/schema/rule/index change and no new listener. |
| Security | No service-account/provider secret committed; test responses are redacted and provider mutations are blocked in live mode. |

## Production Readiness

| Area | Status |
| --- | --- |
| Repository readiness | 99% |
| Production readiness | 90% |
| Recommendation | NO-GO until Phase 4C is deployed and provider, browser/device, Firebase Console, Lighthouse, Chrome profiling, and hardware gates pass. |

## Remaining Manual Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | Chrome and React DevTools are available, but the owner route requires a valid production-equivalent authenticated session. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the Phase 4C commit is deployed with the production VAPID value. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
| Hosted VAPID | Manual | Set the documented public key in Hostinger, redeploy, and verify `vapidConfigured=true`. |
| Push delivery | Manual | Register real devices and verify foreground/background/action/deep-link behavior in Chrome, Edge, Firefox, Android, and supported Safari/iPhone PWA. |
| Razorpay | Manual | Complete owner sandbox checkout, failed/cancel/timeout, capture/refund, dashboard webhook, live key rotation, and settlement checks. |
| Hostinger redeploy | Manual | Deploy Phase 4C, clear cache, and verify release info plus all health endpoints. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
