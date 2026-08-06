# Final Release Readiness

Date: 2026-08-06T07:00:09.795Z

## Local Validation

| Check | Status |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed with accepted Firebase/protobuf warning. |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning. |
| `npm run audit:release` | Passed. |
| `npm run smoke:operational` | Passed 49/49. |
| `npm run profile:runtime` | Passed. |
| `npm run theme:contrast` | Passed. |
| `npm run brand:visual` | Passed 25 SVG assets. |
| `git diff --check` | Passed as a final release gate. |

## Certification Audit

| Area | Result |
| --- | --- |
| Branch baseline | `release/production-nammude` RC6.4.1 base `98e16ab1cb5fcc2cb4fc9e4f55d95eca6f414a81` before RC6.5 reconciliation. |
| Workflow | Repository workflows are complete; RC6.5 changes only release metadata and tracker/release documentation. |
| Billing merge | Existing payment, split, and merge guards remain unchanged. |
| Firestore | No collection/schema/rule/index change in RC6.5. |
| Security | Tenant checks, owner permissions, payment locks, provider-secret boundaries, and RBAC remain unchanged. |

## Production Readiness

| Area | Status |
| --- | --- |
| Repository readiness | 100% |
| Production readiness | 92% |
| Recommendation | NO-GO for production launch until final RC6.5 is deployed and hosted authenticated multi-role, provider, browser/device, Firebase Console, Lighthouse, Chrome profiling, long-run heap, and hardware gates pass. |

## Remaining Manual Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | Chrome and React DevTools are available, but the owner route requires a valid production-equivalent authenticated session. |
| Hosted Lighthouse/Core Web Vitals | Manual | Run after the final RC6.5 commit is deployed with production env and provider values. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
| Hosted VAPID | Manual | Set the documented public key in Hostinger, redeploy, and verify `vapidConfigured=true`. |
| Push delivery | Manual | Register real devices and verify foreground/background/action/deep-link behavior in Chrome, Edge, Firefox, Android, and supported Safari/iPhone PWA. |
| Razorpay | Manual | Complete owner sandbox checkout, failed/cancel/timeout, capture/refund, dashboard webhook, live key rotation, and settlement checks. |
| Hostinger redeploy | Manual | Deploy the final RC6.5 commit, clear cache, and verify release info plus all health endpoints. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
