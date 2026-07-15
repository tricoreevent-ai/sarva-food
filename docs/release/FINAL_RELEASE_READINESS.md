# Final Release Readiness

Date: 2026-07-15

Tag recommendation: keep `v1.0.0-rc4` unchanged; tag the final RC5 validation commit as `v1.0.0-rc5`.

## Local Validation

| Check | Status |
| --- | --- |
| `cmd /c npm run test:enhancements` | Passed |
| `cmd /c npm run typecheck` | Passed |
| `cmd /c npm run lint` | Passed |
| `cmd /c npm run build` | Passed with accepted Firebase/protobuf warning |
| `cmd /c npm run analyze` | Passed with accepted Firebase/protobuf warning |
| `cmd /c npm run profile:runtime` | Passed |
| `cmd /c npm run audit:release` | Passed |
| `cmd /c npm run smoke:operational` | Passed |
| `cmd /c npm run validate:prod-env` | Failed locally: production-only env/secrets are intentionally absent from this workspace |
| 2026-07-13 RC5 closure | `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed |
| 2026-07-13 pending-work audit | No repository-side code blocker found; bundle reports refreshed from current analyzer output |
| 2026-07-15 image optimization closure | `npm run typecheck`, `npm run lint`, `npm run build`, `cmd /c npm run analyze`, `cmd /c npm run audit:release`, and `cmd /c npm run smoke:operational` passed; `/owner/orders` is `697 KB` |

## Hosted Validation

| Check | Status |
| --- | --- |
| Deployment verification | `14` pass, `1` warning, `2` errors: hosted version still reports `v1.0.0-rc4` and hosted env reports `development` |
| Public production smoke | `7` pass, `18` manual |
| Provider verification | `8` pass, `3` manual |
| Performance verification | `3` pass, `1` warning, `2` manual |
| Memory stability | `1` pass, `2` manual |

## Production Readiness

| Area | Status |
| --- | --- |
| Code readiness | `99%` |
| Production-release readiness | `86%` |
| Risk level | Medium-high |
| Recommendation | `NO GO` until Hostinger env, production secrets, provider, hardware, authenticated browser, Lighthouse, and Chrome profiling gates pass. |

## Release Dashboard

| Status | Area | Next Action |
| --- | --- | --- |
| ✅ Completed | Build/typecheck/lint/analyze/profile/audit/operational smoke | Keep as release evidence. |
| ✅ Completed | Public hosted health and route smoke | Re-run after final commit redeploy. |
| ✅ Completed | Bundle report | Review `docs/performance/FINAL_BUNDLE_REPORT.md`; no freeze-safe code split remains. |
| ✅ Completed | Image optimization | Cloudinary presets, AVIF/WebP upload optimization, and right-sized thumbnails completed repository-side. |
| ✅ Completed | Pending-work matrix | Repository-side remaining work is closed; unresolved gates are external/manual. |
| 🟡 Pending Manual | Lighthouse/Core Web Vitals | Run after env correction. |
| 🟡 Pending Manual | Authenticated browser/device QA | Run Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop. |
| 🟡 Pending Manual | Provider and hardware QA | Razorpay, WhatsApp/SMS/push, Firebase Console, Cloudinary uploads, SMTP sends, printers. |
| 🔴 Blocking | Hostinger env metadata | Set `NEXT_PUBLIC_APP_ENV=production`; redeploy/restart/cache clear. |
| 🔴 Blocking | Production env validation | Configure real production values and rerun `npm run validate:prod-env`. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected and upstream. Replacing or aliasing Firebase/protobuf internals during release freeze is higher risk than accepting the warning.
