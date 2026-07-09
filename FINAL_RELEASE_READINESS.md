# Final Release Readiness

Date: 2026-07-09

## Local Validation

| Check | Status |
| --- | --- |
| `cmd /c npm run typecheck` | Passed. |
| `cmd /c npm run lint` | Passed. |
| `cmd /c npm run build` | Passed with accepted Firebase/protobuf dynamic dependency warning. |
| `cmd /c npm run smoke:operational` | Passed. |
| `cmd /c npm run audit:release` | Passed. |
| `cmd /c npm run verify:providers` | Failed locally: `6` pass, `4` errors, `1` manual for missing Firebase Admin/Firestore, Razorpay, WhatsApp, and live provider credentials. |
| `cmd /c npm run validate:prod-env` | Failed locally: `46` pass, `1` warning, `24` errors for missing/non-production Hostinger/Firebase/Razorpay/env secrets. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Certification Audit

| Area | Result |
| --- | --- |
| Active release candidate | `v1.0.0-rc4`; use the final tagged RC4 commit for deployment. |
| Marker sweep | No actionable runtime TODO/FIXME/HACK/XXX, `@ts-ignore`, `console.log`, or debugger code found. Remaining broad hits are docs, lockfiles, CLI scripts, or intentional copy. |
| Route audit | Static audit found `100` App Router pages, `73` API route handlers, `21` loading files, `12` error boundaries, and generated Next `_not-found`; authenticated browser verification remains manual. |
| API/network audit | No duplicate API family or fetch polling interval found by static scan; existing safe errors/request ids remain in protected API paths. |
| Firestore/realtime audit | No schema/rule/index/repository change; Kitchen remains the checked EventSource path; no new listener was added. |
| Deployment config | Env references remain config-driven. No secrets changed. |

## Production Readiness

| Area | Status |
| --- | --- |
| Code readiness | 99% / Release Candidate validated repository-side |
| Production-release readiness | 86% |
| Recommendation | No-Go until manual infrastructure, provider, hardware, authenticated browser, Lighthouse, and Chrome profiling gates pass. |

## Remaining Manual Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Production Chrome Performance | Manual | No local Chrome/Lighthouse executable was available to capture flame graphs, Coverage, FPS, long tasks, or heap snapshots. |
| Hosted Lighthouse/Core Web Vitals | Manual | Hosted deployment is still stale/development until Hostinger env is corrected and redeployed. |
| 30-minute heap stability | Manual | Requires authenticated browser session and continuous POS/Kitchen/customer operation. |
| Authenticated smoke | Manual | Owner/customer/admin credentials, provider dashboards, and printer hardware are outside this workspace. |
| Provider/hardware | Manual | Razorpay, SMTP, WhatsApp, Firebase Console, printers, and devices require external access. |
| Production env | Manual | Set `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc4`, Razorpay live keys, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, Firebase Admin credentials, `TABLE_QR_SECRET`, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`. |
| Hostinger redeploy | Manual | Redeploy the final RC4 commit, clear cache, and verify `/api/release-info` reports production env and the final SHA. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
