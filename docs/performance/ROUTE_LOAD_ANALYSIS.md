# Route Load Analysis

Date: 2026-07-08; RC5 addendum 2026-07-13

## Route Ownership Summary

| Area | Phase 2 result |
| --- | --- |
| Customer home | RSC route JS reduced from 1017 KB to 455 KB; sampled initial HTML has no Firebase Auth, Firestore, Stack, XLSX, or Mapbox flagged chunk. |
| Restaurant/listing/menu | Customer shared shell is lighter; restaurant detail/menu still own Firebase chunks because their route flows use authenticated/favorite/detail behavior. |
| Checkout/orders/profile | `/profile` route JS reduced from 1714 KB to 562 KB; update/logout helpers are action-loaded. |
| Owner/Kitchen/POS/Admin | Operational route behavior preserved; sampled `/owner/pos` initial HTML has no Firebase Auth/Firestore flagged chunk. |
| Map surfaces | Mapbox chunk remains async and absent from sampled non-map startup. |
| Import/export | XLSX chunk remains async and absent from sampled customer/profile/POS startup. |

## Initial HTML Script Probe

Local production server after `cmd /c npm run analyze`:

| Route | HTML bytes | Script/link count | Flagged chunks |
| --- | ---: | ---: | --- |
| `/` | 63,875 | 23 | None |
| `/profile` | 24,827 | 27 | None |
| `/login` | 49,080 | 28 | `02df5fe5`, `2bfc466f`, `3112` expected for auth. |
| `/owner/pos` | 31,263 | 19 | None |

Flagged chunks checked: Firestore `02df5fe5`, Firebase Auth `2bfc466f`, Stack auth `3112`, Stack handler `3143`, XLSX `2170a4aa`, Mapbox `c36f3faa`.

## Large Shared Chunk Ownership

| Chunk | Before | After | Owner |
| --- | ---: | ---: | --- |
| Firestore common `02df5fe5...js` | 94 route manifests | 10 route manifests | Auth/detail/diagnostic routes. |
| Firebase Auth `2bfc466f...js` | 94 route manifests | 10 route manifests | Auth/detail/diagnostic routes. |
| Stack auth `3112...js` | 6 route manifests | 4 route manifests | Auth and Stack handler routes. |
| Stack handler `3143...js` | 1 route manifest | 1 route manifest | `/handler/[...stack]`. |
| XLSX `2170a4aa...js` | Dynamic only | Dynamic only | Import/export actions. |
| Mapbox `c36f3faa...js` | Dynamic only | Dynamic only | Map widgets. |

## Expensive Hydration Boundaries

| Boundary | Phase 2 action |
| --- | --- |
| `useAuthUser` | Uses config-only Firebase checks and dynamically loads `auth-service` inside the effect. |
| `ProfilePage` | Dynamically loads Firebase auth update helpers and Stack/customer sign-out services only during save/logout. |
| `useAppStore` | Removed static owner/menu Firestore service imports; mutation helpers dynamic-import only when owner/menu/staff/inventory actions run. |
| `CustomerShellClient` | Still owns public header/cart/footer/mobile nav; Phase 1 idle runtime deferral preserved. |

## Network And Firestore

| Route | Startup behavior after Phase 2 |
| --- | --- |
| `/` | Public API fetches remain; Firebase Auth/Firestore chunks are not initial. |
| `/restaurants` | Public restaurants/categories remain REST-backed with cache/dedupe. |
| `/profile` | Account route remains client-heavy, but auth/update/logout SDK helpers are action-loaded. |
| Owner/Kitchen/POS | Authenticated operational APIs/SSE unchanged. |

## Remaining Route Work

| Priority | Work | Constraint |
| --- | --- | --- |
| P1 | Split `/owner/orders` active-order/timeline/payment dialogs. | Requires authenticated owner workflow smoke; still deferred for RC5. |
| P1 | Split profile tabs after browser smoke. | Current startup improved enough for RC5; deeper split is higher regression risk. |
| P1 | Reduce Framer Motion route ownership. | Needs visual/a11y checks to preserve motion behavior. |
| P2 | Move more public home data into server-rendered/cache-backed islands. | Requires data architecture pass, not release-freeze cleanup. |

## RC5 Addendum

The current RC5 route audit found no duplicate listener, duplicate navigation, or duplicate order/KOT creation path requiring a repository fix. Remaining route-load work is optimization debt gated by authenticated browser, Chrome Performance/Coverage, and Lighthouse validation after deployment.
