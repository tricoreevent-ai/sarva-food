# Performance Phase 2 Report

Date: 2026-07-08; RC5 addendum 2026-07-13
Branch: `release/production-nammude`
Scope: route-level bundle splitting and React architecture optimization only.

## Outcome

Phase 2 removed broad Firebase/Auth/Firestore startup ownership from the customer shell and profile route without changing business logic, API contracts, Firestore schema, auth flows, Owner, Kitchen, POS, Admin, or repository behavior.

| Metric | Before | After | Result |
| --- | ---: | ---: | --- |
| `/` RSC route JS | 1017 KB | 455 KB | Down 562 KB. |
| `/profile` RSC route JS | 1714 KB | 562 KB | Down 1152 KB. |
| Firestore common route ownership | 94 route manifests | 10 route manifests | Broad public shell ownership removed. |
| Firebase Auth route ownership | 94 route manifests | 10 route manifests | Broad public shell ownership removed. |
| Stack auth route ownership | 6 route manifests | 4 route manifests | Profile no longer initial-owns Stack auth chunk. |
| Home initial flagged chunks | Present | None | Verified from local production HTML. |
| Profile initial flagged chunks | Present | None | Verified from local production HTML. |
| Owner POS initial flagged chunks | None | None | Operational isolation preserved. |

Flagged chunks checked: Firestore `02df5fe5`, Firebase Auth `2bfc466f`, Stack auth `3112`, Stack handler `3143`, XLSX `2170a4aa`, Mapbox `c36f3faa`.

## Implementation

| Optimization | Files | Runtime effect |
| --- | --- | --- |
| Config-only Firebase module. | `src/firebase/config.ts`, `src/hooks/use-auth-user.ts`, `src/services/fcm-client.ts`, `src/app/profile/page.tsx` | Config checks no longer import SDK accessors. |
| Dynamic auth service inside `useAuthUser`. | `src/hooks/use-auth-user.ts` | `auth-service` loads only when Firebase auth check runs in the browser. |
| Lazy profile action helpers. | `src/app/profile/page.tsx` | Firebase auth update helpers and Stack/customer sign-out services load only during save/logout. |
| Lazy owner/menu production services from app store. | `src/lib/app-store.ts` | Public shell can use `useAppStore` without importing owner/admin Firestore mutation services. |

## Final Bundle Snapshot

| Chunk | Parsed | Gzip | Ownership |
| --- | ---: | ---: | --- |
| `c36f3faa...js` | 1745 KB | 471 KB | Mapbox async runtime. |
| `3143...js` | 788 KB | 217 KB | Stack handler route. |
| `3112...js` | 589 KB | 148 KB | Auth and Stack handler routes. |
| `2170a4aa...js` | 412 KB | 140 KB | XLSX import/export async chunk. |
| `02df5fe5...js` | 266 KB | 78 KB | Firestore common, now route-scoped to Firebase-owning routes. |
| `2bfc466f...js` | 124 KB | 35 KB | Firebase Auth, now route-scoped to Firebase-owning routes. |
| `1613...js` | 124 KB | 40 KB | Framer Motion shared chunk. |

## Initial HTML Probe

| Route | HTML bytes | Script/link count | Flagged chunks |
| --- | ---: | ---: | --- |
| `/` | 63,875 | 23 | None |
| `/profile` | 24,827 | 27 | None |
| `/login` | 49,080 | 28 | Auth chunks expected. |
| `/owner/pos` | 31,263 | 19 | None |

## Validation

| Check | Result |
| --- | --- |
| `cmd /c npm run typecheck` | Passed |
| `cmd /c npm run lint` | Passed |
| `cmd /c npm run build` | Passed with known Firebase/protobuf dynamic dependency warning. |
| `cmd /c npm run analyze` | Passed; regenerated `.next/analyze/client.html`, `.next/analyze/nodejs.html`, `.next/analyze/edge.html`. |
| Local production HTML probe | Passed for `/`, `/profile`, `/login`, `/owner/pos` chunk expectations. |
| `cmd /c npm run audit:release` | Passed; regenerated `docs/validation/repository-hardening-audit.md`. |
| `cmd /c npm run smoke:operational` | Passed. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Remaining Opportunities

| Priority | Work | Reason deferred |
| --- | --- | --- |
| P0 | Rerun external Lighthouse/Chrome Performance/Coverage/Memory after Hostinger production env is fixed. | PageSpeed quota was exhausted and local Chrome/Lighthouse is unavailable here. |
| P1 | Split `/owner/orders` and selected owner settings sections. | Still deferred in RC5 because it needs authenticated owner smoke and visual/performance regression evidence. |
| P1 | Split profile tabs deeper. | Current startup is much lower; deeper split needs browser regression coverage. |
| P1 | Reduce Framer Motion route ownership. | Requires visual/a11y validation. |
| P2 | Public home server-component/data-island conversion. | Requires a data architecture pass outside release-freeze cleanup. |

## RC5 Addendum

Current analyzer evidence was refreshed for RC5. `/owner/orders` now measures `692 KB`, under the `1200 KB` verification budget and preferred `1000 KB` target after pure phone-helper extraction. Deeper authenticated owner-flow splitting remains deferred because it is no longer required for the RC5 bundle target.
