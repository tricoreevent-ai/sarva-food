# Release Certification

Feature ID: `RC6.5-SYNCHRONIZED-READINESS`
Date: 2026-07-29
Release: `v1.0.0-rc6.5` candidate; existing RC tags remain immutable
Branch: `release/production-nammude`
Decision: `NO GO` for production launch, `GO` for RC6.5 candidate commit/tag after validation

## Executive Summary

Repository-side implementation is complete through RC6.4.1 base `98e16ab1cb5fcc2cb4fc9e4f55d95eca6f414a81`. RC6.5 reconciles tracker/release metadata only; complete hosted/provider/manual gates before tagging RC6.5 after hosted gates pass.

Production go-live remains blocked by manual Lighthouse, authenticated browser/device QA, provider dashboard validation, Firebase Console checks, and printer/hardware smoke.

## Repository Evidence

| Gate | Result |
| --- | --- |
| `npm run test:enhancements` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run analyze` | Passed with accepted Firebase/protobuf warning |
| `npm run profile:runtime` | Passed |
| `npm run theme:contrast` | RC6.5 final gate |
| `npm run brand:visual` | RC6.5 final gate |
| `npm run audit:release` | Passed |
| `npm run smoke:operational` | Passed |
| `npm run verify:phase4c` | Passed `19/19` notification catalog, push lifecycle, complete payment test-center, owner-checkout resolution, security, deep-link, and ten-tenant checks |
| `npm run validate:prod-env` | Failed locally: `46` pass, `0` warnings, `17` errors and `1` manual check needing real production values/provider evidence |
| 2026-07-13 RC5 closure | `typecheck`, `lint`, `build`, `analyze`, `audit:release`, and `smoke:operational` passed |
| 2026-07-13 pending-work audit | No actionable repository-side TODO/FIXME, app-source `console.log`, duplicate order component, incomplete repository path, duplicate listener, or unbounded Firestore read found |
| 2026-07-13 final optimization cleanup | Duplicated client error-reason helpers consolidated; compact order action controls received explicit accessible labels; pure phone normalization extracted away from Firebase-backed service imports |
| 2026-07-29 release package verification | Release metadata corrected to `v1.0.0-rc6.5` |
| 2026-07-16 Active Orders closure | Active Orders workspace redesign passed typecheck, lint, build, analyze, release audit, operational smoke, runtime profile, and diff check |

## Hosted Evidence

| Gate | Result |
| --- | --- |
| Deployment verification | Manual after RC6.5 deploy: hosted metadata must report final SHA, branch, production environment, and `v1.0.0-rc6.5` |
| Public production smoke | `7` pass, `18` manual |
| Provider verification | `8` pass, `3` manual |
| Memory monitor | `1` pass, `2` manual |
| Performance verification | `3` pass, `1` warning, `2` manual |

## Module Readiness Matrix

| Module | Repository Status | Production Status |
| --- | --- | --- |
| Customer | Code-ready | Manual authenticated/mobile smoke pending |
| Owner | Code-ready | Manual authenticated/browser smoke pending |
| Kitchen | Code-ready | Manual TV/tablet/SSE/sound/printer smoke pending |
| POS | Code-ready | Manual cashier/device/printer smoke pending |
| Admin | Code-ready | Manual admin/provider/dashboard smoke pending |
| QR Ordering | Code-ready | Manual device/table-session smoke pending |
| Authentication | Code-ready | Hosted OAuth/domain/session smoke pending |
| Payments | Code-ready/provider-gated | Razorpay live/sandbox dashboard smoke pending |
| Notifications | Code-ready/provider-gated | SMTP/push/WhatsApp/SMS checks pending |
| Plugin Platform | Certified | Flags remain disabled by default; controlled browser smoke pending if enabled |
| Printing | Code-ready | Manual 58mm/80mm/A4 hardware smoke pending |
| Performance | Code-ready | `/owner/orders` is under verification budget; hosted Lighthouse/Chrome profiling remains manual |

## Production Readiness

| Area | Score |
| --- | ---: |
| Repository readiness | 100% |
| Production readiness | 92% |
| Risk level | Medium-high until manual/provider gates pass |

## Go / No-Go

Repository decision: `GO` for RC6.5 candidate commit/tag after validation.

Production decision: `NO GO` until production env validation, Lighthouse/Core Web Vitals, Firebase Console checks, provider dashboard checks, authenticated browser smoke, and hardware/printer checks pass.

## RC6 Production Completion Addendum - 2026-08-10

Target repository SHA: `409e93414366676b2e7c35cb61469b7d463aac68`

Post-verification runtime fix: this addendum commit updates `src/app/s/[code]/route.ts`; verify the latest pushed SHA in `/api/release-info` after Hostinger redeploys it.

| Area | Status | Why | Access | Evidence | Blocker |
| --- | --- | --- | --- | --- | --- |
| Repository | PASS | Local branch and origin matched target SHA before runtime fix; working tree was clean. | Git CLI | `release/production-nammude`, HEAD/origin `409e93414366676b2e7c35cb61469b7d463aac68` | No |
| Production Deployment | PASS for target SHA, pending fix redeploy | Hostinger served target SHA after auto redeploy; smart-link redirect runtime fix now needs deployment after commit. | Public endpoints | `/api/release-info` reported SHA `409e93414366676b2e7c35cb61469b7d463aac68`, production, `v1.0.0-rc6.5` | Yes until fix SHA is live |
| Production Environment | WARN | Required services connected; optional/config warnings remain. | Public health endpoints | `/health/ready` and `/health/startup`: database/storage/firebase PASS; warnings: short-link origin, Sentry, payment encryption | Conditional |
| Customer UAT | NOT TESTED | Requires browser session and controlled production account/order. | Real browser/account | Not executed in CLI environment | Yes |
| Smart-Link UAT | FAIL then FIXED IN CODE | Existing live short link redirected to internal `https://0.0.0.0:3000/...`; redirect route now uses public origin and safe target path normalization. | Public short-link URL | `curl -I /s/6OPGP_V` exposed internal host before fix; source patched in `src/app/s/[code]/route.ts` | Yes until deployed |
| WhatsApp UAT | NOT TESTED | Requires real WhatsApp account/chat and generated owner campaign. | WhatsApp Web/mobile | Not executed in CLI environment | Yes |
| Scheduled Orders | NOT TESTED | Requires controlled campaign windows and server-side order attempts. | Owner/customer accounts | Not executed in CLI environment | Yes if enabled |
| Owner | NOT TESTED | Requires owner UAT credentials. | Owner account/browser | Not executed in CLI environment | Yes |
| Kitchen | NOT TESTED | Requires kitchen role/device. | Kitchen account/device | Not executed in CLI environment | Yes |
| Waiter | NOT TESTED | Requires waiter role/device. | Waiter account/device | Not executed in CLI environment | Yes |
| POS | NOT TESTED | Requires cashier/POS session. | POS account/device | Not executed in CLI environment | Yes |
| Multiple Orders/Same Table | NOT TESTED | Requires controlled concurrent production orders. | Customer/table UAT | Not executed in CLI environment | Yes |
| Firebase | WARN | Public health confirms Admin/Firestore/Storage connected; authenticated rules/listener test requires console/account access. | Firebase Console/auth browser | Health PASS; authenticated rules not executed | Conditional |
| Razorpay | OPTIONAL/WARN | Owner-scoped payment mode detected; public keys/webhook not globally configured. Required only if online payments enabled for launch. | Razorpay dashboard | Health reports `owner_scoped_or_missing` | Conditional |
| SMTP | PASS config, NOT TESTED delivery | SMTP configured but no live OTP/email delivery triggered. | Email inbox/account | Health reports SMTP configured | Conditional |
| WhatsApp Provider | NOT TESTED | Requires provider dashboard/real phone session. | WhatsApp account/provider | Not executed in CLI environment | Yes for WhatsApp launch |
| Browser Console | NOT TESTED | Requires Chrome DevTools across routes. | Desktop browser | Not executed in CLI environment | Yes |
| Android | NOT TESTED | Requires Android device/browser/WhatsApp. | Physical/emulated device | Not executed in CLI environment | Yes |
| iPhone | NOT TESTED | Requires iPhone Safari/WhatsApp. | Physical device | Not executed in CLI environment | Yes |
| Tablet | NOT TESTED | Requires tablet browser. | Tablet device | Not executed in CLI environment | Yes |
| Hardware | OPTIONAL/NOT TESTED | Printer/KOT/QR hardware not available here. | Physical hardware | Not executed in CLI environment | Conditional |
| Lighthouse | NOT TESTED | Requires browser Lighthouse against production. | Chrome | Not executed in CLI environment | Yes |
| Chrome Performance | NOT TESTED | Requires DevTools Performance capture. | Chrome | Not executed in CLI environment | Yes |
| Chrome Memory | NOT TESTED | Requires DevTools Memory capture. | Chrome | Not executed in CLI environment | Yes |

Validation after smart-link redirect fix:

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run analyze` | PASS with accepted Firebase/protobuf warning |
| `npm run audit:release` | PASS |
| `npm run smoke:operational` | PASS |
| `npm run profile:runtime` | PASS |
| `npm run theme:contrast` | PASS |
| `npm run brand:visual` | PASS |
| `git diff --check` | PASS |

Manual completion procedure:

1. Deploy the latest pushed commit on Hostinger from `release/production-nammude`.
2. Confirm `/api/release-info` SHA equals the latest pushed SHA.
3. Set a stable `PAYMENT_SETTINGS_ENCRYPTION_KEY` in Hostinger only if owner-managed live payment credentials are enabled; preserve any existing key.
4. Retest `/s/6OPGP_V` and one newly created smart link; neither may redirect to `0.0.0.0`, localhost, or a long technical URL.
5. Complete WhatsApp, browser/device, Firebase authenticated, payment, SMTP, Lighthouse, Chrome Performance, Chrome Memory, and hardware UAT with screenshots/log evidence.
