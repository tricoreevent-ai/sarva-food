# Performance Audit

## Enterprise Performance Sprint Phase 2 - 2026-07-08

Scope: route-level bundle splitting and React startup optimization only. No business workflow, API contract, repository behavior, Firestore collection, schema, auth flow, Owner, Kitchen, POS, Admin, or UI redesign change was made.

### Implemented

| Area | Result |
| --- | --- |
| Report artifacts | Added `docs/performance/BUNDLE_DEEP_ANALYSIS.md`, `docs/performance/DEPENDENCY_AUDIT.md`, `docs/performance/ROUTE_LOAD_ANALYSIS.md`, and `docs/performance/PERFORMANCE_PHASE2_REPORT.md`. |
| Firebase config | Added `src/firebase/config.ts`; config-only checks no longer import SDK accessors. |
| Auth hook | `useAuthUser` now dynamic-loads `auth-service` inside the browser effect instead of importing Firebase Auth/Firestore at module scope. |
| Profile route | Firebase auth update helpers and Stack/customer sign-out services now load only during save/logout actions. |
| Shared app store | Owner/menu/staff/inventory Firestore mutation services now load only when the relevant mutation action runs, so public shell `useAppStore` usage no longer imports those services. |
| FCM support check | FCM client uses config-only Firebase detection before loading messaging. |

### Bundle Results

| Metric | Before | After | Result |
| --- | ---: | ---: | --- |
| `/` RSC route JS | `1017 KB` | `455 KB` | Down `562 KB`. |
| `/profile` RSC route JS | `1714 KB` | `562 KB` | Down `1152 KB`. |
| Firestore common ownership | `94` route manifests | `10` route manifests | Broad shell ownership removed. |
| Firebase Auth ownership | `94` route manifests | `10` route manifests | Broad shell ownership removed. |
| Stack auth ownership | `6` route manifests | `4` route manifests | Profile initial ownership removed. |

### Initial HTML Probe

| Route | Result |
| --- | --- |
| `/` | No initial Firestore/Auth/Stack/XLSX/Mapbox flagged chunks. |
| `/profile` | No initial Firestore/Auth/Stack/XLSX/Mapbox flagged chunks. |
| `/login` | Auth chunks present as expected. |
| `/owner/pos` | No initial Firestore/Auth/Stack/XLSX/Mapbox flagged chunks. |

### Remaining Work

| Priority | Work |
| --- | --- |
| P0 | Rerun Lighthouse/Core Web Vitals/Chrome Performance/Coverage/Memory after Hostinger production-env redeploy. |
| P1 | Split owner orders/settings/profile tabs only after authenticated browser smoke. |
| P1 | Review Framer Motion ownership with visual/a11y regression coverage. |

## Enterprise Performance Recovery Sprint - 2026-07-08

Scope: runtime performance recovery only. No business workflow, API contract, repository behavior, Firestore collection, schema, auth flow, Owner, Kitchen, POS, Admin, or UI redesign change was made.

### Runtime Root Causes

| Area | Finding |
| --- | --- |
| LCP | Saved Lighthouse identified the home explanatory paragraph as LCP; delay was primarily render/main-thread delay, not image transfer. |
| CLS | Saved Lighthouse showed large footer/page movement from skeleton/content height mismatch. |
| Providers | Customer shell mounted auth session bridge, Firestore hydrator, toaster, PWA/push, and analytics diagnostics before idle. |
| Firebase | Public header and shared Firebase compatibility exports could pull Firestore/Auth/Storage/Analytics into public startup paths. |
| Network | Home route requested below-the-fold hero-restaurant menu data before first paint. |
| Third party | Google Analytics loaded `afterInteractive`; stale Lighthouse attributed about `450ms` main-thread blocking to Google Tag Manager. |

### Implemented Recovery

| Area | Result |
| --- | --- |
| Report-first audit | Added root `docs/performance/PERFORMANCE_REPORT.md` before implementation with bottlenecks, LCP/CLS/provider/Firestore/network/bundle findings, and the implementation plan. |
| Analytics | Deferred Google Analytics scripts to `lazyOnload`. |
| Customer runtime | Moved auth session bridge, Firestore hydrator, toaster, PWA, push, and analytics diagnostics behind `IdleMount`. |
| Header Firestore | Public header now imports Firestore/client/collections only while the location picker is open for a signed-in customer. |
| Action-only modules | Customer logout and favorite-write modules now load only on user actions. |
| Home network | Hero menu preview fetch is deferred until browser idle. |
| Firebase startup | Firebase compatibility exports are non-eager; accessor functions remain the supported initialization path. |
| CLS | Customer home loading fallback now reserves final page-like height instead of using a full-screen splash. |

