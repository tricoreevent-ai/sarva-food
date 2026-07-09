# Release Certification

Feature ID: `RC4-PRODUCTION-READINESS-CLOSURE`
Date: 2026-07-09
Release: `v1.0.0-rc4`
Branch: `release/production-nammude`
Current hosted SHA: pending post-RC4 redeploy verification
Decision: `NO GO`

## Executive Summary

Repository-side RC4 release metadata, env matrix, safe metadata fallbacks, and credential-response hardening are implemented. Local typecheck, lint, build, smoke, and diff checks pass.

Production release remains blocked by external/manual gates: Hostinger env/redeploy/cache, production credentials, Firebase Console checks, provider live checks, and authenticated browser/device/printer smoke have not been completed.

## Repository Evidence

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with accepted Firebase/protobuf warning |
| `npm run smoke:operational` | Passed |
| `npm run audit:release` | Passed |
| `npm run verify:providers` | Failed locally: `6` pass, `4` errors, `1` manual for missing Firebase Admin/Firestore, Razorpay, WhatsApp, and live provider credentials |
| `npm run validate:prod-env` | Failed locally: `46` pass, `1` warning, `24` errors requiring production Hostinger/Firebase/Razorpay values |
| `git diff --check` | Passed with Git line-ending normalization warnings only |

## Hosted Evidence

Hosted verification must be rerun after the final RC4 commit is pushed and Hostinger is redeployed. Hosted `/api/release-info` must report `applicationVersion: v1.0.0-rc4`, `deploymentEnvironment: production`, HTTPS public URL, and the final RC4 SHA.

## Module Readiness Matrix

| Module | Repository Status | Production Status |
| --- | --- | --- |
| Customer | Code-ready | Manual authenticated/device smoke pending |
| Owner | Code-ready | Manual authenticated/view-switch smoke pending |
| Kitchen | Code-ready | Manual TV/tablet/SSE/sound/printer smoke pending |
| POS | Code-ready | Manual cashier/device/printer smoke pending |
| Admin | Code-ready | Manual admin/provider/dashboard smoke pending |
| QR Ordering | Code-ready | Manual device/table-session smoke pending |
| Authentication | Code-ready | Hosted OAuth/domain/session smoke pending |
| Payments | Code-ready/provider-gated | Razorpay live/sandbox dashboard smoke pending |
| Notifications | Code-ready/provider-gated | SMTP/push/WhatsApp/SMS checks pending |
| Inventory | Code-ready | Manual owner workflow smoke pending |
| Reports/Analytics | Code-ready | Manual authenticated accuracy/performance smoke pending |
| Plugin Platform | Certified | Controlled flag-enabled browser smoke pending |
| Printing | Code-ready | Manual 58mm/80mm/A4 hardware smoke pending |

## Go / No-Go

Repository decision: `GO` for RC deployment testing.

Production go-live decision: `NO GO` until Hostinger production env, Firebase Console, provider dashboards, authenticated browser smoke, Lighthouse/Core Web Vitals, Chrome profiling, and hardware/printer gates pass.
