# Bundle Deep Analysis

Date: 2026-07-08
Branch: `release/production-nammude`
Scope: Phase 2 route-level bundle splitting after Phase 1 performance recovery.

## Source Artifacts

| Source | Status |
| --- | --- |
| `.next/analyze/client.html` | Parsed after `cmd /c npm run analyze`. |
| `.next/server/app/**/page_client-reference-manifest.js` | Parsed for route-to-chunk ownership. |
| Local `next start` HTML | Sampled `/`, `/profile`, `/login`, and `/owner/pos` initial script tags. |
| `.next/static/chunks` | Parsed for emitted JS sizes. |

## Before / After Summary

| Route / asset | Before Phase 2 | After Phase 2 | Result |
| --- | ---: | ---: | --- |
| `/` RSC route JS | 1017 KB | 455 KB | Down 562 KB; Firestore/Auth no longer in initial home HTML. |
| `/profile` RSC route JS | 1714 KB | 562 KB | Down 1152 KB; Stack/Auth no longer initial for profile shell. |
| Firestore route ownership | 94 route manifests | 10 route manifests | Now auth/detail/diagnostic owned instead of broad shell owned. |
| Home initial flagged chunks | Firestore/Auth present | None | No `02df5fe5`, `2bfc466f`, `3112`, `3143`, `2170a4aa`, or Mapbox in sampled `/` HTML. |
| Profile initial flagged chunks | Firestore/Auth/Stack present | None | Profile action helpers load on demand. |
| Login initial flagged chunks | Auth/Firestore/Stack present | Auth route only | Expected. |
| Owner POS initial flagged chunks | None | None | Operational route isolation preserved. |

## Route Matrix

RSC manifest totals include shared client chunks and are useful for route ownership comparison. They are not Lighthouse transferred-byte measurements.

| Route | Total JS | Shared JS | Unique JS | Chunks | Server page JS | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 455 KB | 455 KB | 0 KB | 17 | 52 KB | Home no longer owns Firebase Auth/Firestore initial chunks. |
| `/restaurants` | 492 KB | 455 KB | 38 KB | 20 | 47 KB | Customer listing benefits from shared shell split. |
| `/checkout` | 580 KB | 540 KB | 40 KB | 25 | 69 KB | Checkout keeps account/cart work. |
| `/profile` | 562 KB | 554 KB | 8 KB | 25 | 25 KB | Profile update/logout helpers are action-loaded. |
| `/orders` | 504 KB | 455 KB | 49 KB | 20 | 63 KB | Customer orders keeps route flow only. |
| `/offers` | 488 KB | 455 KB | 33 KB | 19 | 39 KB | Offers keeps public data flow only. |
| `/owner` | 556 KB | 556 KB | 0 KB | 24 | 59 KB | Owner shell preserved. |
| `/owner/kitchen` | 633 KB | 633 KB | 0 KB | 27 | 25 KB | KDS route remains isolated. |
| `/owner/pos` | 560 KB | 556 KB | 5 KB | 25 | 30 KB | POS route remains isolated. |
| `/owner/orders` | 1193 KB | 1115 KB | 77 KB | 35 | 88 KB | Owner orders still owns heavier operational flow. |
| `/owner/settings` | 701 KB | 701 KB | 0 KB | 30 | 121 KB | Settings remains the largest owner settings route. |
| `/owner/reports` | 576 KB | 556 KB | 20 KB | 26 | 31 KB | Reports preserved. |
| `/admin` | 494 KB | 494 KB | 0 KB | 21 | 40 KB | Admin shell preserved. |
| `/admin/analytics` | 503 KB | 494 KB | 10 KB | 22 | 35 KB | Admin analytics preserved. |
| `/admin/settings/map` | 1074 KB | 1051 KB | 23 KB | 32 | 41 KB | Map settings can own map/Firebase diagnostics. |

## Largest Current Client Chunks

| Chunk | Parsed | Gzip | Route ownership |
| --- | ---: | ---: | --- |
| `c36f3faa...js` | 1745 KB | 471 KB | Mapbox async runtime only. |
| `3143...js` | 788 KB | 217 KB | Stack handler route only. |
| `3112...js` | 589 KB | 148 KB | `/login`, `/signup`, `/forgot-password`, Stack handler. |
| `2170a4aa...js` | 412 KB | 140 KB | XLSX async import/export chunk. |
| `02df5fe5...js` | 266 KB | 78 KB | Firestore common; now 10 auth/detail/diagnostic route manifests. |
| `2bfc466f...js` | 124 KB | 35 KB | Firebase Auth; same 10 auth/detail/diagnostic route manifests. |
| `1613...js` | 124 KB | 40 KB | Framer Motion shared route chunk. |

## Dependency Trees For Large Chunks

### `3143-951486d1f3465902.js`

| Module | Parsed |
| --- | ---: |
| Stack generated global CSS | 119 KB |
| Stack UI data table / `@tanstack/table-core` | 54 KB |
| Stack account image compression | 28 KB |
| Stack UI resizable / `react-resizable-panels` | 26 KB |
| Stack account cropper / `react-easy-crop` | 20 KB |
| Radix select/menu/navigation/scroll/toast/command | 70 KB+ combined |

Finding: Stack handler is large but isolated to `/handler/[...stack]`.

### `3112-e2c122998d304c47.js`

| Module | Parsed |
| --- | ---: |
| Stack client app implementation | 73 KB |
| Stack URL/page version metadata | 71 KB |
| Stack shared client interface | 54 KB |
| `yup` | 37 KB |
| Stack server/admin app implementations | 54 KB combined |

Finding: this is now auth-route owned and not part of sampled `/` or `/profile` initial HTML.

### `02df5fe5-df6f3a0af0949c2e.js`

| Module | Parsed |
| --- | ---: |
| `@firebase/firestore/dist/common-b3e8012f.esm.js` | 266 KB |

Finding: `src/lib/app-store.ts` previously pulled owner/admin Firestore services into the public shell. Phase 2 moved those services to action-time dynamic imports.

## Customer / Owner Isolation Proof

| Chunk | Result |
| --- | --- |
| Mapbox `c36f3faa...js` | No sampled `/`, `/profile`, `/login`, or `/owner/pos` initial ownership. |
| XLSX `2170a4aa...js` | Import/export async only. |
| Stack handler `3143...js` | `/handler/[...stack]` only. |
| Stack auth `3112...js` | Auth routes only; not initial on `/` or `/profile`. |
| Firestore common `02df5fe5...js` | Removed from sampled `/`, `/profile`, and `/owner/pos` initial HTML; retained where Firebase/auth/detail routes require it. |

## Remaining Candidates

| Priority | Candidate | Reason deferred |
| --- | --- | --- |
| P1 | Split `/owner/orders` operational flow. | Requires authenticated owner smoke. |
| P1 | Split profile tabs into dynamic section components. | Profile initial payload is much lower; deeper split needs browser regression coverage. |
| P1 | Reduce broad Framer Motion ownership. | Needs visual regression review to preserve animations/accessibility. |
| P2 | CSS pruning. | Main CSS cleanup requires viewport screenshots and full visual smoke. |