### Current Build Evidence

| Check | Result |
| --- | --- |
| `cmd /c npm run typecheck` | Passed |
| `cmd /c npm run lint` | Passed |
| `cmd /c npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `cmd /c npm run analyze` | Passed and regenerated `.next/analyze/client.html`, `nodejs.html`, and `edge.html`. |
| `cmd /c npm run audit:release` | Passed: `0` debt markers and `0` matching unbounded Firestore collection reads. |
| `cmd /c npm run smoke:operational` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

### Measurement Limits

| Item | Status |
| --- | --- |
| Production Lighthouse | Not rerun from this workspace because PageSpeed API returned quota `429 RESOURCE_EXHAUSTED` and no local Lighthouse/Chrome executable was available. |
| Current hosted env | Hosted `/api/release-info` serves the latest release branch commit but still reports `deploymentEnvironment: development`; production-env Lighthouse remains manual. |
| Remaining opportunities | `/profile` tab/action splitting, deeper public server-component/data island conversion, and broad customer shared chunk reduction remain future performance work after browser smoke. |

## RC Performance Phase 3 Runtime and Core Web Vitals Optimization - 2026-07-07

Scope: runtime performance and Core Web Vitals optimization only. No UI redesign, API contract change, repository change, Firestore collection, schema migration, or business workflow change was made.

### Implemented Optimizations

| Area | Result |
| --- | --- |
| Route streaming | Added layout-matching `loading.tsx` skeletons for major customer, owner, Kitchen, POS, and admin routes so route shells can stream without full-screen splash loaders. |
| Client flow boundaries | Moved customer home, restaurant listing, restaurant menu, checkout form/summary, owner orders, owner menu, and POS flows behind page-level dynamic boundaries with route-specific skeleton fallbacks. |
| Runtime initialization | Added `IdleMount` and deferred PWA registration, push provider, and analytics diagnostics until browser idle while keeping auth/session, Firestore hydration, alerts, and toasts route-owned. |
| Diagnostics | Existing analytics monitoring now has `NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS`; diagnostics install after idle, report final LCP/CLS, include INP event timing where supported, detect hydration warnings, and sample memory only in development. |
| Toast ownership | Customer home, owner/admin action toasts, and Owner Orders/Kitchen Sarva notifications now load toast runtime only on user/notification action; checked public and owner/admin operational initial routes no longer include initial `react-hot-toast`. |
| Loading architecture | Added shared route skeletons for customer, dashboard, Kitchen, and POS surfaces with stable dimensions for cards, tables, charts, and operational rows. |
| Image/network | Added targeted preconnects for Cloudinary/Firebase image origins and Google Analytics when enabled; removed duplicate desktop hero preload on customer home and desktop restaurant carousel. |
| Render containment | Added `content-visibility` / `contain` utilities and applied them to repeated restaurant cards, mobile home cards, dish cards, and data-table scroll regions. |
| Large tables | Shared `AdvancedDataTable` now defers search input recomputation and memoizes searchable columns to reduce synchronous work on reports/admin tables. |

### Phase 3 Bundle Snapshot

Generated from local `ANALYZE=true npm run build` on 2026-07-07.

| Route / Entry | Phase 2 Parsed | Phase 3 Parsed | Result |
| --- | ---: | ---: | --- |
| `app/layout` | `9.4 KB` | `9.4 KB` | Root shell stayed minimal. |
| `/` | `951.8 KB` | `936.6 KB` | Public home initial route no longer includes initial toast. |
| `/restaurants` | `938.4 KB` | `923.1 KB` | Dynamic route flow and skeleton boundary. |
| `/restaurant/[slug]` | `1057.4 KB` | `1053.9 KB` | Detail route remains interactive-heavy; skeleton boundary added. |
| `/restaurant/[slug]/menu` | `1057.4 KB` comparable family | `288.1 KB` | Menu flow moved out of initial route shell. |
| `/checkout` | `1015.3 KB` | `1000.2 KB` | Form and summary split behind dynamic boundaries. |
| `/orders` | `927.5 KB` | `923.9 KB` | Route skeleton added; route weight mostly unchanged. |
| `/profile` | `1540.1 KB` | `1536.4 KB` | Still highest customer route; tab/action splitting remains. |
| `/owner/layout` | `225.2 KB` | `209.7 KB` | Idle runtime deferral reduced initial dashboard layout. |
| `/admin/layout` | `225.2 KB` | `209.7 KB` | Same dashboard runtime reduction. |
| `/owner/orders` | `735.0 KB` Phase 1 | `721.6 KB` | Owner orders dynamic skeleton boundary. |
| `/owner/menu` | `992.8 KB` | `985.3 KB` | Owner menu remains high; import/export isolation preserved. |
| `/owner/pos` | `70.6 KB` | `30.5 KB` | POS flow remains client-only behind a light shell. |
| `/owner/kitchen` | `128.0 KB` | `128.4 KB` | KDS isolation preserved; route skeleton added. |
| `/admin/menu-library` | `91.6 KB` | `91.9 KB` | Initial route still excludes `xlsx`. |

### Phase 3 Initial Chunk Probes

| Probe | Result |
| --- | --- |
| Checked public routes initial Mapbox | Absent |
| Checked public routes initial `xlsx` | Absent |
| Checked public routes initial `react-hot-toast` | Absent for `/`, `/restaurants`, `/restaurant/[slug]/menu`, and `/checkout`. |
| Checked owner/admin operational initial `react-hot-toast` | Absent for checked owner/admin operational routes; remaining initial toast chunks are customer/auth scoped. |
| `/owner/menu` initial `xlsx` | Absent |
| `/admin/menu-library` initial `xlsx` | Absent |
| `/owner/layout` initial Mapbox / `xlsx` / toast | Absent |

### Runtime Audit Notes

| Area | Result |
| --- | --- |
| Public Firestore runtime | Customer public data already uses cached fetch/in-flight request dedupe through public APIs instead of direct realtime listeners. |
| Realtime boundaries | Existing realtime/SSE remains concentrated in Kitchen, POS, Active Orders, Waiter/order views, and auth/data hooks; no new listener was added. |
| Memory cleanup | New idle mount and diagnostics cleanup cancel idle callbacks, observers, console patching, intervals, and event listeners. |
| Accessibility | Skeletons use `aria-busy` / route labels, keep existing focus/dialog behavior untouched, and do not remove reduced-motion handling. |

### Phase 3 Remaining Opportunities

| Priority | Work |
| --- | --- |
| P0 | Redeploy current commit with production env and rerun Lighthouse/Core Web Vitals on the hosted current build. |
| P1 | Split `/profile` by existing tabs/actions without redesigning the UI. |
| P1 | Continue Owner Menu section/action splitting after import/export browser smoke. |
| P2 | Add focused browser/Lighthouse smoke for skeleton CLS and first input responsiveness on mobile hardware. |

### Phase 3 Validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `npm run analyze` | Passed and regenerated `.next/analyze/client.html`, `nodejs.html`, and `edge.html`. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| UI/API/schema changes | None. |

## RC Performance Phase 2 Optimization - 2026-07-07

Scope: enterprise performance optimization only. No UI redesign, API change, repository change, Firestore collection, schema migration, or business workflow change was made.

### Implemented Optimizations

| Area | Result |
| --- | --- |
| Root providers | Removed Mapbox, PWA, push, auth bridge, Firestore hydrator, sync scope, toaster, alert, and analytics from `src/app/layout.tsx`; root layout now keeps only theme/i18n and route children. |
| Route-scoped runtime | Customer and dashboard shells now own runtime providers, with non-visual providers loaded through dynamic client chunks. |
| Fonts | Replaced Google Fonts CSS `@import` with `next/font/google` for Inter and Plus Jakarta Sans using matching subsets, weights, CSS variables, and `display: swap`. |
| Mapbox | Removed global `mapbox-gl` CSS import and moved the map canvas to a dynamic map-only component; Mapbox stylesheet is injected only when the map canvas mounts. |
| Heavy imports | Moved client `xlsx` imports in Owner Menu and Admin Menu Library to action-time dynamic imports. |
| Profile route | Lazy-loaded address autocomplete/map lookup instead of carrying the map provider across the full profile page. |
| Runtime images | Replaced React runtime `<img>` usage in shared loading state and Admin CMS preview with `next/image`; print-window QR HTML remains intentionally raw. |
| Client boundaries | Removed unnecessary `use client` from pure printing/POS/admin presentational files; current client-marked file count is `172`, down from `175`. |
| Stack Auth | `npm ls` found a single installed `@stackframe/*` version family; the Phase 1 duplicate signal was analyzer-path aggregation, so auth behavior was left unchanged. |

### After Bundle Snapshot

Generated from local `ANALYZE=true npm run build` on 2026-07-07.

| Asset / Entry | Parsed | Gzip | Result |
| --- | ---: | ---: | --- |
| `app/layout` | 9.4 KB | 3.6 KB | Root shell is now minimal. |
| `/owner/layout` | 225.2 KB | 77.1 KB | Dashboard runtime is route-scoped and async for non-visual providers. |
| `/admin/layout` | 225.2 KB | 77.1 KB | Same dashboard runtime boundary as owner. |
| Largest Mapbox chunk | 1704.4 KB | 459.9 KB | Still exists for map-capable routes, but is not initial on checked non-map routes. |
| Stack handler chunk | 772.9 KB | 213.0 KB | Isolated to Stack handler/auth paths. |
| Shared account/auth chunk | 574.9 KB | 144.6 KB | Still a major profile/customer-account hotspot. |

### Route Comparison

Phase 1 route rows did not include root layout cost, so public page rows are not a perfect apples-to-apples comparison after provider scoping. The important checks are root layout reduction, owner menu reduction, and absence of Mapbox/XLSX in non-map/import initial chunks.

| Route / Entry | Phase 1 Parsed | Phase 2 Parsed | Result |
| --- | ---: | ---: | --- |
| `app/layout` | Not recorded | 9.4 KB | Root provider cost removed. |
| `/` | 807.8 KB | 951.8 KB | Customer runtime is now route-owned; Mapbox and XLSX are absent. |
| `/restaurants` | 783.0 KB | 938.4 KB | Customer runtime is now route-owned; Mapbox and XLSX are absent. |
| `/restaurant/[slug]` | 915.4 KB | 1057.4 KB | Customer runtime is now route-owned; Mapbox and XLSX are absent. |
| `/checkout` | 860.0 KB | 1015.3 KB | Checkout remains interactive-heavy; Mapbox and XLSX are absent. |
| `/orders` | 783.5 KB | 927.5 KB | Customer runtime is now route-owned; Mapbox and XLSX are absent. |
| `/profile` | 1404.6 KB | 1540.1 KB | Still highest customer route; deeper tab splitting remains. |
| `/owner/menu` | 1391.1 KB | 992.8 KB | Reduced by 398.3 KB parsed / 134.9 KB gzip after dynamic import/export boundaries. |
| `/owner/pos` | 70.6 KB | 70.6 KB | Preserved good isolation. |
| `/owner/kitchen` | 128.0 KB | 128.0 KB | Preserved good isolation. |
| `/admin` | 209.5 KB | 209.5 KB | Unchanged. |
| `/admin/menu-library` | Not recorded | 91.6 KB | Initial route excludes `xlsx`; import/export stays action-scoped. |

### Initial Chunk Probes

| Probe | Result |
| --- | --- |
| Public/customer checked routes initial Mapbox | Absent |
| Public/customer checked routes initial `xlsx` | Absent |
| `/owner/menu` initial `xlsx` | Absent |
| `/admin/menu-library` initial `xlsx` | Absent |
| Global `mapbox-gl/dist/mapbox-gl.css` scan | No matches |
| Google Fonts CSS `@import` scan | No matches |

### Lighthouse Projection

Hosted Lighthouse was not rerun as a final score because Hostinger is still a stale/non-production-env deployment. After redeploy, the strongest expected gains are lower render-blocking font work, lower root-shell JS, no Mapbox on non-map critical paths, and lower import/export weight on Owner Menu/Admin Library. Mobile score is still likely constrained by LCP/CLS and the shared customer/profile chunks until public route/profile tab splitting is completed and measured on the current deployment.

### Remaining Opportunities

| Priority | Work |
| --- | --- |
| P0 | Redeploy current commit with production env and rerun Lighthouse on the hosted current build. |
| P1 | Split `/profile` by existing tabs, especially orders/addresses/settings, without redesigning the UI. |
| P1 | Continue Owner Menu splitting by existing sections/actions after browser smoke confirms import/export behavior. |
| P1 | Review broad `framer-motion` and `react-hot-toast` route ownership after functional smoke. |
| P2 | Audit lucide icon imports and large shared customer/auth chunks with route-level screenshots. |
| P2 | Address the existing Firebase/protobuf build warning separately from performance work. |

### Phase 2 Validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with the existing Firebase/protobuf dynamic dependency warning. |
| `npm run analyze` | Passed and regenerated `.next/analyze/client.html`, `nodejs.html`, and `edge.html`. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| UI/API/schema changes | None. |

## RC Performance Phase 1 Baseline - 2026-07-06

Scope: enterprise performance audit and analyzer tooling only. No UI, API, repository, Firestore collection, schema, or business workflow change was made.

### Tooling

| Item | Result |
| --- | --- |
| Bundle analyzer | Added `@next/bundle-analyzer` and wired it in `next.config.ts` behind `ANALYZE=true`. |
| Analyzer command | Use `npm run analyze`; reports are written to `.next/analyze/client.html`, `.next/analyze/nodejs.html`, and `.next/analyze/edge.html`. |
| Normal build behavior | Unchanged unless `ANALYZE=true` is set. |
| Audit artifacts | Temporary parsed JSON lives under `tmp/` and is not committed. |

### Hosted Lighthouse Baseline

Measured against `https://violet-squid-380447.hostingersite.com` on 2026-07-06. This is a stale production baseline because Hostinger currently reports commit `83885e01585510f8c833436e964b0d76002f6516` and `deploymentEnvironment: development`.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance score | 10 | 52 |
| First Contentful Paint | 3.3 s | 1.6 s |
| Largest Contentful Paint | 12.8 s | 2.8 s |
| Cumulative Layout Shift | 0.863 | 0.357 |
| Total Blocking Time | 1,900 ms | 100 ms |
| Time to Interactive | 12.9 s | 2.8 s |
| Speed Index | 7.6 s | 4.2 s |
| Main-thread work | 6.4 s | 2.9 s |
| JS bootup time | 4.0 s | 2.0 s |
| Unused JS savings | 529 KiB | 526 KiB |

Primary Lighthouse issues: mobile LCP, mobile CLS, mobile TBT, main-thread work, JS bootup, unused JavaScript, and missing preconnect for required external origins. Image audits passed on the hosted home route.

### Largest Client Assets

| Asset | Parsed | Gzip | Notes |
| --- | ---: | ---: | --- |
| `static/chunks/c36f3faa...js` | 1704.4 KB | 459.9 KB | Mapbox runtime chunk. |
| `static/chunks/6848...js` | 771.6 KB | 212.5 KB | Stack handler route chunk. |
| `static/chunks/3112...js` | 576.2 KB | 144.9 KB | Shared layout/account/auth/profile chunk. |
| `static/chunks/2170a4aa...js` | 398.6 KB | 135.3 KB | Owner menu and Admin Menu Library. |
| `static/chunks/02df5fe5...js` | 238.5 KB | 70.5 KB | Shared public/customer layout chunk. |
| `static/css/0b798427...css` | 178.4 KB | 26.9 KB | Main compiled CSS. |
| `static/css/4dba93c7...css` | 40.0 KB | 5.5 KB | Secondary compiled CSS. |

### Largest Package Hotspots

| Package | Parsed | Gzip | Finding |
| --- | ---: | ---: | --- |
| `@stackframe/stack` | 5991.5 KB | 1455.8 KB | Large auth/handler footprint and duplicate versions in lockfile. |
| `mapbox-gl` | 3408.0 KB | 919.7 KB | Heavy map runtime; keep off non-map critical paths. |
| `@stackframe/stack-ui` | 3044.7 KB | 936.4 KB | Large UI/auth footprint and duplicate versions in lockfile. |
| `next` | 2425.4 KB | 826.7 KB | Framework/runtime aggregation. |
| `react-hot-toast` | 1215.3 KB | 478.6 KB | Shared toast dependency appears broadly. |
| `lucide-react` | 1031.8 KB | 556.5 KB | Many icon modules imported across client routes. |
| `rrweb` | 928.8 KB | 293.0 KB | Monitoring/session replay style footprint; verify production need. |
| `framer-motion` | 876.6 KB | 287.1 KB | Animation dependency across public and owner flows. |
| `xlsx` | 796.3 KB | 270.5 KB | Import/export flows; should remain action-scoped. |
| `@firebase/firestore` | 476.9 KB | 140.9 KB | Client Firestore footprint. |

Duplicate lockfile candidates include `@stackframe/*`, multiple `@radix-ui/*` packages, `qrcode`, `google-gax`/Google Cloud packages, and tooling versions of `eslint`/`next`. Treat the analyzer package aggregation as directional because shared chunks and nested package paths can be counted in more than one place.

### Route Client JS

| Route | Chunks | Parsed | Gzip | Readiness |
| --- | ---: | ---: | ---: | --- |
| `/` | 18 | 807.8 KB | 251.3 KB | Heavy for customer landing. |
| `/restaurants` | 17 | 783.0 KB | 242.8 KB | Heavy shared customer shell. |
| `/restaurant/[slug]` | 21 | 915.4 KB | 281.7 KB | Route code plus shared customer chunks. |
| `/checkout` | 22 | 860.0 KB | 270.4 KB | Heavy but expected to be interactive. |
| `/orders` | 16 | 783.5 KB | 243.5 KB | Heavy shared customer shell. |
| `/profile` | 22 | 1404.6 KB | 402.5 KB | Highest customer/account route. |
| `/owner` | 19 | 928.5 KB | 292.5 KB | Heavy owner entry. |
| `/owner/dashboard` | 1 | 0.5 KB | 0.3 KB | Very light route shell. |
| `/owner/orders` | 15 | 735.0 KB | 228.1 KB | Moderate-heavy operational route. |
| `/owner/pos` | 6 | 70.6 KB | 24.8 KB | Good isolation. |
| `/owner/kitchen` | 6 | 128.0 KB | 38.0 KB | Good isolation. |
| `/owner/menu` | 23 | 1391.1 KB | 443.3 KB | Highest owner route. |
| `/admin` | 6 | 209.5 KB | 69.4 KB | Reasonable admin shell. |

### Source Hotspots

| Area | Evidence | Candidate Action |
| --- | --- | --- |
| Global providers | `src/app/layout.tsx` mounts theme, alert, Mapbox, PWA, push, auth bridge, Firestore hydrator, sync, toaster, and analytics for every route. | Audit which providers can be route-scoped without changing behavior. |
| Mapbox CSS/runtime | `src/app/layout.tsx` imports `mapbox-gl/dist/mapbox-gl.css`; map component imports `react-map-gl/mapbox`. | Keep Mapbox runtime and CSS out of non-map routes if Next CSS constraints allow a safe route boundary. |
| External fonts | `themes/shared-typography.css` imports Google Fonts. | Migrate to `next/font` with the same families/weights. |
| Runtime `<img>` | `src/components/state/page-state.tsx` and `src/app/admin/cms/page.tsx`; print-window QR HTML is intentionally raw. | Replace React runtime images with `next/image` where dimensions are known. |
| Client component count | `175` files contain `use client`. | Prioritize customer shell, profile, owner menu, and restaurant detail for server/client boundary review. |
| Realtime/timers | Existing `onSnapshot`, `EventSource`, and `setInterval` usage is concentrated in Firestore services, Kitchen, POS, topbar notifications, and carousel/timer UI. | Preserve cleanup patterns; do not add listeners during optimization. |

### Phase 2 Optimization Queue

| Priority | Work | Expected Impact | Risk |
| --- | --- | --- | --- |
| P0 | Redeploy current commit with production env before comparing scores. | Accurate production baseline. | Manual Hostinger access. |
| P0 | Route-scope global providers that are not required on every page. | Lower shared JS on customer public routes. | Medium; must preserve auth/PWA/offline behavior. |
| P0 | Convert CSS Google Fonts import to `next/font`. | Better FCP/LCP and fewer external render dependencies. | Low if family/weights match. |
| P1 | Dynamically import `xlsx` only when import/export actions are used. | Smaller owner menu/Admin library initial JS. | Medium; import/export smoke required. |
| P1 | Audit Stack handler usage and duplicate `@stackframe/*` versions. | Large bundle and duplicate dependency reduction. | Medium-high; auth must not regress. |
| P1 | Verify Mapbox is not loaded on non-map routes; lazy-load map widgets. | Large JS reduction for public/customer routes. | Medium; map smoke required. |
| P1 | Reduce broad Framer Motion usage or switch to route-local lazy motion. | Lower shared JS and bootup work. | Medium; animation/accessibility smoke required. |
| P2 | Review icon imports and package optimizer behavior. | Smaller route chunks. | Low-medium. |
| P2 | Split profile and owner menu flows along existing tabs/actions. | Lower initial route JS. | Medium; no UX redesign. |
| P2 | Review main CSS size and Tailwind output. | Lower CSS transfer/parse. | Medium; visual regression checks required. |

### Validation Notes

| Check | Result |
| --- | --- |
| Bundle analyzer reports | Generated under `.next/analyze/`. |
| Lighthouse mobile/desktop | Completed against hosted stale deployment. |
| Route bundle matrix | Completed for requested routes. |
| UI changes | None. |
| Business/API/schema changes | None. |

## Primary Goals

- Keep customer ordering fast on mobile.
- Keep Instagram deep links lightweight and conversion-focused.
- Avoid unnecessary client JavaScript on route shells.
- Reduce rerenders from unstable arrays and duplicated subscriptions.
- Prepare media-heavy studio flows for lazy loading.

## Current Performance Profile

Positive signals:

- App Router route boundaries already split customer, owner, admin, delivery, POS, studio, and catering bundles.
- Most route files are server components that mount specific client flows only where interactivity is needed.
- `next/image` is used for restaurant and food visuals.
- Customer mobile navigation and cart access are persistent and touch-friendly.
- Mock data is centralized, which avoids repeated in-route data creation.

Risks found:

- Client flow components do most of the interactive work and can grow large if backend behavior is added directly inside them.
- Studio image preview is media-heavy and should not be part of the initial app shell.
- Realtime hooks need stable dependencies to avoid unnecessary listener teardown/recreate cycles.
- Route state UI was duplicated and not fully reusable.
- PWA assets and offline fallback were minimal.

## Implemented Improvements

- Added `src/components/state/page-state.tsx` with reusable loading, error, and empty states.
- Updated `src/app/loading.tsx` and `src/app/error.tsx` to reuse shared state components.
- Added Suspense boundaries to restaurant listing and restaurant menu pages.
- Lazy-loaded the studio post creator from `src/app/studio/create-post/page.tsx`.
- Stabilized `useRestaurantOrders` status dependencies to reduce listener churn.
- Added `prefers-reduced-motion` handling in global CSS.
- Added touch optimization through `touch-action: manipulation`.
- Added route-level product metadata for customer item and Instagram deep-link pages.

## Bottlenecks To Watch

- Owner dashboards can become expensive if each widget opens its own listener.
- Admin analytics should not subscribe to raw transactional collections.
- Studio export should move from DOM preview to a dedicated canvas renderer only when real export quality is required.
- Large remote images should be stored in Firebase Storage with generated thumbnails or CDN transforms before production launch.

## Recommended Lighthouse Focus

Customer routes:

- `/`
- `/restaurants`
- `/restaurant/[slug]/menu`
- `/restaurant/[slug]/item/[itemId]?source=instagram&offer=INSTA20`
- `/checkout?mode=fast&offer=INSTA20`

Targets:

- Performance: 90+
- Accessibility: 95+
- Best practices: 95+
- SEO: 95+
- PWA installability: optional install prompt and valid manifest, not forced install

## Bundle Strategy

Current:

- App Router provides route-level splitting.
- Studio creator is dynamically imported.

Next:

- Dynamically import future chart libraries only inside admin/owner analytics pages.
- Dynamically import payment provider SDKs only when that payment tab is selected.
- Keep WhatsApp message generation as plain URL building, not an SDK dependency.

## Mobile UX

Implemented:

- Persistent bottom navigation.
- Sticky mobile order CTA on food item detail.
- Optional install prompt.
- Offline fallback route.
- Large touch controls.

Remaining:

- Add real device testing for iOS Safari bottom safe-area behavior.
- Validate checkout keyboard flow on low-end Android.
- Add analytics for abandoned checkout step and deep-link bounce rate once backend events are enabled.
