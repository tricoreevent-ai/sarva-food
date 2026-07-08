# Dependency Audit

Date: 2026-07-08

## Installed Direct Dependencies

`cmd /c npm ls --depth=0` passed during the Phase 2 audit. No dependency was removed because every large runtime package is still used by an approved surface: auth, maps, import/export, payments/providers, notifications, animation, forms, or operational routes.

## Large Dependency Findings

| Package | Status | Bundle evidence | Phase 2 result |
| --- | --- | --- | --- |
| `@stackframe/stack` | Heavy but route-scoped. | `3143` 788 KB handler chunk; `3112` 589 KB auth chunk. | `3143` remains `/handler/[...stack]`; `3112` is no longer initial on sampled `/` or `/profile`. |
| `firebase` | Heavy and now narrower. | Firestore `02df5fe5` 266 KB; Auth `2bfc466f` 124 KB. | Route ownership reduced from 94 manifests to 10 auth/detail/diagnostic manifests; removed from sampled `/`, `/profile`, `/owner/pos` initial HTML. |
| `mapbox-gl` | Very heavy but async. | `c36f3faa` 1.75 MB. | Still absent from sampled public/profile/POS initial HTML. |
| `xlsx` | Heavy but async. | `2170a4aa` 412 KB. | Still import/export action-scoped. |
| `lucide-react` | Many small icon modules. | Root `1.14.0`; Stack UI override remains `0.508.0`. | No whole-icon import found; duplicate stays inside Stack chunk. |
| `framer-motion` | Shared animation runtime. | `1613` 124 KB across many route manifests. | Left unchanged; visual/a11y smoke required before reducing animation ownership. |
| `react-hot-toast` | Action/notification runtime. | Phase 1 deferred public action toast ownership. | Left action/lazy loaded. |

## Duplicate / Transitive Packages

| Package | Evidence | Risk |
| --- | --- | --- |
| `lucide-react` | Root `1.14.0`; Stack UI overridden to `0.508.0`. | Duplicate icon runtime remains in Stack-owned chunks. |
| `date-fns` | Transitive lockfile entries only. | No source import found. |
| `lodash.*` | Transitive modular packages only. | No source `lodash` import found. |
| `@tanstack/table-core` | Transitive through Stack UI data table. | Large inside Stack handler chunk only. |

## Source Scan Result

| Query | Result |
| --- | --- |
| `lodash`, `moment`, `date-fns` | No source imports. |
| Chart libraries | No direct source import found. |
| `xlsx` | Dynamic import/export paths only. |
| `firebase/firestore` | Still used by auth/detail/diagnostic/operational service modules; public shell no longer imports owner/admin Firestore services at module scope. |
| `@/services/production-data-service` in `app-store` | Converted to type-only plus dynamic action imports. |
| `@/services/advanced-menu-service` in `app-store` | Converted to dynamic action imports. |

## Decision

No package deletion is safe for `v1.0.0-rc3`. The Phase 2 dependency fix is route ownership: config-only Firebase checks use `src/firebase/config.ts`, auth/profile services load at effect/action time, and owner/menu production data services no longer inflate the public shell.
