# Nammude Master Implementation Tracker

Last updated: 2026-07-03

This is the permanent single source of truth for planning and future Codex work.
Every future implementation task must read this file before changing code.

Do not rebuild completed modules. Reuse, extend, bug fix, or optimize the existing implementation.

## Release Metadata

| Field | Value |
| --- | --- |
| Current Sprint | POS/Kitchen production test checkpoint |
| Release Version | `0.1.0` |
| Latest Git Commit | `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6` |
| Active Branch | `release/production-nammude` |
| Hostinger Deployment | Last validated production deployment: `https://violet-squid-380447.hostingersite.com` at `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Build Date | 2026-07-03 |
| Verification Status | Passed local code validation and clean production build; production env/rules/deployment remain blocked |
| Scope | Production audit across codebase, security, performance, UX, Firestore, env, providers, and deployment readiness |

## Enterprise Project Dashboard

This file is now the single source of truth. `docs/TASK_TRACKER.md` is archived as a compatibility pointer and must not receive new task history.

| Field | Status |
| --- | --- |
| Overall Completion | 98% code-ready; 94% production-release ready pending manual env, rules, deployment, provider, hardware, and browser smoke validation. |
| Current Commit SHA | `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6` |
| Production SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` last validated on Hostinger |
| Hostinger SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` last verified deployment |
| Validation Status | Typecheck, lint, build, and diff checks passed for the POS/Kitchen production test checkpoint; hosted redeploy validation remains manual. |
| Last Updated | 2026-07-03 |
| Next Sprint | Production test checkpoint smoke: Hostinger env/cache/redeploy, manual browser/device/printer smoke, provider readiness checks, then deferred operational enhancements. |
| Estimated Remaining Work | 2-4 days manual/provider validation for release confidence; future roadmap work remains out of release scope. |
| Priority Owner | Manual for production access tasks; Codex only for confirmed bugs discovered during testing. |

### Phase Completion

| Phase | Completion | Status | Remaining Work |
| --- | --- | --- | --- |
| Architecture and repository migration | 100% | Completed | Maintain repository-first rules. |
| Customer module stabilization | 96% | Code-ready | Manual mobile/browser/provider smoke. |
| Owner operations | 98% | Code-ready | Manual view-switch and hosted session smoke. |
| Kitchen Operations Center | 99% | Code-ready | Manual tablet/TV, SSE, sound, swipe gesture, and printer smoke. |
| POS and printing | 98% | Code-ready | Manual device/printer and cashier permission smoke. |
| QR ordering and phone verification | 97% | Code-ready | Manual device, OTP, table-session smoke. |
| Enterprise Menu Master Library | 94% | Code-ready | Manual Admin library and owner template import smoke after redeploy. |
| Admin/CMS/platform operations | 94% | Code-ready | Provider/env and admin workflow smoke. |
| Production deployment | 75% | Manual pending | Hostinger env, cache clear, redeploy, hosted route validation. |
| Provider integrations | 55% | Gated | Razorpay, WhatsApp Cloud API, SMS, Meta, push, GPS remain provider-gated. |

### Module Completion

| Module | Completion | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Customer | 96% | Stabilized | Codex + Manual | Manual browser/device and provider validation remains. |
| Restaurant public pages | 96% | Stabilized | Codex + Manual | Public cache and profile completeness guards implemented. |
| Owner | 98% | Stabilized | Codex + Manual | View-switch password verification remains manual. |
| Kitchen | 99% | Stabilized | Manual | Mobile/tablet responsive board is optimized; real printer, TV, SSE, gestures, and sound checks remain. |
| POS | 98% | Stabilized | Manual | Hardware printer/device and permission smoke remains. |
| Admin | 94% | Stabilized | Manual | Provider/env-backed workflows need hosted smoke. |
| Staff | 90% | Implemented | Manual | Live staff permission matrix smoke remains. |
| Waiter/Table | 96% | Stabilized | Manual | QR/table device smoke remains. |
| Delivery | 70% | Framework | Future | Live GPS and partner dispatch are future roadmap. |
| Accounting | 85% | Implemented | Codex + Manual | Advanced reconciliation/refund process remains. |
| Inventory | 80% | Implemented | Future | Recipe/BOM auto-deduction remains future roadmap. |
| Offers/Marketing | 94% | Implemented | Manual | WhatsApp/Meta provider hardening remains gated. |
| CRM | 90% | Implemented | Manual | Live CRM/customer workflow smoke remains. |
| Notifications | 70% | Partial | Manual + Future | Email paths exist; SMS/push/WhatsApp provider adapters gated. |
| Analytics | 75% | Implemented/Partial | Future | Aggregate analytics strategy remains future work. |
| QR Ordering | 97% | Stabilized | Manual | Device/OTP/table lifecycle smoke remains. |
| Printing | 96% | Stabilized | Manual | Real paper/printer checks remain. |
| Phone Verification | 95% | Implemented | Manual | Firebase phone provider/device validation remains. |
| Master Menu Library | 94% | Implemented | Manual | Admin/owner import smoke remains. |

### Release Status

| Category | Status | Priority | Owner | Estimated Remaining Work |
| --- | --- | --- | --- | --- |
| In Progress | Release stabilization and manual production validation. | P0 | Manual + Codex for confirmed bugs | 2-4 days |
| Blocked | Hostinger env/cache access, SMTP/provider credentials, Firebase Console/rules access. | P0 | Manual | Access-dependent |
| Completed | QR, Kitchen, POS, Printing, Phone Verification, Owner Communication, Enterprise Menu Library, repository migration, documentation consolidation. | Done | Codex | None unless bugs found |
| Pending Features | Provider integrations, GPS, BOM, aggregate analytics, health dashboard, focused e2e suite. | P2-P3 | Manual + Codex | Future roadmap only |

### Architecture / Data / API Status

| Area | Status | Notes |
| --- | --- | --- |
| Architecture Status | Stable | No rebuilds approved; reuse existing modules and repositories. |
| Database Status | Stable with manual rule/index review pending | `masterMenuTemplates` and `phoneVerificationSessions` are now registered; rules/index deployment remains manual. |
| API Status | Stable | Public/customer/owner/admin API families are established; do not add duplicate routes. |
| Repository Status | Stable | Repository-first pattern is required for server Firestore work. |
| Security Status | Code-ready with manual checks | Auth separation, QR validation, and tenant guards are implemented; provider/env/rules validation remains manual. |
| Performance Status | Stable | Main risk is future large-flow bundle/code split work; no duplicate listener issue confirmed by current audit. |
| Testing Status | Local commands pass; focused e2e missing | Manual browser/device smoke and future e2e suite remain. |
| Deployment Status | Last validated SHA is older than current commit | Hostinger must be redeployed and `/api/release-info` verified. |
| Browser Validation Status | Manual pending | Customer, owner, admin, POS, Kitchen, QR, printer, and view-switch browser checks remain. |
| Documentation Status | Consolidated | This file is the single source of truth; `TASK_TRACKER.md` is archived. |

### Consolidated Completed History

History from `docs/TASK_TRACKER.md` has been consolidated here. High-signal completed milestones retained for future planning:

| Date | Completed Work |
| --- | --- |
| 2026-07-02 | Enterprise Menu Master Library; Kitchen Operations Center stabilization; tracker consolidation. |
| 2026-07-01 | QR session lifecycle, phone verification, menu image management, POS stabilization, bill printing, QR/table/search stabilization. |
| 2026-06-30 | QR table ordering baseline, operational view switch hardening, owner communication, customer reorder/contact workflows. |
| 2026-06-26 | Final enterprise production release baseline validated on Hostinger at SHA `35017398773ba04efbdc3ab37d250cfa547c0675`. |
| 2026-06-25 | Owner/admin/customer repository migration and production validation. |
| 2026-06-22 | Owner critical gap batch, pricing rules, Kitchen Operations Center redesign, owner labels, tracker/roadmap/changelog. |
| 2026-06-10 to 2026-06-15 | Theme system, public cache consistency, schedule later redesign, owner menu/API stability, service worker no-store guards. |
| 2026-06-01 to 2026-06-09 | Customer restaurant/menu stabilization, legal/CMS fixes, Firebase Admin key hardening, hosted Cafe diagnostics, mobile restaurant redesign. |
| 2026-05-31 | Auth session separation, baseline owner/customer/admin guardrails, public outage alert framework. |

### Unfinished Implementation Audit

Marker search performed on 2026-07-02 using `rg` for TODO/FIXME/HACK/TEMP/MOCK/STUB/PLACEHOLDER/NOT IMPLEMENTED/COMING SOON/DEMO/HARDCODED/console.log/fake/sample/dummy/legacy/deprecated/unused with build/dependency folders excluded. Many hits are intentional labels, UI placeholders, compatibility type names, or scripts. Actionable findings are:

| Severity | Finding | Evidence | Owner | Next Action |
| --- | --- | --- | --- | --- |
| Critical | Production deployment still points to older Hostinger SHA. | Metadata shows Hostinger `35017398773ba04efbdc3ab37d250cfa547c0675`, current Git `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6`. | Manual | Complete Hostinger env/cache/redeploy and verify `/api/release-info`. |
| Critical | Production env/provider access remains unverified. | MAN-002, MAN-003, MAN-004, MAN-006, MAN-007, MAN-008. | Manual | Validate Hostinger env, SMTP, Firebase domains, rules/indexes. |
| High | Cloud Functions remain placeholder-level for order confirmation, OTP hash comparison, and payment gateway secret calls. | `functions/src/index.ts` placeholder comments. | Manual + Codex | Keep disabled/gated until Cloud Functions provider review is requested. |
| High | Payment provider implementation remains partial/gated. | `src/services/payment-service.ts` placeholder; PAY-001/PAY-002. | Manual + Codex | Validate Razorpay order/verify/webhook before live launch. |
| High | Help page has a disabled “Coming soon” support action. | `src/app/help/page.tsx`. | Codex if requested | Replace only if confirmed as release-blocking UX bug. |
| Medium | Third-party delivery integration dialog appears configuration-only. | `src/components/orders/integration-dialog.tsx`. | Future | Treat as provider roadmap unless restaurant delivery aggregator launch is requested. |
| Medium | Compatibility names still include `DemoOrder`/`MockUser` and legacy mappers. | `src/types/entities.ts`, `src/lib/operational-api-mappers.ts`, owner/admin/POS compatibility paths. | Codex | Do not rename during release; plan only as future compatibility cleanup. |
| Medium | Production seed scripts retain demo/sample data paths behind flags. | `scripts/seed-firebase-production.mjs`, `SEED_SAMPLE_MENU_ITEMS`. | Manual | Keep sample flags off in production; dry-run cleanup if stale data appears. |
| Low | Dev scripts use `console.log` heavily. | `scripts/*.mjs`, HTTPS/dev utilities. | None | Acceptable for CLI scripts; not a user-facing runtime issue. |
| Low | Documentation still contains historical mock/placeholder language. | Older architecture docs. | Codex | Treat this master tracker as planning authority; update old docs only when touched. |

### Enterprise Gap Analysis

| Module | Missing / Pending Work | Priority | Owner |
| --- | --- | --- | --- |
| Customer | Manual mobile/tablet/desktop smoke; Google authorized-domain verification; SMTP/password reset provider smoke. | P1 | Manual |
| Restaurant/Public | Hosted cache/redeploy validation; stale demo/test-owner production data cleanup only if found. | P0 | Manual |
| Owner | Password-protected operational view switch browser verification. | P0 | Manual |
| Kitchen | Tablet/TV/SSE/sound/real KOT printer validation. | P1 | Manual |
| POS | Real 58mm/80mm/A4 printer output, cashier tablet ergonomics, permission smoke. | P1 | Manual |
| Admin | Hostinger/Admin CMS env and alert recipient validation; temporary password workflow provider email smoke. | P1 | Manual |
| Staff | Live role/permission matrix smoke across owner/kitchen/POS. | P2 | Manual + Codex if bug found |
| Waiter/Table | QR lifecycle smoke on real devices; session timeout/device replacement validation. | P1 | Manual |
| Delivery | Live partner GPS tracking is not implemented. | P3 | Future |
| Accounting | Refund/settlement process documentation and payment reconciliation review. | P2 | Manual + Codex |
| Inventory | Recipe/BOM auto-deduction remains future work. | P3 | Future |
| Offers/CRM | WhatsApp/Meta provider hardening and template policy remain gated. | P2 | Manual + Codex |
| Notifications | SMS, push, and WhatsApp Cloud API production adapters remain future/provider-gated. | P2-P3 | Manual + Codex |
| Analytics | Aggregate analytics collection/query strategy remains future work. | P2 | Codex |
| QR Ordering | Manual device and OTP provider smoke remains. | P1 | Manual |
| Printing | Hardware/paper/printer profile smoke remains. | P1 | Manual |
| Phone Verification | Firebase phone auth provider/device smoke remains. | P1 | Manual |
| Master Menu Library | Admin Menu Library and owner template import browser smoke remains after redeploy. | P1 | Manual |

### Next Enterprise Implementation Queue

Only unfinished work is listed. Do not start any item unless the user explicitly requests it or testing confirms it as a release blocker.

| Priority | ID | Work | Type | Owner | Estimate |
| --- | --- | --- | --- | --- | --- |
| P0 | MAN-002 | Validate Hostinger production env values. | Manual | Manual | 2-4 hours |
| P0 | MAN-006 | Clear cache, redeploy current Git SHA, verify hosted release info/routes. | Manual | Manual | 1-2 hours |
| P0 | MAN-001 | Browser-verify password-protected operational view switch. | Manual | Manual | 30 minutes |
| P0 | MAN-004 | Confirm SMTP sends for OTP, credentials, order/outage mail. | Manual | Manual | 1-2 hours |
| P1 | MAN-008 / SEC-001 | Review and deploy Firestore rules/indexes. | Manual + Codex | Manual + Codex | 0.5-1 day |
| P1 | RELEASE-SMOKE-001 | Manual customer/owner/admin/POS/Kitchen/QR/printer browser smoke after redeploy. | Manual | Manual | 0.5-1 day |
| P1 | PAY-001 | Razorpay sandbox/live order/verify/webhook validation. | Provider | Manual + Codex | 0.5 day |
| P2 | WA-001 / WA-002 | WhatsApp Cloud API provider hardening and template fallback policy. | Provider | Manual + Codex | 0.5-1 day |
| P2 | TEST-001 | Focused e2e smoke suite design. | Codex | Codex | 0.5 day |
| P2 | REPORT-001 | Aggregate analytics design. | Codex | Codex | 0.5-1 day |
| P3 | SMS/PUSH/META/DEL/INV | SMS, push, Meta, GPS delivery, inventory BOM. | Future roadmap | Manual + Codex | Later |

## 1. Executive Summary

Nammude is a Next.js App Router restaurant management and direct ordering platform with customer, owner, kitchen, waiter/table, POS, admin, delivery, marketing, accounting, printing, QR ordering, PWA, Firebase, and Hostinger deployment surfaces.

Current status: production release baseline is implemented and validated. The remaining final-release work is mostly manual deployment/configuration and external provider access.

This tracker exists to prevent duplicate implementation, duplicate APIs, duplicate repositories, duplicate Firestore collections, and accidental rewrites.

Authoritative implementation rules:

| Rule | Requirement |
| --- | --- |
| Planning source | Use this file before implementation. |
| Existing features | Document and reuse existing features; do not rewrite them. |
| Database | Do not add collections without checking `src/firebase/collections.ts`, repositories, APIs, and `docs/firestore-schema.md`. |
| APIs | Do not create a new API when an existing `/api/public`, `/api/customer`, `/api/owner`, `/api/admin`, `/api/payments`, or `/api/whatsapp` route covers the domain. |
| Repositories | Prefer `src/repositories/*` for owner/admin/server Firestore data access. |
| Services | Prefer `src/services/*` and `src/lib/server/*` for shared data/service logic. |
| UI | Reuse `src/components/ui`, `src/components/layout`, `src/components/flows`, and module components. |
| Verification | Run typecheck, lint, build, and `git diff --check` for implementation changes. |

## 2. Architecture Overview

Audit snapshot:

| Area | Count / Notes |
| --- | --- |
| `src/app` files | 190 |
| `src/components` files | 143 |
| `src/lib` files | 68 |
| `src/services` files | 31 |
| `src/modules` files | 23 |
| `src/repositories` files | 16 |
| `src/hooks` files | 15 |
| `src/stores` files | 9 |
| API route files | 65 |
| App page files | 98 |

Primary framework and runtime:

| Layer | Existing implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript 6 |
| Styling | Tailwind CSS 4, module theme tokens, shared typography |
| State | Zustand compatibility stores in `src/lib/app-store.ts`, `src/lib/cart-store.ts`, and facade exports in `src/stores` |
| Firebase client | `src/firebase/client.ts`, `src/firebase/index.ts`, `src/firebase/collections.ts` |
| Firebase admin/server | `src/firebase/admin.ts`, `src/lib/server/*`, repository classes |
| Validation | Zod schemas under `src/lib/schemas` |
| PWA | `public/sw.js`, `public/manifest.json`, `src/components/pwa/*`, offline queue utilities |
| Hosting | Hostinger production target with Firebase and Cloudinary integrations |

### Customer Module

Existing routes:

| Surface | Routes / files |
| --- | --- |
| Home and discovery | `/`, `/restaurants`, `/restaurant/[slug]` |
| Menu and item detail | `/restaurant/[slug]/menu`, `/restaurant/[slug]/item/[itemId]` |
| Cart and checkout | `/cart`, `/checkout`, `/order-success`, `/order/[id]` |
| Orders and tracking | `/orders`, `/track-order` |
| Account | `/profile`, `/account/profile`, `/account/support`, `/login`, `/signup`, `/forgot-password` |
| Offers and loyalty | `/offers`, `/loyalty` |
| Legal/help | `/terms`, `/privacy`, `/refund-policy`, `/cancellation-policy`, `/delivery-policy`, `/cookie-policy`, `/help` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Discovery | `src/components/flows/customer-discovery-home.tsx`, `src/components/flows/restaurant-browser-flow.tsx` |
| Restaurant detail/menu | `src/components/flows/restaurant-detail-flow.tsx`, `src/components/flows/customer-menu-flow.tsx` |
| Item detail | `src/components/flows/food-item-detail-flow.tsx` |
| Cart sync | `src/components/commerce/customer-cart-sync.tsx`, `src/app/api/customer/cart/route.ts` |
| Public data | `src/hooks/use-public-data.ts`, `src/services/public-data-service.ts`, `src/lib/server/public-firestore.ts` |
| Customer auth | `src/hooks/auth/use-customer-auth.ts`, `src/modules/shared/auth/customer-auth.ts` |

### Owner Module

Existing routes:

| Surface | Routes |
| --- | --- |
| Dashboard | `/owner`, `/owner/dashboard` |
| Operations | `/owner/orders`, `/owner/kitchen`, `/owner/pos`, `/owner/tables`, `/owner/printers` |
| Menu/business | `/owner/menu`, `/owner/menu/print`, `/owner/offers`, `/owner/settings`, `/owner/profile` |
| People/customers | `/owner/employees`, `/owner/customers`, `/owner/loyalty` |
| Finance/inventory | `/owner/inventory`, `/owner/accounting`, `/owner/reports` |
| Admin-like owner tools | `/owner/audit-logs`, `/owner/support`, `/owner/social-posts`, `/owner/digital-menu`, `/owner/onboarding` |
| Auth | `/owner/login`, `/api/owner/auth/login`, `/api/owner/auth/password-otp` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Owner shell/topbar | `src/components/layout/dashboard-shell.tsx`, `src/components/layout/dashboard-topbar.tsx`, `src/components/owner/topbar.tsx` |
| View switch | `src/components/owner/operational-view-switcher.tsx`, `src/hooks/use-operational-view.ts`, `src/app/api/owner/view-mode/route.ts` |
| Menu | `src/components/flows/owner-menu-management-flow.tsx`, `src/repositories/menu-repository.ts`, `src/app/api/owner/menu/route.ts` |
| Orders | `src/components/flows/owner-order-management-flow.tsx`, `src/repositories/order-repository.ts`, `src/app/api/owner/orders/route.ts` |
| Settings | `src/components/flows/owner-settings-flow.tsx`, `src/app/api/owner/profile/route.ts`, `src/app/api/owner/qr-settings/route.ts` |
| Tables/QR | `src/components/flows/restaurant-tables-flow.tsx`, `src/repositories/table-repository.ts`, `src/lib/server/table-qr.ts`, `src/app/api/owner/tables/route.ts` |
| Communication | `src/repositories/communication-repository.ts`, `src/app/api/owner/communication/route.ts` |

### Kitchen Module

Existing implementation:

| Concern | Existing files |
| --- | --- |
| KDS UI | `src/components/flows/kitchen-display-flow.tsx`, `/owner/kitchen` |
| Kitchen repository | `src/repositories/kitchen-repository.ts` |
| APIs | `src/app/api/owner/kitchen/route.ts`, `src/app/api/owner/kitchen/stream/route.ts` |
| Realtime | SSE stream and Firestore kitchen order snapshots |
| Print handoff | Existing KOT printing components and print engine |

### Waiter / Table Module

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Table management | `src/components/flows/restaurant-tables-flow.tsx`, `/owner/tables` |
| Customer QR ordering | `src/components/flows/table-qr-ordering-flow.tsx` |
| QR session APIs | `/api/public/table-order/session`, `/api/public/table-order/order`, `/api/public/table-order/request` |
| Table repository | `src/repositories/table-repository.ts` |
| QR signing | `src/lib/server/table-qr.ts` |

### POS

Existing implementation:

| Concern | Existing files |
| --- | --- |
| POS route | `/owner/pos`, legacy `/pos`, `/pos/tables`, `/pos/invoice` |
| POS flow | `src/components/flows/pos-billing-flow.tsx` |
| POS components | `src/modules/owner/pos/components/*` |
| POS state | `src/modules/owner/pos/pos-store.ts`, `src/stores/pos-store.ts` |
| POS API | `src/app/api/owner/pos/route.ts` |

### Admin

Existing routes:

| Surface | Routes |
| --- | --- |
| Dashboard/auth | `/admin`, `/admin/login` |
| CMS/master data | `/admin/cms`, `/admin/categories`, `/admin/cuisines`, `/admin/featured-menu-items` |
| Platform operations | `/admin/restaurants`, `/admin/users`, `/admin/roles`, `/admin/plans`, `/admin/subscriptions` |
| Support/diagnostics | `/admin/support`, `/admin/system/diagnostics`, `/admin/system/firebase-diagnostics` |
| Campaigns/social | `/admin/campaigns`, `/admin/social-queue`, `/admin/meta` |

Key implementation files:

| Concern | Existing files |
| --- | --- |
| Admin auth | `src/modules/shared/auth/admin-auth.ts`, `src/app/api/admin/auth/*` |
| Admin data | `src/repositories/admin-repository.ts`, `src/app/api/admin/data/route.ts` |
| CMS | `src/app/api/admin/cms/route.ts`, `src/app/api/public/cms/route.ts`, `src/services/cms/*` |
| Diagnostics | `src/app/api/admin/firebase-diagnostics/route.ts`, `src/services/firebase-diagnostics-service.ts` |

### Repository Layer

Canonical repositories:

| Repository | Domain |
| --- | --- |
| `accounting-repository.ts` | Accounting entries and reports |
| `admin-repository.ts` | Admin resource CRUD |
| `audit-repository.ts` | Audit logs and user sessions |
| `communication-repository.ts` | Communication settings/history |
| `customer-account-repository.ts` | Customer account profile/address/order data |
| `customer-repository.ts` | Owner customer records |
| `inventory-repository.ts` | Inventory, suppliers, purchases, audits |
| `kitchen-repository.ts` | Kitchen orders |
| `loyalty-repository.ts` | Loyalty rules/customers/transactions |
| `menu-repository.ts` | Owner menu writes |
| `offer-repository.ts` | Owner offer writes |
| `order-repository.ts` | Customer/owner orders and order consistency |
| `printer-repository.ts` | Printer profiles, receipt templates, print logs |
| `staff-repository.ts` | Staff and permissions |
| `table-repository.ts` | Restaurant tables, QR sessions, table actions |

### Firebase / Firestore

Canonical collection registry: `src/firebase/collections.ts`.

Do not add a collection without checking this list first:

```text
tenants, users, tenantUsers, branchUsers, userSessions, auditLogs,
restaurants, appCategories, appCuisines, roles, branches, tables,
menus, menuCategories, menuItems, deliveryMenus, dineInMenus, parcelMenus,
cuisines, menuVariants, modifierGroups, taxSettings, comboOffers,
menuSchedules, orders, orderItems, kitchenOrders, customers,
loyaltyAccounts, customerProfiles, customerOrders, customerLoyalty,
customerTransactions, customerPaymentMethods, customerSavedRestaurants,
customerCoupons, customerReviews, loyaltyCustomers, loyaltyRules,
offers, coupons, inventory, inventoryItems, inventoryTransactions,
purchaseEntries, purchaseOrders, suppliers, deliveries, deliveryAgents,
customerAddresses, campaigns, socialTemplates, socialPosts,
cateringRequests, callbackRequests, subscriptions, billTemplates,
kotTemplates, printerProfiles, printLogs, receipts, receiptTemplates,
paymentTransactions, reports, permissions, accountingTransactions,
expenseEntries, purchaseExpenses, salaryEntries, ledgerAccounts,
deliveryZones, accountingEntries, expenses, notifications,
staffActivityLogs, settings, kotPrintQueue, restaurantSettings,
restaurantTables
masterMenuTemplates, phoneVerificationSessions
```

Additional live collections found through API/repository scans:

```text
communicationSettings, communicationHistory, user_preferences,
supportIssues, paymentIntents, paymentWebhooks, whatsappEvents,
whatsappWebhooks, restaurant_stats, admin_restaurant_leads,
onboarding_checklists, emailOtps, modulePasswordOtps
```

These should be reconciled into documentation/registry before any future schema expansion.

### Authentication

Existing implementation:

| Surface | Existing files |
| --- | --- |
| Shared module session | `src/lib/server/module-auth.ts`, `src/lib/server-auth.ts` |
| Customer auth | `src/modules/shared/auth/customer-auth.ts`, `src/hooks/auth/use-customer-auth.ts` |
| Owner auth | `src/modules/shared/auth/owner-auth.ts`, `/api/owner/auth/*` |
| Admin auth | `src/modules/shared/auth/admin-auth.ts`, `/api/admin/auth/*` |
| Session bridge | `/api/auth/session`, `/api/auth/email-otp`, `/api/auth/test-session` |

### Storage / Images

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Cloudinary signing | `src/app/api/cloudinary/signature/route.ts`, `src/lib/server/cloudinary.ts` |
| Upload widget | `src/components/media/cloudinary-upload-widget.tsx` |
| Safe image handling | `src/components/media/safe-image.tsx`, `src/lib/image-optimization.ts` |
| Brand assets | `public/brand/*`, `public/icons/*`, `src/lib/brand-assets.ts` |
| Firebase Storage | Config/rules present; product images primarily use Cloudinary |

### Shared Components / Hooks / Utilities

Use these before creating new components:

| Concern | Existing files |
| --- | --- |
| UI primitives | `src/components/ui/*` |
| Layout | `src/components/layout/*` |
| State feedback | `src/components/state/*` |
| Commerce widgets | `src/components/commerce/*` |
| Printing | `src/components/printing/*`, `src/lib/print-engine.ts` |
| Schedule | `src/components/schedule/*`, `src/lib/schedule-slots.ts` |
| Maps/location | `src/components/maps/*`, `src/hooks/use-location-commerce.ts` |
| Auth hooks | `src/hooks/use-auth-user.ts`, `src/hooks/auth/use-customer-auth.ts` |
| Public data hooks | `src/hooks/use-public-data.ts`, `src/hooks/use-public-app-name.ts` |
| Owner data hooks | `src/hooks/use-owner-repository-data.ts`, `src/hooks/use-operational-view.ts` |

### Caching / Realtime / Offline

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Public cache | `src/lib/server/public-cache.ts`, `src/lib/public-cms-cache.ts`, `src/lib/cache.ts` |
| Service worker | `public/sw.js` |
| Offline queue | `src/lib/offline/*`, `src/components/offline/*` |
| Realtime order hooks | `src/hooks/use-restaurant-orders.ts`, `src/hooks/use-realtime-order.ts` |
| Public listeners | `src/hooks/use-public-data.ts`, `src/services/public-data-service.ts` |
| Kitchen stream | `/api/owner/kitchen/stream` |

### Communication / Notifications

Existing implementation:

| Concern | Existing files |
| --- | --- |
| SMTP / OTP | `src/lib/server/module-auth.ts`, `/api/auth/email-otp`, `/api/public/order-notification` |
| Owner communication settings | `/api/owner/communication`, `communication-repository.ts` |
| WhatsApp browser handoff | `src/services/whatsapp-service.ts`, `src/hooks/useWhatsAppShare.ts`, `src/components/WhatsAppShareModal.tsx` |
| WhatsApp Cloud API | `/api/whatsapp/send`, `/api/whatsapp/webhook` |
| Public outage alerts | `src/lib/server/public-outage-alert.ts`, Admin CMS alert settings |
| Push notifications | Framework/placeholder only; not production implemented |

### Printing

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Print engine | `src/lib/print-engine.ts` |
| Bill/KOT components | `src/components/printing/restaurant-bill.tsx`, `src/components/printing/kot-ticket.tsx` |
| Printer API/repository | `/api/owner/printers`, `src/repositories/printer-repository.ts` |
| POS bill preview | `src/components/flows/pos-billing-flow.tsx` |

### Analytics / Settings / SEO / Theme

Existing implementation:

| Concern | Existing files |
| --- | --- |
| Analytics | `src/services/analytics-service.ts`, `/api/owner/analytics`, Admin analytics pages |
| Settings | Owner/Admin settings routes, `restaurantSettings`, `settings`, `user_preferences` |
| SEO | `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, item OpenGraph route |
| Theme | `themes/*`, `src/themes/*`, `src/lib/theme-provider.tsx`, `npm run theme:contrast` |

## Architecture Decision Records (ADR)

| ADR | Decision | Reason | Alternative | Tradeoffs |
| --- | --- | --- | --- | --- |
| ADR-001 Repository Pattern | Use `src/repositories/*` as the preferred server-side Firestore domain layer. | Keeps owner/admin/server writes centralized, tenant-aware, and easier to audit. | Direct Firestore calls in every API route. | Repositories add indirection, but reduce duplicate reads/writes and schema drift. |
| ADR-002 Repository-first Firestore | New server mutations should reuse repositories before adding route-local database logic. | Existing migration validated repository-backed owner/admin/customer data paths. | Build new services per route. | Requires checking existing repository contracts before coding. |
| ADR-003 QR Device Binding | QR sessions bind table, device/session metadata, expiry, idle timeout, and request/order validation. | Reduces table hijacking, stale QR use, and cross-device order/request spoofing. | Token-only QR links without session checks. | More session state and stricter customer flow, but safer dine-in operations. |
| ADR-004 Operational View Protection | Owner operational view switching requires guarded session handling and password confirmation for protected switches. | Prevents accidental or unauthorized switching into Kitchen/POS/Owner workspaces. | Plain client-side mode toggle. | Adds a manual verification requirement and recovery states. |
| ADR-005 Shared Public Cache | Public restaurants/menu/offers/CMS use shared cache helpers with no-store guards where dynamic freshness matters. | Prevents stale customer catalog data while reducing repeated Firestore reads. | Browser/local-only cache or no cache. | Cache invalidation must remain carefully scoped. |
| ADR-006 Theme System | Customer, owner, and admin use separate theme token files with shared typography. | Keeps each surface independently branded while preserving consistency. | One global theme for every surface. | More token files, but fewer cross-surface visual regressions. |
| ADR-007 Offline Strategy | Offline queue and sync are scoped to owner/POS operational routes. | Avoids customer/admin side effects and limits retries to operational writes. | Global offline sync across all modules. | Narrower offline support, but safer module boundaries. |
| ADR-008 Service Worker Strategy | Service worker caches only safe static assets and bypasses dynamic customer catalog, RSC, and Next router data. | Prevents stale page/RSC bugs and stale restaurant/menu data. | Aggressive app-shell caching. | Less offline page caching, but production data freshness is safer. |
| ADR-009 Realtime Strategy | Realtime listeners and SSE are used for operational data with explicit cleanup. | Kitchen, orders, public data, and auth need live updates without leaks. | Polling everywhere. | Listener lifecycle must be audited; lower latency and fewer repeated reads. |
| ADR-010 Cloudinary-first Images | Product/banner/profile uploads use Cloudinary signing and URLs; Firebase Storage remains mostly diagnostic/fallback. | Better image CDN/transformation support and simpler public delivery. | Firebase Storage for all images. | Requires Cloudinary env and provider health monitoring. |
| ADR-011 Module Session Isolation | Admin, owner, and customer sessions are scoped separately. | Prevents same-browser role leakage and cross-module redirects. | One shared role/session cookie. | More auth routes/cookies, but safer multi-role workflows. |
| ADR-012 Print Engine Reuse | Bill/KOT/receipt printing extends one print engine and printer API/repository. | Prevents duplicate print templates, logs, and printer settings. | Separate print paths per screen. | Shared engine needs careful option handling, but keeps audit and paper sizing consistent. |

## 3. Current Project Status

| Area | Status | Notes |
| --- | --- | --- |
| Customer ordering | Implemented | Public catalog, cart, checkout, scheduled ordering, order history, reviews, support. |
| Owner operations | Implemented | Dashboard, orders, menu, offers, kitchen, tables, POS, printers, staff, inventory, accounting, settings. |
| Admin | Implemented | CMS, master data, restaurant/user/subscription management, support, diagnostics. |
| QR ordering | Implemented | Signed table QR, customer session/order/request flow, owner session actions. |
| Printing | Implemented | Bill/KOT, paper sizes, duplicate/customer/cashier/kitchen copies, logs. |
| Communication | Implemented | Owner communication settings, SMTP/WhatsApp handoff, outage alerts. |
| Payments | Partially implemented | Razorpay order/verify/webhook routes exist; live credentials/provider review remain manual. |
| Push/SMS | Placeholder | SMS and browser push are framework/planning only. |
| Delivery live tracking | Partially implemented | Delivery routes and status flows exist; real partner GPS tracking is framework-level. |
| Meta integration | Placeholder/partial | Admin Meta page and marketing flows exist; production OAuth/publishing needs provider hardening. |
| Production deployment | Partially manual | Hostinger release validated previously; latest env/cache/redeploy tasks remain manual. |

## Feature Flags

Feature flags are documented control points for future implementation and rollout planning. Do not add runtime flags without checking existing env parsing in `src/lib/env.ts`, owner/admin settings, and this tracker.

| Feature | Suggested Flag / Setting | Current State | Source of Truth | Rollout Notes |
| --- | --- | --- | --- | --- |
| QR Ordering | `qrOrdering.enabled` in `restaurantSettings` | Implemented | Owner QR settings and table repository | Keep enabled per restaurant/table; preserve signed token validation. |
| Push Notifications | `notifications.push.enabled` | Placeholder | Future notification settings | Requires VAPID/provider decision, service worker subscription storage, opt-in UI. |
| Offline Mode | `offline.ownerPos.enabled` | Implemented for owner/POS scope | Existing offline queue/sync scope | Keep scoped to owner/POS unless a separate customer offline design is approved. |
| Bill Printing | `printing.enabled` and printer profile settings | Implemented | Printer profiles, receipt templates, print engine | Disable by printer profile or UI action, not by deleting print engine paths. |
| Payments | `payments.razorpay.enabled` | Partially implemented | Env keys and payment settings | Must remain off/limited until live keys and webhook validation pass. |
| SMS | `communication.sms.enabled` | Placeholder | Owner communication settings | Requires provider adapter and manual provider setup. |
| WhatsApp | `communication.whatsapp.enabled` | Partial | Owner communication settings and env keys | Browser handoff works; Cloud API requires provider hardening. |
| Delivery | `delivery.enabled` | Partial/framework | Delivery routes/settings | Live GPS and partner dispatch require separate launch readiness. |
| Loyalty | `loyalty.enabled` | Implemented | Loyalty rules/API/repository | Future changes should reuse existing loyalty rules. |
| Reviews | `reviews.enabled` | Implemented | Public reviews API and customer reviews collection | Preserve completed-order constraints. |
| Marketing | `marketing.social.enabled` | Partial | Studio/admin marketing settings | Meta publishing remains provider-gated. |
| Database Alerts | `operations.databaseAlerts.enabled` | Implemented | Admin CMS and `DATABASE_ALERT_EMAIL` | Manual env and CMS recipient setup required. |

## Notification Architecture

Future notification work must use one reusable framework instead of separate per-channel implementations.

```text
Notification Service
  -> Notification Policy
  -> Channel Adapter
    -> Email
    -> SMS
    -> WhatsApp
    -> Push
    -> In-App
  -> Delivery Log
  -> Retry / Dead-letter Queue
```

| Layer | Responsibility | Existing / Future Anchor |
| --- | --- | --- |
| Notification Service | Accepts domain events, resolves recipients, applies preferences, chooses channels. | Future shared service; reuse owner communication settings and public outage alert patterns. |
| Notification Policy | Decides allowed channel, priority, throttling, quiet hours, and fallback order. | Owner communication settings, Admin CMS alert settings. |
| Channel Adapter | Normalizes provider-specific send, status, retry, and error mapping. | Future adapters under `src/services` or `src/lib/server`. |
| Email Adapter | SMTP send for OTP, owner credentials, order/outage alerts. | Existing SMTP code in module auth, email OTP, owner credentials, order notification. |
| SMS Adapter | Provider-backed SMS send and delivery status. | Future `SMS-001`; no production provider yet. |
| WhatsApp Adapter | WhatsApp Cloud API send/webhook and browser handoff. | Existing `/api/whatsapp/*`, WhatsApp services, share modal. |
| Push Adapter | Web Push subscription send and unsubscribe cleanup. | Future `PUSH-001`; service worker exists but push is not implemented. |
| In-App Adapter | Stored user/role notifications and read state. | Existing `notifications` collection seed paths; needs productized contract. |
| Delivery Log | Stores attempt id, channel, recipient hash/reference, status, provider id, error code. | Reuse/audit `communicationHistory`, `whatsappEvents`, future notification logs. |
| Retry Queue | Retries transient failures and dead-letters permanent failures. | Future queue; do not overload customer/order writes. |

Notification standards:

| Standard | Requirement |
| --- | --- |
| Privacy | Never log raw secrets, OTP values, provider tokens, or full private customer data. |
| Idempotency | Every event should have a deterministic notification key to avoid duplicate sends. |
| Tenant isolation | Every restaurant-scoped notification must include tenant/restaurant context. |
| Fallback | Channel fallback order must be policy-driven, not hardcoded in screens. |
| Audit | Every provider send attempt needs a non-sensitive delivery record. |

## 4. Completed Features

Protected completed features:

| Feature | Status |
| --- | --- |
| Production release baseline | Completed and validated on Hostinger on 2026-06-26 |
| Enterprise Menu Master Library | Completed 2026-07-02 |
| Global search autofill regression | Completed 2026-07-01 |
| Enterprise bill printing stabilization | Completed 2026-07-01 |
| Enterprise QR customer/session workflow | Completed 2026-07-01 |
| QR/table/search stabilization | Completed 2026-07-01 |
| Production QR table ordering baseline | Completed 2026-06-30 |
| Operational view switch hardening | Completed 2026-06-30; manual password verification remains |
| Firestore-backed owner communication | Completed 2026-06-30 |
| Owner repository migration batch | Completed 2026-06-24 through 2026-06-25 |
| Admin/customer repository validation | Completed 2026-06-26 |
| Owner critical gap batch | Completed 2026-06-22 |
| Theme system redesign | Completed 2026-06-10 |
| Public catalog/cache consistency | Completed 2026-06-10 |
| Legal/CMS rendering repair | Completed 2026-06-09 |
| Hostinger Firebase Admin private-key hardening | Completed 2026-06-09 |
| Dependency maintenance | Completed 2026-06-08 |
| Owner menu enterprise wizard/list | Completed 2026-06-01 through 2026-06-03 |
| Customer restaurant mobile/tablet redesign | Completed 2026-06-03 |
| Auth session separation | Completed 2026-05-31 |
| PWA/service worker cache guards | Completed |

## 5. Protected Features

Future tasks must not rebuild these modules:

| Protected module | Reuse / extension point |
| --- | --- |
| Owner Dashboard and topbar | Extend `dashboard-shell`, `dashboard-topbar`, owner widgets. |
| Operational View Switch | Patch `operational-view-switcher`, `use-operational-view`, `/api/owner/view-mode`. |
| Owner Menu | Extend existing flow, repository, and owner menu API. |
| Owner Orders | Extend existing flow, repository, and owner orders API. |
| Kitchen Display System | Extend `kitchen-display-flow`, kitchen repository/API/stream. |
| POS Billing | Extend `pos-billing-flow`, `src/modules/owner/pos/*`, `/api/owner/pos`. |
| Table/QR Ordering | Extend `restaurant-tables-flow`, `table-qr-ordering-flow`, table repository, QR APIs. |
| Printing | Extend `print-engine`, printing components, printer repository/API. |
| Owner Communication | Extend communication repository/API/settings flow. |
| Public Catalog | Extend public data service/server Firestore helpers; preserve no-store/cache guards. |
| Customer Cart Sync | Extend customer cart API and cart sync component. |
| Auth Session Scoping | Extend module-auth/session APIs; preserve role cookie separation. |
| Theme System | Extend token files and run contrast validation. |
| Service Worker | Preserve static-only/dynamic no-store guards. |
| Legal/CMS | Extend Admin CMS and sanitized legal renderer. |
| Cloudinary Uploads | Use signing route and upload widget. |

## 6. Do Not Modify List

Do not modify unless the task explicitly requires a bug fix in that area:

| Area | Reason |
| --- | --- |
| Firestore collection names | Existing data and repositories depend on them. |
| Existing API route contracts | Customer/owner/admin flows depend on stable response shapes. |
| `src/firebase/collections.ts` | Registry must remain stable unless schema work is approved. |
| `src/lib/app-store.ts` and `src/lib/cart-store.ts` persistence keys | Existing client data depends on them. |
| `src/stores/*` facades | Migration-safe compatibility layer. |
| `/api/public/*` no-store behavior | Prevents stale customer catalog data. |
| `public/sw.js` dynamic route bypasses | Prevents stale RSC/page cache bugs. |
| Owner/admin/customer auth separation | Prevents cross-role session leakage. |
| Hostinger env private-key normalization | Production stability dependency. |
| QR token signing/verification | Security and table-session consistency dependency. |
| Printer log/write paths | Operational audit dependency. |

## 7. Remaining Features

Remaining work is split into Codex implementation tasks and Manual/external tasks. Manual tasks must not be mixed with Codex implementation tasks.

Task review result: no application feature work is approved by this documentation pass. Provider tasks were split from broad integration tasks, manual deployment tasks remain separate, and all remaining tasks now carry explicit dependencies, acceptance criteria, verification, and ownership.

| ID | Priority | Description | Dependencies | Complexity | Status | Acceptance Criteria | Verification Checklist | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAN-001 | P0 | Manually verify owner password-protected operational view switch in browser. | Owner credentials; hosted or local app. | Low | Pending | Wrong password is rejected; correct password switches view; retry/cancel recovery works. | Browser check Owner to Kitchen/POS/Owner; verify no console errors. | Manual |
| MAN-002 | P0 | Add/confirm required production environment variables in Hostinger. | Hostinger hPanel access; real provider credentials. | Medium | Pending | Production-equivalent env satisfies `scripts/validate-production-env.mjs`. | Confirm Firebase Admin/public, Cloudinary, SMTP, Mapbox, Google OAuth, Razorpay, alert values. | Manual |
| MAN-003 | P0 | Set `DATABASE_ALERT_EMAIL` and save matching Admin CMS alert recipient. | MAN-002; Admin access. | Low | Pending | Hosting and Admin CMS have the same outage recipient. | Inspect Hostinger env and Admin CMS; confirm customer outage copy stays non-technical. | Manual |
| MAN-004 | P0 | Confirm SMTP credentials and outbound email delivery. | MAN-002; SMTP provider access. | Medium | Pending | OTP, owner credentials, order notification, and outage alert paths can send. | Test representative SMTP sends and inspect sanitized logs. | Manual |
| MAN-005 | P1 | Run production seed/cleanup only if hosted Firestore still contains old `test-owner` records. | Firebase Admin credentials; backup/review. | Medium | Conditional | No stale demo/test owner records leak into production. | Dry-run first; apply only exact reviewed cleanup; verify public APIs after cleanup. | Manual |
| MAN-006 | P0 | Clear Hostinger cache and redeploy latest GitHub commit. | MAN-002; Hostinger deployment access. | Medium | Pending | Hosted app serves latest release metadata and current UI copy. | Verify `/api/release-info`, `/`, `/owner/login`, `/owner/pos`, `/admin/login`. | Manual |
| MAN-007 | P1 | Confirm Firebase authorized domains for Google sign-in. | Firebase Console access; final domain. | Low | Pending | Hosted and final custom domains are authorized for Google/Firebase auth. | Google sign-in smoke on hosted domain. | Manual |
| MAN-008 | P1 | Deploy Firestore rules and indexes when changed. | Firebase Console/CLI access; SEC-001 output. | Medium | Pending | Rules/indexes match current queries and deployed project. | Firebase deploy output; admin diagnostics; protected route smoke. | Manual |
| PAY-001 | P1 | Validate Razorpay live/sandbox order, verify, and webhook flow. | MAN-002; Razorpay account; payment env. | Medium | Not started | Payment order creation, verification, webhook signature, and `paymentIntents` persistence are verified. | Sandbox/live smoke, invalid signature test, paymentIntent inspection. | Manual + Codex |
| PAY-002 | P2 | Document and validate refund/settlement operational process. | PAY-001; business refund policy. | Medium | Not started | Refund responsibility, support workflow, and reconciliation notes are documented. | Policy review, owner/admin workflow review, accounting impact notes. | Manual + Codex |
| WA-001 | P2 | Harden WhatsApp Cloud API provider configuration. | MAN-002; Meta app; token; phone number id; webhook token. | Medium | Placeholder/partial | `/api/whatsapp/send` and webhook are provider-verified with safe error handling. | Send test message/template; inspect `whatsappEvents` and `whatsappWebhooks`. | Manual + Codex |
| WA-002 | P2 | Define WhatsApp template approval and fallback policy. | WA-001; Meta template approval. | Low | Not started | Template names, fallback to browser handoff, and failure handling are documented. | Template review, fallback smoke, communication settings review. | Manual + Codex |
| SMS-001 | P2 | Select and document SMS gateway requirements. | Provider decision; budget; compliance. | Low | Not started | Provider, sender id, OTP/transactional rules, and env needs are documented. | Provider checklist and env checklist reviewed. | Manual |
| SMS-002 | P2 | Implement future SMS channel adapter. | SMS-001; notification architecture. | Medium | Placeholder | SMS tests and order notifications use configured provider adapter. | Provider test send, failure handling, no secret leakage. | Manual + Codex |
| PUSH-001 | P3 | Implement future browser push notification subscriptions. | VAPID/provider decision; notification architecture; service worker review. | High | Placeholder | Customers/staff can opt in; subscriptions are stored and removable. | Permission flow, subscription storage, unsubscribe, server send test. | Codex |
| META-001 | P3 | Harden Meta/Instagram OAuth and publishing. | Meta app review/access; marketing settings. | High | Placeholder/partial | Admin Meta page can connect, refresh tokens, and publish approved campaigns. | OAuth, token refresh, publish, error-state validation. | Manual + Codex |
| DEL-001 | P3 | Implement future delivery partner GPS tracking. | Delivery app/provider decision; maps settings; privacy policy review. | High | Framework | Live locations are scoped securely and visible only to eligible views. | Permission flow, throttling, map rendering, privacy review. | Codex |
| INV-001 | P3 | Add future recipe/BOM auto-deduction from inventory. | Final inventory accounting rules; owner recipe data model review. | High | Placeholder | Completed orders decrement mapped ingredients and write auditable movements. | Unit tests, order completion smoke, inventory transaction audit. | Codex |
| REPORT-001 | P2 | Design aggregate analytics collections and query strategy. | Firestore index/cost strategy; current report parity. | Medium | Not started | Aggregate schema and update sources are documented before implementation. | Query count estimate, index list, migration/rollback notes. | Codex |
| REPORT-002 | P2 | Implement future aggregate analytics population. | REPORT-001; SEC-001. | High | Not started | Owner/admin reports avoid scanning high-volume raw collections. | Load test query counts, report parity, index deployment. | Codex |
| HEALTH-001 | P2 | Design future operational health dashboard. | Operational health section in this tracker. | Medium | Not started | Firebase, Functions, SMTP, SMS, WhatsApp, Push, Printer, Storage, Payments, Queues health sources are defined. | Health source checklist and manual/provider access checklist. | Codex |
| RBAC-001 | P2 | Audit role-specific dashboards/navigation before any new dashboard work. | Existing RBAC; operational view; staff permissions. | Medium | Pending audit | No duplicate dashboards; role routing reuses owner/kitchen/POS surfaces. | Permission matrix check, protected route smoke. | Codex |
| TEST-001 | P2 | Design focused e2e smoke suite for core release flows. | Stable test runner decision; auth fixture strategy. | Medium | Not started | Customer, owner, admin, QR, POS, printing smoke scope is documented. | Proposed `npm run test:e2e` or equivalent command and route matrix. | Codex |
| TEST-002 | P2 | Implement future focused e2e smoke suite. | TEST-001. | Medium | Not started | Core release flows run repeatably in local/staging. | Test command, CI/local output, screenshots where applicable. | Codex |
| PERF-001 | P2 | Audit large flow components and route bundles. | Current production behavior stable. | Medium | Not started | Highest-risk large flows and candidate splits are documented. | Build, route smoke, bundle comparison. | Codex |
| KDS-001 | P3 | Improve future kitchen board virtualization and TV styling. | PERF-001; current KDS baseline. | Medium | Deferred | Large kitchen queues render smoothly on TV/tablet. | Browser performance check, fullscreen visual check. | Codex |
| ORDER-001 | P3 | Continue future owner Order Desk mobile redesign. | Existing owner order flow; RBAC-001. | Medium | Deferred | Mobile order management is dense, readable, and action-complete. | Mobile viewport screenshot, lint/build. | Codex |
| SEC-001 | P1 | Review Firestore rules/indexes against current collections and query patterns. | Firebase Console/CLI access; collection registry reconciliation. | Medium | Manual pending | Rules/indexes match current collections and protected paths. | Deploy rules/indexes in target project; Firebase diagnostics pass. | Manual + Codex |
| DOC-001 | P1 | Keep this master tracker current after every future task. | None. | Low | Active | New tasks/completions update this file. | Review diff contains tracker update for project changes. | Codex |

## Feature Dependency Graph

| ID | Dependencies | Prerequisites | Blocked By | Unlocks | Future Dependencies |
| --- | --- | --- | --- | --- | --- |
| MAN-001 | Owner credentials; app access | Existing operational view implementation | Manual browser access | Final release confidence | None |
| MAN-002 | Hostinger access | Real provider credentials | External hosting/provider access | MAN-003, MAN-004, MAN-006, PAY-001, WA-001 | SEC-001, HEALTH-001 |
| MAN-003 | MAN-002 | Admin CMS access | Missing alert recipient decision | Outage alert readiness | Notification service policy |
| MAN-004 | MAN-002 | SMTP provider access | Invalid SMTP credentials | OTP/email production readiness | Notification email adapter |
| MAN-005 | Firebase Admin access | Dry-run cleanup review | Unverified production data state | Cleaner public production data | SEC-001 |
| MAN-006 | MAN-002 | Hostinger deployment access | Deployment/cache access | Hosted release validation | MAN-001, PAY-001, WA-001 |
| MAN-007 | Firebase Console access | Final domain decision | Missing domain/SSL | Google sign-in production readiness | MAN-006 |
| MAN-008 | SEC-001 | Firebase CLI/Console access | Rules/index review not complete | Secure production data access | REPORT-002 |
| PAY-001 | MAN-002 | Razorpay env and account | Provider credentials/webhook access | Live payment readiness | PAY-002, HEALTH-001 |
| PAY-002 | PAY-001 | Business refund policy | Payment flow not validated | Payment support/reconciliation process | Accounting/reporting refinements |
| WA-001 | MAN-002 | Meta app and WhatsApp credentials | Provider access/template state | WhatsApp API readiness | WA-002, notification adapter |
| WA-002 | WA-001 | Approved templates | Meta approval | Customer/owner communication fallback rules | Notification policy |
| SMS-001 | Provider decision | Compliance and sender rules | No SMS provider selected | SMS implementation scope | SMS-002 |
| SMS-002 | SMS-001 | Notification architecture | Provider credentials | SMS notification channel | HEALTH-001 |
| PUSH-001 | Notification architecture | VAPID/provider decision | Push provider/design not selected | Browser push channel | HEALTH-001 |
| META-001 | Meta app access | OAuth app review | Provider access/app approval | Social publishing | Marketing analytics |
| DEL-001 | Maps/settings/privacy | Delivery tracking design | Delivery app/provider decision | Live delivery tracking | Notification ETA alerts |
| INV-001 | Inventory accounting rules | Recipe/BOM data design | Business rules not finalized | Auto stock deduction | Reporting/accounting refinements |
| REPORT-001 | Firestore cost/index strategy | Current report parity | Data volume model | REPORT-002 | HEALTH-001 |
| REPORT-002 | REPORT-001, SEC-001 | Aggregate schema | Index/rules not ready | High-volume reports | Scheduled reports |
| HEALTH-001 | MAN-002, provider tasks | Monitoring source list | Missing provider access | Operational dashboard implementation | Alert routing, notification service |
| RBAC-001 | Existing RBAC/staff permissions | Permission matrix | None | Role-safe dashboard work | ORDER-001 |
| TEST-001 | Test runner decision | Auth fixture strategy | No test stack decision | TEST-002 | CI checks |
| TEST-002 | TEST-001 | Test environment | Test design not approved | Repeatable release smoke | CI gating |
| PERF-001 | Stable baseline | Build/bundle inspection | None | KDS-001, future code splitting | TEST-002 |
| KDS-001 | PERF-001 | KDS performance target | Deferred priority | Better TV/large-queue KDS | TEST-002 |
| ORDER-001 | RBAC-001 | Mobile order UX target | Deferred priority | Better mobile owner order desk | TEST-002 |
| SEC-001 | Collection registry review | Firebase access | External access | MAN-008, REPORT-002 | Security hardening |
| DOC-001 | None | Tracker read/update discipline | None | All future tasks | Always active |

## 8. Technical Debt

Audit findings:

| ID | Category | Finding | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| DEBT-001 | Duplicate compatibility state | `src/lib/cart-store.ts` and `src/stores/cart-store.ts`; `src/lib/app-store.ts` and domain facades coexist. | Accidental edits in wrong layer. | Treat `src/lib/*` as compatibility roots and `src/stores/*` as facades until a planned migration. |
| DEBT-002 | Duplicate components by name | `restaurant-card.tsx`, `sound-settings.tsx`, `useAlert.ts` exist in different domains. | Import confusion. | Document ownership; consolidate only in a dedicated refactor with visual checks. |
| DEBT-003 | Menu data duplication | `menus`, `menuItems`, `dineInMenus`, `parcelMenus`, `deliveryMenus` are all live/legacy-compatible. | Inconsistent reads/writes if one path is skipped. | Any menu task must check owner repository, public Firestore fallback, seed/cleanup scripts, and channel menus. |
| DEBT-004 | Collection registry drift | Some live collections are used outside `COLLECTIONS`. | Schema docs can fall behind code. | Reconcile additional live collections before schema expansion. |
| DEBT-005 | API/repository overlap | Some route handlers still directly access Firestore while repositories also exist. | Duplication and uneven validation. | New server writes should prefer repositories; migrate direct access only as scoped refactor. |
| DEBT-006 | Placeholder provider integrations | WhatsApp, SMS, push, delivery GPS, Meta, and parts of payment/provider flows need production provider review. | False sense of completeness. | Keep as tracked future tasks, not release blockers unless provider launch is requested. |
| DEBT-007 | Large flow components | Several high-value flows are large (`restaurant-detail-flow`, `owner-menu-management-flow`, `pos-billing-flow`, `restaurant-tables-flow`). | Harder maintenance and higher regression risk. | Split only behind tests/visual checks and without behavior changes. |
| DEBT-008 | Console logging | Operational scripts and some runtime paths log warnings/errors. | Noise if user-facing logs leak detail. | Keep server logs sanitized; audit client logs before production support hardening. |
| DEBT-009 | QR secret fallback | `TABLE_QR_SECRET` falls back to other env/dev default. | Token stability/security depends on env hygiene. | Set explicit `TABLE_QR_SECRET` in production if long-lived QR security is required. |
| DEBT-010 | Old docs conflicts | Older docs still mention mock/Firebase migration states that are partially outdated. | Future duplicate work. | Treat this file as planning authority; update older docs only when directly touched. |

## 9. Known Bugs

| ID | Priority | Bug / Concern | Status | Owner |
| --- | --- | --- | --- | --- |
| BUG-001 | P0 | Owner password-protected operational view switch still requires manual browser verification. | Pending manual | Manual |
| BUG-002 | P0 | Hostinger may still serve stale metadata/copy until cache clear/redeploy. | Pending manual | Manual |
| BUG-003 | P1 | Production env may still be incomplete for SMTP/database alerts/provider integrations. | Pending manual | Manual |
| BUG-004 | P2 | Provider-backed WhatsApp/SMS/push flows are incomplete by design. | Tracked | Manual + Codex |

## 10. Production Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing Hostinger env vars | Auth, Firebase Admin, Cloudinary, SMTP, maps, payments, alerts fail. | Complete MAN-002 and run `npm run validate:prod-env`. |
| SMTP misconfiguration | OTP/owner credentials/order/outage emails fail. | Complete MAN-004. |
| Stale Hostinger cache | Users see old metadata/copy/routes. | Complete MAN-006. |
| Firestore rules/index drift | Production API or realtime reads fail. | Complete SEC-001. |
| Provider placeholder launch | SMS/push/WhatsApp/Meta expectations exceed implementation. | Keep provider tasks explicitly tracked. |
| Menu collection duplication | Customer menu may miss owner changes if write/read path diverges. | Use existing repository/API/public mapping before edits. |
| Service worker caching regression | Stale customer/owner/admin pages. | Preserve `public/sw.js` bypass/no-store rules. |
| QR token env fallback | QR tokens may become invalid across env changes. | Pin production QR secret before broad QR print rollout. |

## 11. Manual Deployment Tasks

Manual tasks must be run by someone with external access:

| ID | Task |
| --- | --- |
| MAN-001 | Owner password-protected view switch browser verification. |
| MAN-002 | Add/confirm Hostinger production environment variables. |
| MAN-003 | Set `DATABASE_ALERT_EMAIL` and Admin CMS alert recipient. |
| MAN-004 | Confirm SMTP settings and delivery. |
| MAN-005 | Run production seed/cleanup if old test-owner records remain. |
| MAN-006 | Clear Hostinger cache, redeploy latest commit, and verify hosted routes. |
| MAN-007 | Confirm Firebase authorized domains for Google sign-in. |
| MAN-008 | Deploy Firestore rules and indexes when changed. |
| MAN-009 | Configure Razorpay live keys/webhook before live payment launch. |
| MAN-010 | Configure Meta/WhatsApp/SMS provider accounts before provider launch. |
| MAN-011 | Confirm domain, SSL, and final `NEXT_PUBLIC_APP_URL`. |

## 12. Future Roadmap

Roadmap items are not approved for implementation unless the user explicitly requests them:

| Area | Future work |
| --- | --- |
| Payments | Live Razorpay validation, refunds, settlement reporting. |
| Notifications | Browser push, SMS gateway, WhatsApp template automation. |
| Delivery | Live partner GPS, route optimization, delivery proof. |
| Inventory | Recipe/BOM auto-deduction and wastage analytics. |
| Reporting | Aggregate analytics collections and scheduled reports. |
| Meta/social | OAuth, token refresh, campaign publishing, attribution. |
| Testing | Focused Playwright or equivalent smoke coverage. |
| Performance | Bundle/route-level splitting for large flows. |
| Security | Rules/index review, QR secret rotation policy, provider secret audit. |

## 13. Task Tracker

Active tasks:

| ID | Priority | Status | Owner | Summary |
| --- | --- | --- | --- | --- |
| MAN-001 | P0 | Pending | Manual | Verify password-protected operational view switch. |
| MAN-002 | P0 | Pending | Manual | Hostinger env variables. |
| MAN-003 | P0 | Pending | Manual | Database alert email and Admin CMS alert recipient. |
| MAN-004 | P0 | Pending | Manual | SMTP delivery confirmation. |
| MAN-006 | P0 | Pending | Manual | Hostinger cache clear/redeploy/route verification. |
| MAN-007 | P1 | Pending | Manual | Firebase authorized domains for Google sign-in. |
| MAN-008 | P1 | Pending | Manual | Deploy Firestore rules/indexes when changed. |
| SEC-001 | P1 | Pending | Manual + Codex | Firestore rules/index review. |
| DOC-001 | P1 | Active | Codex | Keep this tracker current. |
| PAY-001 | P1 | Not started | Manual + Codex | Razorpay order/verify/webhook validation. |
| PAY-002 | P2 | Not started | Manual + Codex | Refund and settlement process documentation. |
| REPORT-001 | P2 | Not started | Codex | Aggregate analytics design. |
| REPORT-002 | P2 | Not started | Codex | Future aggregate analytics implementation. |
| RBAC-001 | P2 | Pending audit | Codex | Role-specific dashboards/navigation audit. |
| TEST-001 | P2 | Not started | Codex | Focused e2e smoke suite design. |
| TEST-002 | P2 | Not started | Codex | Future focused e2e smoke implementation. |
| HEALTH-001 | P2 | Not started | Codex | Operational health dashboard design. |
| WA-001 | P2 | Placeholder/partial | Manual + Codex | WhatsApp Cloud API provider hardening. |
| WA-002 | P2 | Not started | Manual + Codex | WhatsApp template/fallback policy. |
| SMS-001 | P2 | Not started | Manual | SMS gateway requirements. |
| SMS-002 | P2 | Placeholder | Manual + Codex | Future SMS channel adapter. |
| PERF-001 | P2 | Not started | Codex | Large component/code split audit. |
| PUSH-001 | P3 | Placeholder | Codex | Browser push notifications. |
| META-001 | P3 | Placeholder/partial | Manual + Codex | Meta/Instagram OAuth/publishing. |
| DEL-001 | P3 | Framework | Codex | Delivery GPS tracking. |
| INV-001 | P3 | Placeholder | Codex | Recipe/BOM auto-deduction. |
| KDS-001 | P3 | Deferred | Codex | KDS virtualization/TV polish. |
| ORDER-001 | P3 | Deferred | Codex | Owner Order Desk mobile redesign. |

Completed baseline tasks:

| ID | Status | Summary |
| --- | --- | --- |
| BASE-001 | Completed | Production release baseline validated on Hostinger. |
| QR-BASE | Completed | QR table ordering and session workflow. |
| PRINT-BASE | Completed | Bill/KOT printing and print logs. |
| OPS-BASE | Completed | Operational view switching and owner operations. |
| SEARCH-BASE | Completed | Owner/admin search autofill hardening. |
| COMM-BASE | Completed | Owner communication settings/history/contact workflow. |
| REPO-BASE | Completed | Owner/admin/customer repository migrations and production validation. |
| THEME-BASE | Completed | Customer/owner/admin theme token system. |
| CACHE-BASE | Completed | Public data no-store/cache/SW guards. |
| MENU-LIB | Completed | Enterprise Menu Master Library repository, admin UI, owner wizard picker, import/export, versioning, and audit metadata. |

## Definition of Done

Every future task must satisfy this checklist before it can move to completed.

| Area | Requirement |
| --- | --- |
| Architecture | Existing tracker sections, ADRs, protected features, repositories, APIs, and collection registry were checked before changes. |
| Scope | No unrelated refactors, duplicate modules, duplicate APIs, or unapproved schema changes. |
| Validation | Inputs, server actions, API payloads, tenant scope, and provider callbacks are validated with existing schemas/helpers where possible. |
| Accessibility | Interactive UI has labels, focus behavior, keyboard support, and readable states on mobile/desktop. |
| Performance | New reads/listeners are bounded, cached where appropriate, cleaned up on unmount, and do not scan high-volume collections unnecessarily. |
| Security | Auth/session/role checks happen server-side for protected reads/writes; secrets stay server-only; logs are sanitized. |
| Documentation | Relevant docs and this master tracker are updated with behavior, risks, and follow-ups. |
| Tracker Update | Task status, acceptance criteria, verification result, and manual follow-ups are recorded here. |
| Verification | Required commands pass or failures are documented with exact reason and next action. |
| Deployment Notes | Env vars, provider setup, rules/indexes, migrations, rollback, and manual deployment tasks are documented. |

Task-specific Definition of Done:

| Task Type | Additional Done Criteria |
| --- | --- |
| API/backend | Existing API contract preserved or versioned; unauthenticated/unauthorized path checked. |
| Firestore | Collection/index/rules impact documented; migration and rollback defined. |
| UI | Responsive checks and accessibility pass for affected surfaces. |
| Provider integration | Sandbox/live mode, webhook verification, retry/failure behavior, and credential ownership documented. |
| Documentation-only | Only docs or non-functional metadata changed; app verification commands pass. |

## Rollback Strategy

Every production feature must define rollback before release.

| Area | Rollback | Recovery | Migration | Backward Compatibility |
| --- | --- | --- | --- | --- |
| Feature flags | Disable feature through env/settings without deleting data. | Restore previous flag state after provider/app recovery. | Avoid irreversible migrations for flag-gated launches. | Existing users keep old flow until flag is enabled. |
| Firestore schema | Preserve old fields/collections during transition. | Re-run backfill or restore from backup if needed. | Use additive migrations first; dry-run before writes. | Readers must tolerate both old and new shapes during rollout. |
| APIs | Keep existing response fields stable. | Revert route handler or switch callers to prior route. | Avoid changing request/response contracts without versioning. | Existing clients continue to work. |
| QR ordering | Disable QR generation/session creation per settings. | Re-enable after token/session issue is fixed. | Do not invalidate existing tokens unless security requires it. | Existing printed QR codes remain valid when possible. |
| Payments | Disable online payment option; keep COD/manual payment. | Reconcile failed/unknown payments with provider dashboard. | Payment records must keep provider ids and statuses. | Existing orders remain readable regardless of provider state. |
| Notifications | Disable failing channel and fallback to next configured channel. | Replay only idempotent notifications after provider recovery. | Delivery logs must distinguish sent/failed/skipped. | Orders/support flows continue without non-critical notification sends. |
| Printing | Fall back to browser print/download where printer adapter fails. | Retry print log/reprint from stored order/bill data. | Print template changes must preserve old bill readability. | Old bills remain printable/reprintable. |
| Offline/sync | Disable queue processing if writes fail repeatedly. | Replay queue after validation; dead-letter unsafe writes. | Queue schema changes must preserve existing queued items. | Existing offline items are either replayed or safely surfaced. |
| Theme/UI | Revert token/component changes. | Restore previous token set and rerun contrast/build checks. | Avoid changing persisted preference keys. | Existing preferences remain valid. |
| Analytics/reports | Fall back to raw/repository-backed reports. | Rebuild aggregates from source collections. | Aggregates must be rebuildable and non-authoritative. | Reports stay available, even if slower. |

Rollback requirements:

| Requirement | Description |
| --- | --- |
| Rollback owner | Every production task identifies Manual, Codex, or provider owner for rollback. |
| Data backup | Any production write/backfill has a dry-run and backup/recovery note. |
| Feature disable path | Every provider or risky feature has an env/settings disable path. |
| Compatibility window | Readers tolerate old and new data until migration is verified. |
| Verification after rollback | Run targeted smoke plus `npm run typecheck`, `npm run lint`, `npm run build` when code changed. |

## Operational Health Dashboard

This section defines future monitoring scope only. Do not implement dashboard UI until `HEALTH-001` is approved.

| System | Health Signals | Source / Future Source | Alert Condition | Owner |
| --- | --- | --- | --- | --- |
| Firebase | Admin SDK init, REST fallback, read/write diagnostics, rules/index errors. | Existing diagnostics APIs, Firebase Console. | Admin init failure, permission denied spike, REST fallback failure. | Manual + Codex |
| Functions | Function deployment status, webhook/function errors, cold start/runtime errors. | Firebase Functions logs. | Repeated provider webhook failures or function crash. | Manual |
| SMTP | SMTP auth, send success/failure, rate limits, outage alert delivery. | Existing SMTP send paths and future notification logs. | Auth failure, repeated send failure, placeholder password. | Manual |
| SMS | Provider auth, send status, delivery callbacks, balance/quota. | Future SMS adapter/provider dashboard. | Provider failure, low balance, delivery failure spike. | Manual + Codex |
| WhatsApp | Token validity, phone id, webhook verification, template status, send failures. | `/api/whatsapp/*`, provider dashboard, event logs. | Token expired, webhook failed, template rejected, rate limited. | Manual + Codex |
| Push | Subscription count, send success/failure, invalid subscriptions. | Future push adapter and service worker events. | High invalid subscription rate or send failure spike. | Codex |
| Printer | Printer profile status, test print, print log failures, reprint count. | Printer repository/API and print logs. | Repeated failed print attempts or missing default printer. | Codex |
| Storage | Cloudinary signing/upload success, asset load failures, quota. | Cloudinary dashboard and signing route. | Upload/signature failures or quota warnings. | Manual + Codex |
| Payments | Order create/verify/webhook success, signature failures, settlement exceptions. | Razorpay dashboard, payment routes, `paymentIntents`. | Webhook signature failure, verification failure, settlement mismatch. | Manual + Codex |
| Queues | Offline queue depth, retry count, dead-letter count, stuck items. | Offline queue and future notification queue. | Queue age/depth exceeds threshold or repeated retry failure. | Codex |

Health dashboard rules:

| Rule | Requirement |
| --- | --- |
| No secrets | Dashboard must never show provider secrets, private keys, OTPs, or raw tokens. |
| Tenant-aware | Restaurant-specific health must be scoped by authenticated owner/admin access. |
| Actionable | Each health card needs status, last checked time, reason, and next action. |
| Manual-aware | External provider failures must clearly say when manual console access is required. |
| Non-blocking | Customer ordering should degrade gracefully when non-critical channels fail. |

## 14. Verification Checklist

Run after documentation-only changes:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

If PowerShell blocks npm scripts, use:

```bat
cmd /c npm run typecheck
cmd /c npm run lint
cmd /c npm run build
git diff --check
```

Implementation verification additions:

| Change type | Additional checks |
| --- | --- |
| Theme/UI | `npm run theme:contrast`, desktop/mobile screenshot checks |
| Firebase schema/rules | Firebase emulator or staging rules/index validation |
| Owner APIs | Authenticated owner route smoke and 403 unauthenticated check |
| Public customer data | No-store headers and stale-cache checks |
| QR | Signed QR session validation and device/session expiry checks |
| Printing | 58mm/80mm/100mm/A4 preview and print log checks |
| Payments | Provider sandbox/live webhook signature checks |

Current documentation-only verification status:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## 15. Deployment Checklist

Before production deployment:

| Step | Required |
| --- | --- |
| Environment | Hostinger env values match `.env.hostinger.example` with real secrets. |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` valid. |
| Public Firebase | `NEXT_PUBLIC_FIREBASE_*` values match production Firebase project. |
| App URL | `NEXT_PUBLIC_APP_URL` uses final HTTPS domain. |
| QR secret | `TABLE_QR_SECRET` set if production QR tokens must survive env changes. |
| Cloudinary | Public cloud name and server API credentials configured. |
| SMTP | Gmail/app SMTP credentials valid and `SMTP_FROM` set. |
| Database alerts | `DATABASE_ALERT_EMAIL` and Admin CMS alert recipient set. |
| Maps/OAuth | Mapbox token and Google OAuth authorized domains configured. |
| Payments | Razorpay keys/webhook secret configured only before live payment launch. |
| Rules/indexes | Firestore rules and indexes deployed when changed. |
| Build | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` pass. |
| Cache | Hostinger cache cleared after redeploy. |
| Smoke routes | `/`, `/api/release-info`, `/owner/login`, `/owner/pos`, `/admin/login` verified. |

## Project Standards

### Repository Pattern

Use `src/repositories/*` for server-side Firestore domain access. Do not duplicate query/write logic in new route handlers when a repository exists.

### Tenant Isolation

Every restaurant-scoped document must include `restaurantId` or canonical tenant id. Owner/admin APIs must validate the session and scope before reading/writing.

### Error Handling

Return safe user-facing errors. Logs may include sanitized diagnostics but must not expose private keys, env values, stack traces, Firestore internals, or provider secrets to customers.

### Logging

Use scoped server logs for diagnostics. Keep client logs minimal and non-sensitive.

### Loading States

Use existing state components, skeletons, and guarded timeout/retry patterns. Preserve abort cleanup for fetches and listener unmounts.

### Toast Rules

Use existing toast/alert infrastructure. Avoid duplicate toasters. Mobile-critical confirmation should use the existing animated alert/provider patterns.

### Dialog Rules

Use existing Radix/shadcn-style dialog/sheet primitives. Preserve focus handling, Escape close, outside-click behavior, and mobile bottom-sheet patterns.

### Accessibility

Buttons need accessible labels. Inputs need labels or ARIA labels. Keyboard close/escape behavior should remain on drawers/dialogs.

### Responsive Design

Maintain mobile-first customer ordering and dense operational owner/POS layouts. Do not add marketing-style hero pages for operational tools.

### Security

Validate sessions server-side. Never rely on client role state for protected writes. Keep provider secrets server-only.

### Validation

Use Zod schemas where present. Do not parse structured data with fragile string logic when schemas/helpers exist.

### Caching

Public customer catalog APIs and restaurant pages must avoid stale CDN/SW cache. Preserve no-store headers and service-worker bypasses.

### Offline

Owner/POS offline queue is scoped to operational routes. Do not mount offline sync globally on admin/customer routes without explicit design.

### Realtime

Always clean up `onSnapshot`, EventSource, intervals, timeouts, event listeners, and AbortControllers on unmount.

### Firestore

Check `src/firebase/collections.ts`, repositories, `docs/firestore-schema.md`, rules, indexes, seed scripts, and cleanup scripts before schema changes.

### Naming Convention

Use domain-specific filenames and route groups. Avoid duplicate generic names outside allowed App Router conventions (`page.tsx`, `route.ts`, `layout.tsx`, `error.tsx`).

### Folder Convention

Routes live in `src/app`. Shared UI in `src/components`. Composite screens in `src/components/flows`. Domain services in `src/services`. Server data repositories in `src/repositories`. Shared server helpers in `src/lib/server`.

### Environment Variables

Environment parsing lives in `src/lib/env.ts`, environment docs in `.env*.example`, and production validation in `scripts/validate-production-env.mjs`.

## Audit Notes

Scans performed on 2026-07-01:

| Scan | Result |
| --- | --- |
| Repository file inventory | Completed with `rg --files`. |
| Existing architecture docs | Reviewed `ARCHITECTURE.md`, `docs/EXISTING_FEATURES.md`, `docs/project-tracker.md`, `docs/firestore-schema.md`, `docs/final-production-readiness-report.md`. |
| API routes | Found 65 route handlers under `src/app/api`. |
| Repositories | Found 16 repository files under `src/repositories`. |
| Services | Found 31 service files under `src/services`. |
| Duplicate filenames | Found expected App Router duplicates and domain duplicates listed in technical debt. |
| Debt markers | Found placeholders for provider integrations, legacy docs, and architecture placeholders. |
| Realtime/listener cleanup | Existing cleanup patterns found across hooks/components; continue enforcing cleanup. |
| Environment variables | Required production env keys documented in examples and validation script. |

## Release Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| Release Readiness | 92% code-ready; remaining blockers are manual deployment/provider checks. |
| Audit Scope | Tracker integrity, dead-route search, QR route wiring, owner API error exposure, offline/listener cleanup patterns, deployment blockers. |
| Bugs Found | 3 confirmed local issues. |
| Bugs Fixed | 3 fixed in this pass. |
| Remaining Bugs | No new local code blocker found; manual production checks remain. |
| Manual Tasks | MAN-001, MAN-002, MAN-003, MAN-004, MAN-006, MAN-007, MAN-008. |
| Next Recommended Task | Complete MAN-002 Hostinger env validation, then MAN-006 cache clear/redeploy and hosted route smoke. |

Fixed issues:

| ID | Area | Fix | Verification |
| --- | --- | --- | --- |
| FIX-2026-07-01-A | Tracker integrity | Removed an embedded pasted prompt from the Current Project Status table. | Markdown structure reviewed; prompt marker search returned no matches. |
| FIX-2026-07-01-B | Customer tracking | `/track-order` now submits the entered order id to `/order/{id}` instead of linking every lookup to `/order/search`. | `npm run typecheck`, `npm run lint`, and `npm run build` passed. |
| FIX-2026-07-01-C | Owner API hardening | Owner customers, analytics, loyalty rules, and system diagnostics now return safe generic errors and sanitized request-id logs. | `npm run typecheck`, `npm run lint`, and `npm run build` passed. |

Performance and lifecycle audit:

| Area | Result |
| --- | --- |
| Offline sync | Existing sync engine is a singleton starter; interval and service-worker listener are app-lifetime operational infrastructure, not component unmount leaks. |
| Realtime | Existing listener cleanup patterns remain the standard; no new listener or polling path was added. |
| Route behavior | QR token route remains wired through `/order/[id]` and table tokens containing `.` route into `TableQrOrderingFlow`. |

Security and accessibility improvements:

| Area | Improvement |
| --- | --- |
| Security | Owner operational APIs patched in this pass no longer echo raw exception messages to clients. |
| Logging | New logs include request ids and error class only, not stack traces, provider secrets, or Firestore internals. |
| Accessibility | Track order lookup is now a real labeled form with disabled empty submit state. |

Production risks still open:

| Risk | Owner | Next Action |
| --- | --- | --- |
| Hostinger env incompleteness | Manual | Complete MAN-002 and run production-equivalent env validation. |
| Stale hosted cache/deployment | Manual | Complete MAN-006 after env validation. |
| SMTP/provider delivery | Manual | Complete MAN-004 before relying on OTP/outage/order mail. |
| Firestore rules/index drift | Manual + Codex | Complete SEC-001 and MAN-008 with Firebase access. |
| Provider placeholders | Manual + Codex | Keep WA/SMS/PUSH/META/DEL tasks gated until provider launch is explicitly requested. |

## Customer Module Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| Customer Readiness | 96% code-ready for customer flows; remaining risk is manual browser/device verification and production provider/env access. |
| Screens Audited | Home, restaurants, restaurant detail/menu/item, cart, checkout, order success, track order, recent orders, reorder, reviews, offers, loyalty, profile, saved addresses, support entry points, authentication, forgot password, Google login. |
| Bugs Found | 9 confirmed customer-facing issues. |
| Bugs Fixed | 9 fixed in this pass. |
| Remaining Customer Bugs | No confirmed local customer blocker remains after static/code audit; manual mobile/browser smoke still required. |
| Known Risks | Production Firebase rules/env, Google authorized domains, SMTP/provider access, and real-device layout/autofill behavior require manual validation. |
| Next Sprint Recommendation | Run manual customer smoke on mobile/tablet/desktop, then complete Hostinger env/cache deployment tasks before provider-roadmap work. |

Customer bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| CUST-FIX-001 | Track Order | `/track-order` now routes the entered order id to `/order/{id}` instead of the dead literal `/order/search` path. |
| CUST-FIX-002 | Saved Address | Customer account API no longer returns raw repository/Firebase errors to the browser; duplicate/not-found/invalid cases map to friendly copy. |
| CUST-FIX-003 | Saved Address | Profile address save/delete catches network/API failures, logs details to console, and shows friendly customer messages. |
| CUST-FIX-004 | Customer Account Loading | `useCustomerData` now handles fetch/network failures instead of leaving profile/orders/addresses stuck in loading. |
| CUST-FIX-005 | Order Tracking | `useRealtimeOrder` now handles missing order ids, failed fetches, and retry polling errors with safe error state and interval cleanup preserved. |
| CUST-FIX-006 | Order Success | Missing/failed order receipt load now shows a recoverable empty state instead of an infinite receipt loader. |
| CUST-FIX-007 | Cart | Empty cart checkout no longer navigates to `/checkout`; the disabled state is now a real disabled button, not a disabled `Link`. |
| CUST-FIX-008 | Checkout Mobile | Checkout form now has mobile bottom padding so the sticky submit button does not cover lower validation/actions. |
| CUST-FIX-009 | Reviews/Reorder | Review edits preserve original `createdAt` so the 24-hour edit window cannot be extended; review/reorder dialogs now support Escape close and labelled modal semantics. |

Customer UX and accessibility improvements:

| Area | Improvement |
| --- | --- |
| Error Handling | Customer account, order, address, favorite, review, and tracking failures show safe user copy while logging diagnostic reason to console/server. |
| Validation | Address duplicate/invalid cases, empty cart checkout, missing order id, and missing receipt all have explicit recoverable states. |
| Mobile Layout | Checkout sticky action has spacing protection for one-hand mobile usage. |
| Accessibility | Track-order form, review dialog, and reorder dialog have clearer labels/modal semantics; Escape closes review/reorder dialogs. |
| Performance | Existing order polling interval cleanup remains intact; failed customer data fetches no longer spin indefinitely. |

Customer verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Manual customer smoke still recommended:

| Flow | Manual Check |
| --- | --- |
| Saved Address | Add/edit/delete home and work addresses; verify duplicate-friendly error and checkout autofill. |
| Review Flow | Submit review for a completed order, edit within 24 hours, verify one review per completed order and average rating. |
| Reorder | Reorder with empty cart, same-restaurant cart, other-restaurant cart, unavailable items, and price changes. |
| Checkout | Mobile sticky checkout, scheduled order slot, immediate order default, delivery validation, and order success redirect. |
| Tracking | `/track-order`, `/order/{id}`, recent orders, invoice link, help link, and missing order state. |
| Authentication | Email login, forgot password, Google login, phone-required profile redirect, and saved cart/account continuity. |

## POS Module Stabilization Audit - 2026-07-01

| Field | Result |
| --- | --- |
| POS Readiness | 98% code-ready for day-to-day restaurant POS operations; remaining risk is manual browser, printer, and hardware-device validation. |
| Audit Scope | Order creation, customer lookup, walk-in orders, dine-in/table, parcel, delivery, QR settlement handoff, discount, coupon-style discount entry, GST/tax toggles, service/packing charge, quantity changes, hold/resume, payment capture, bill preview, kitchen dispatch, print/reprint, download, destructive actions, loading/error states, accessibility, and cleanup patterns. |
| POS Bugs Found | 10 confirmed POS stability issues. |
| POS Bugs Fixed | 10 fixed in this pass. |
| Remaining POS Bugs | No confirmed local POS blocker remains after code/static audit; split bill, merge bill, wallet, refund, and hardware drawer flows remain placeholders/future operational scope unless already supported by restaurant process. |
| Remaining Risks | Real 58mm/80mm/A4 printer output, cashier tablet ergonomics, live staff permissions, and production owner session behavior need manual smoke testing. |
| Manual Tasks | Verify POS on tablet/desktop, run real printer checks for bill/KOT/reprint/download, test owner/cashier permission paths, and validate Hostinger production session after MAN-002/MAN-006. |
| Next Sprint | Manual POS device/printer smoke, then complete Hostinger env/cache deployment tasks before provider-roadmap work. |

POS bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| POS-FIX-001 | Duplicate Orders | POS processing now ignores repeat submits while an order is already saving/syncing. |
| POS-FIX-002 | Button State | Send KOT, Checkout & Place, Hold, Save, and Clear are disabled during processing. |
| POS-FIX-003 | Kitchen Dispatch | KOT create/update now requires successful owner kitchen API responses instead of silently creating local fallback tickets. |
| POS-FIX-004 | Checkout Settlement | Checkout after new KOT creation now passes the created kitchen order id so the linked kitchen ticket can be completed reliably. |
| POS-FIX-005 | POS Bootstrap | POS data loading now checks API status, shows friendly failure copy, and logs only sanitized reason metadata. |
| POS-FIX-006 | Discount Validation | Negative discounts are blocked and percentage discounts are clamped to 100%. |
| POS-FIX-007 | Customer Lookup | The customer selector action now performs lookup instead of rendering a dead Add Customer button. |
| POS-FIX-008 | Clear Order | Clearing the current order now uses a confirmation dialog and resets the full draft safely. |
| POS-FIX-009 | Held Orders | Removing held orders now requires confirmation; resuming a held order over an active cart asks before replacing the cart. |
| POS-FIX-010 | Printing UX | Print-log failures no longer expose raw error objects, bill preview supports Escape close and modal labels, and PDF-ready downloads delay URL cleanup for browser reliability. |

POS workflow coverage:

| Workflow | Result |
| --- | --- |
| Order Creation | Stable with duplicate-submit guard and friendly failure handling. |
| Customer / Walk-in | Walk-in remains default; phone lookup button is wired to existing customer lookup. |
| Dine-in / Table | Dine-in still requires a valid table before KOT/checkout. |
| Parcel / Delivery | Parcel and delivery remain supported; delivery address validation remains required for delivery. |
| Discounts / Coupons | Existing discount entry supports percentage, flat, item, and coupon-style values with clamping. |
| Tax / GST / Charges | Existing GST, service charge, and parcel charge controls remain in the POS bill calculation path. |
| Hold / Resume | Hold/save/resume uses existing local held-order store with replace/remove confirmations. |
| Payment Methods | Cash, UPI, card, and credit/manual tender remain existing local payment markers; no payment provider work was added. |
| Kitchen Dispatch | Existing kitchen API path is reused; failed dispatch now blocks success state. |
| Printing | Existing 58mm/80mm/100mm/A4 preview, customer/cashier/kitchen/duplicate copies, reprint, and PDF-ready download were preserved. |
| Cancel / Refund | No new refund implementation added; destructive local clear/remove paths are guarded. |

POS verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active; existing protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Kitchen Operations Center Stabilization Audit - 2026-07-02

| Field | Result |
| --- | --- |
| Kitchen Readiness | 98% code-ready for day-to-day kitchen operations; remaining risk is manual tablet/TV, browser audio, realtime, and physical printer validation. |
| Audit Scope | Kitchen order bootstrap, realtime SSE, status lifecycle, cancelled/served mapping, card actions, bulk actions, KOT print/reprint/preview, sound alerts, timers, filters, fullscreen, accessibility, friendly error handling, and cleanup patterns. |
| Kitchen Bugs Found | 12 confirmed Kitchen stability issues. |
| Kitchen Bugs Fixed | 12 fixed in this pass. |
| Remaining Kitchen Bugs | No confirmed local Kitchen blocker remains after code/static audit; physical KOT printer behavior, TV/tablet ergonomics, production SSE behavior, and browser audio policy still need manual smoke testing. |
| Remaining Risks | Real 58mm/80mm/A4 KOT output, long-running TV mode, hosted owner session permissions, and live order handoff from POS/QR need staging or production validation. |
| Manual Tasks | Verify `/owner/kitchen` on tablet/desktop/TV, test realtime updates from POS/QR/order desk, print/reprint/preview KOT on real printers, test browser sound mute/unmute, and validate bulk cancel/complete against staging data. |
| Next Sprint | Manual Kitchen/POS integrated smoke, then complete Hostinger env/cache deployment tasks before starting any new roadmap feature. |

Kitchen bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| KITCHEN-FIX-001 | API Errors | Kitchen list/create/update routes now return friendly generic errors and log sanitized diagnostics only. |
| KITCHEN-FIX-002 | Realtime SSE | Kitchen stream snapshot failures now emit safe client messages instead of raw Firestore errors. |
| KITCHEN-FIX-003 | Status Mapping | Cancelled Kitchen tickets stay cancelled instead of being displayed as completed; served is now a distinct step before completion. |
| KITCHEN-FIX-004 | Bootstrap Loading | Kitchen and table bootstrap fetches now use abort guards, response validation, friendly failure toast, and sanitized console diagnostics. |
| KITCHEN-FIX-005 | Status Rollback | Failed status updates now roll back the affected card and show safe toast feedback. |
| KITCHEN-FIX-006 | Shared Actions | Kitchen cards now share status, cancel, preview, print, and reprint helpers instead of duplicating local action logic. |
| KITCHEN-FIX-007 | Cancel Confirmation | Ticket cancel now requires an accessible confirmation dialog with Escape close and focus return. |
| KITCHEN-FIX-008 | Bulk Actions | Bulk Ready, Serve Ready, Complete Served, and Bulk Cancel are wired with rollback on partial failure and confirmation for destructive actions. |
| KITCHEN-FIX-009 | KOT Printing | Print, reprint, and preview reuse the existing KOT window path, avoid duplicate auto-print generation, and hide print-log internals from users. |
| KITCHEN-FIX-010 | Sound Alerts | New-order sound alerts play once per new ticket, skip initial bootstrap spam, and respect mute/settings state. |
| KITCHEN-FIX-011 | Timers | Kitchen timers now guard invalid dates, avoid negative elapsed values, and keep the single interval cleanup pattern. |
| KITCHEN-FIX-012 | Filters and TV Mode | Status, priority, table, source, station, and search filters now work with empty states; fullscreen supports Escape and wider TV board columns. |

Kitchen workflow coverage:

| Workflow | Result |
| --- | --- |
| Order Intake | Existing owner Kitchen API and SSE paths are reused; no new API or collection was added. |
| Status Lifecycle | New, accepted, preparing, ready, served, completed, billed, and cancelled states render explicitly. |
| Bulk Operations | Non-destructive ready/serve actions run directly; complete/cancel require confirmation. |
| KOT | Existing print/reprint/logging flow is preserved with safe preview and error handling. |
| Sound | Alerts are one-time per new order after initial load and respect the mute toggle. |
| Filters | Search, status, priority, table, source, station, QR/POS/parcel/delivery source filtering, and empty states are covered. |
| Accessibility | Card actions have labels; confirmation dialog has modal semantics, Escape close, and focus return. |
| Performance | Bootstrap abort, EventSource cleanup, singleton timer cleanup, and no duplicate realtime listeners were preserved. |

Kitchen verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Initial run was blocked by the active Next dev-server guard; passed with `SARVA_ALLOW_BUILD_WITH_DEV=1`. Existing protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Master Menu Library Import Stabilization - 2026-07-02

| Field | Result |
| --- | --- |
| Master Library Readiness | 98% code-ready; remaining validation is manual import smoke with production admin credentials. |
| Master Menu Bugs Found | 1 confirmed import compatibility issue. |
| Master Menu Bugs Fixed | 1 fixed in this pass. |
| Remaining Risks | Admin must manually import the provided JSON/CSV/XLSX dataset into production before owners can see live master templates. |
| Manual Tasks | Admin import provided Kerala JSON, verify owner template picker, import one template into owner menu wizard, and confirm images/fallbacks. |

Master Menu bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| MENU-LIB-FIX-001 | Import Compatibility | Master template import now accepts the uploaded `keralaFoods` JSON shape, maps `itemName`, channel prices, packing charge, descriptions, cuisines, ingredients, nutrition, modifiers, add-ons, availability, ratings, and images, and supports JSON/CSV/XLSX loading from the existing Admin Menu Library screen. |

Master Menu verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Master Menu Final Stabilization - 2026-07-02

| Field | Result |
| --- | --- |
| Master Library Readiness | 99% code-ready; remaining validation is manual production admin/owner smoke after redeploy. |
| Master Menu Bugs Found | 8 production-readiness gaps. |
| Master Menu Bugs Fixed | 8 fixed in this pass. |
| Remaining Risks | Firestore rules/deployment and real admin/owner browser credentials still require manual production validation. |
| Manual Tasks | Import provided Kerala JSON/CSV/XLSX in Admin, verify dashboard counts, export samples, refresh Owner picker, and import one template into owner menu wizard. |

Master Menu bugs fixed:

| ID | Area | Fix |
| --- | --- | --- |
| MENU-LIB-FIX-002 | Import Summary | Admin import now refreshes UI/counts and reports imported, skipped, merged, duplicates, and failed rows. |
| MENU-LIB-FIX-003 | Empty Library UX | Empty library state now shows an illustration, import actions, and sample downloads for JSON, CSV, and Excel. |
| MENU-LIB-FIX-004 | Owner Picker | Owner picker uses no-store masterMenuTemplates reads, cache-busting refresh, and a manual Refresh action. |
| MENU-LIB-FIX-005 | Search and Filters | Master template search covers item name, keywords, category, cuisine, tags, ingredients, and descriptions; filters now include subcategory, availability, rating, price, prep time, popular, and newest. |
| MENU-LIB-FIX-006 | Duplicate Protection | Admin import detects duplicates by item name, category, cuisine, and food type; owner template import blocks duplicate restaurant menu drafts by name, category, and variant. |
| MENU-LIB-FIX-007 | Import Preview | Admin import shows a preview table with image, item, category, cuisine, price, and New/Merged/Duplicate/Skipped status before import. |
| MENU-LIB-FIX-008 | Export and Samples | Admin library supports JSON, CSV, and Excel export for entire, selected, or filtered records plus schema-based sample downloads. |
| MENU-LIB-FIX-009 | Dashboard Counts | Admin library top cards now show total items, categories, cuisines, recently imported, and duplicate counts. |

Master Menu final verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

## Production Release Readiness Audit - 2026-07-03

| Field | Result |
| --- | --- |
| Production Readiness | 92% release-ready; local code passes, production access/configuration blockers remain. |
| Code Readiness | 97% code-ready across completed Customer, Owner, Kitchen, POS, QR Ordering, and Master Menu modules. |
| Audit Scope | Codebase markers, API/session patterns, Firestore/rules/index coverage, env validation, provider readiness, runtime logs, listener/timer hotspots, bundle/component size, UX state coverage, and deployment metadata. |
| Files Changed | Documentation only: `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Release Recommendation | Hold production release until P0 blockers are cleared; app is a release candidate after Hostinger env/cache/redeploy, Firestore rules/index review, and browser/provider smoke pass. |

Audit commands and results:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning from Firebase/protobuf loader path. |
| `npm run validate:prod-env` | Failed locally: missing `NEXT_PUBLIC_APP_ENV`, Firebase Admin values, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| Private API auth scan | No unauthenticated private API route file was listed by the scan; public/auth/payment/cloudinary/release routes remain intentionally separate. |
| Firestore rules/index scan | `masterMenuTemplates`, `phoneVerificationSessions`, `emailOtps`, and `modulePasswordOtps` are used by code but were not found in `firestore.rules`; deployment review remains required. |

Critical issues found:

| ID | Area | Finding | Evidence | Owner | Required Action |
| --- | --- | --- | --- | --- | --- |
| PROD-AUDIT-CRIT-001 | Production Env | Production-equivalent env validation fails locally. | `npm run validate:prod-env` reports missing `NEXT_PUBLIC_APP_ENV`, Firebase Admin credentials, `DATABASE_ALERT_EMAIL`, and HTTPS `NEXT_PUBLIC_APP_URL`. | Manual | Complete MAN-002/MAN-003 and rerun validation with real Hostinger env. |
| PROD-AUDIT-CRIT-002 | Deployment | Hostinger still points to older validated SHA than current audited code. | Tracker metadata: current Git `9dfd2d0f018cd1fe30bc96ffc00d7ff788ec20c6`; Hostinger `35017398773ba04efbdc3ab37d250cfa547c0675`. | Manual | Complete MAN-006, clear cache, redeploy, verify `/api/release-info` and smoke routes. |
| PROD-AUDIT-CRIT-003 | Firestore Rules | Newer live collections are not matched in local rules scan. | `masterMenuTemplates`, `phoneVerificationSessions`, `emailOtps`, `modulePasswordOtps` found in code but not in `firestore.rules`. | Manual + Codex | Complete SEC-001/MAN-008 before release; add or confirm server-only intent, deploy rules/indexes, smoke protected flows. |

Medium issues found:

| ID | Area | Finding | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| PROD-AUDIT-MED-001 | API Errors | Some route handlers still return raw `error.message` for domain failures. | `src/app/api/owner/tables/route.ts`, `src/app/api/owner/sync/route.ts`, `src/app/api/owner/profile/route.ts`, `src/app/api/owner/offers/route.ts`, `src/app/api/auth/phone-verification/route.ts`. | Keep as targeted release hardening if testing confirms user-visible technical messages. |
| PROD-AUDIT-MED-002 | Runtime Logging | Runtime logs remain in selected server/client paths. | `rg console.*` found sanitized logs plus raw error logging in notification/session/table/profile/public paths. | Audit high-traffic production logs after deployment; keep diagnostics sanitized and non-sensitive. |
| PROD-AUDIT-MED-003 | Bundle / Maintenance | Large client flow components remain maintenance and route-bundle risks. | Largest flows: `owner-menu-management-flow.tsx` ~164 KB, `restaurant-detail-flow.tsx` ~140 KB, `owner-settings-flow.tsx` ~95 KB, `pos-billing-flow.tsx` ~79 KB. | Defer code splitting to PERF-001 after release smoke; do not refactor during release freeze. |
| PROD-AUDIT-MED-004 | Provider Readiness | Razorpay, WhatsApp Cloud API, SMTP, Google/Firebase auth domains, Cloudinary, and Mapbox remain production-access dependent. | Existing MAN/PAY/WA tasks and failed env validation. | Complete provider smoke with real credentials before enabling live launch expectations. |
| PROD-AUDIT-MED-005 | UX / Browser Smoke | Code-level loading/empty/error states are improved, but full browser/device smoke is still manual. | Tracker module notes for Customer, Owner, Kitchen, POS, QR, Printing, Master Menu. | Run RELEASE-SMOKE-001 on mobile/tablet/desktop/TV/printer after redeploy. |

Low priority improvements:

| ID | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| PROD-AUDIT-LOW-001 | Compatibility Naming | Legacy/demo/mock compatibility names remain in type names, mappers, and seed/cleanup paths. | Keep until a planned cleanup; do not rename during release. |
| PROD-AUDIT-LOW-002 | Dev Scripts | CLI scripts contain expected `console.log`/sample/legacy labels. | Accept for scripts; keep production sample flags off. |
| PROD-AUDIT-LOW-003 | XSS Surface | Legal rendering uses sanitizer and CMS editor uses controlled admin HTML editing. | Keep legal sanitizer tests/manual checks in future e2e suite. |
| PROD-AUDIT-LOW-004 | Listener Hotspots | Listener/timer/EventSource scan found expected operational listeners with existing cleanup patterns; offline sync is app-lifetime infrastructure. | Recheck only if manual long-running TV/POS smoke shows leaks. |

Production audit conclusion:

| Area | Result |
| --- | --- |
| Codebase | No new release-blocking code failure found by typecheck, lint, build, or static scans. |
| Security | Auth/session/tenant patterns are broadly present; release is blocked by env/rules/provider validation, not by a newly confirmed code exploit. |
| Performance | No new duplicate listener blocker confirmed; large flow components remain tracked future debt. |
| UX | Completed modules are code-ready; manual browser/device/printer smoke remains required. |
| Production | Not ready to release until env, Firestore rules/indexes, Hostinger redeploy, and provider smoke are complete. |

## POS and Kitchen Operations Stabilization - 2026-07-03

| Field | Result |
| --- | --- |
| POS/Kitchen Readiness | 98% code-ready for the confirmed P0 workflow fixes; full milestone acceptance still needs manual multi-device restaurant smoke. |
| Scope Completed | Canonical POS draft persistence, kitchen/payment flow decoupling, active order visibility, sidebar count accuracy, incremental KOT generation, and Kitchen mobile layout cleanup. |
| Files Changed | `src/app/api/owner/pos/route.ts`, `src/repositories/order-repository.ts`, `src/components/flows/pos-billing-flow.tsx`, `src/modules/owner/pos/components/cart-panel.tsx`, `src/components/flows/kitchen-display-flow.tsx`, `src/lib/app-store.ts`, `src/lib/operational-api-mappers.ts`, `src/components/flows/order-tracking-flow.tsx`, `src/types/entities.ts`, `src/types/firebase.ts`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Remaining Risk | Browser, tablet, printer, and multi-user realtime smoke remain manual; production env/rules/redeploy blockers from the production audit still apply. |

Fixed issues:

| ID | Area | Fix |
| --- | --- | --- |
| POS-KDS-FIX-001 | Draft Persistence | POS draft order now persists through the owner POS API into the existing `orders` collection as a single deterministic draft document instead of relying on the persisted browser store. |
| POS-KDS-FIX-002 | Remove Item Refresh | Add item, remove item, quantity changes, order type, table, customer, waiter, payment, discount, GST/parcel charge, address, landmark, and notes now commit through the canonical draft write path. |
| POS-KDS-FIX-003 | Empty Draft Cleanup | Removing the last item or clearing/holding/submitting the order deletes the canonical draft so refresh opens an empty Order Desk. |
| POS-KDS-FIX-004 | Kitchen/Payment Independence | Collecting payment updates `paymentStatus` only and no longer forces the Kitchen ticket to `completed`; kitchen status remains its own state machine. |
| POS-KDS-FIX-005 | Send To Kitchen | POS review action now exposes `Send To Kitchen` as the primary action, with payment collection optional. |
| POS-KDS-FIX-006 | Incremental KOT | Adding items after a linked Kitchen ticket exists creates a new rush incremental KOT containing only the newly added quantities instead of resending the full original order. |
| POS-KDS-FIX-007 | Active Orders | POS Active Orders now includes live Kitchen tickets with kitchen status, payment status, table/customer/order type, ETA, waiter, amount, and quick action surface instead of only repository customer orders. |
| POS-KDS-FIX-008 | Sidebar Counts | POS sidebar counts now use active customer orders plus active Kitchen tickets, pending Kitchen queue, today's completed past orders, and held order count instead of broad/demo counts. |
| POS-KDS-FIX-009 | Kitchen Mobile | Kitchen board now removes forced horizontal width on mobile, adds touch-friendly status tabs, and reduces dashboard statistics to live operational counts. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing protobuf dynamic dependency warning. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Draft Persistence | Browser-smoke add/remove/refresh/last-item-delete across cashier and waiter devices. |
| Multi-user Realtime | Verify two-device POS/Kitchen updates, incremental KOT visibility, and Kitchen sound behavior in a real browser session. |
| Billing/Printing | Test bill/KOT/receipt output on 58mm and 80mm printers. |
| Production | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, and hosted route smoke before release. |

## Mobile Kitchen Operations Center Redesign - 2026-07-03

| Field | Result |
| --- | --- |
| Kitchen Mobile/Tablet Readiness | 99% code-ready; desktop Kitchen view intentionally unchanged. |
| Scope Completed | Added a mobile/tablet-only Kitchen shell for `0-1024px` with sticky compact header, status chips, collapsible summary, bottom-sheet filters, order-type/staff/printer filters, compact swipe-ready cards, tablet two-column order grid, quick actions, More panel, and bottom navigation. |
| Files Changed | `src/components/flows/kitchen-display-flow.tsx`, `docs/MASTER_IMPLEMENTATION_TRACKER.md`. |
| Desktop Impact | Existing desktop Kanban/statistics/timeline/history/footer render path is preserved behind `min-[1025px]`; no desktop business logic or API changes were made. |
| Remaining Risk | Manual mobile/tablet browser smoke is required for swipe gestures, one-hand ergonomics, sticky bottom actions, printer selection, sound toggle, and long-running Kitchen sessions. |

Fixed issues:

| ID | Area | Fix |
| --- | --- | --- |
| KITCHEN-MOBILE-FIX-001 | Mobile Layout | Replaced squeezed mobile Kanban with a mobile/tablet-only order-first interface using status chips and one visible queue at a time. |
| KITCHEN-MOBILE-FIX-002 | Statistics | Moved dashboard metrics into a collapsed Today's Summary strip so orders appear first. |
| KITCHEN-MOBILE-FIX-003 | Filters | Moved search, source, order type, priority, table, station, staff, printer, auto-print, and sound controls into an Escape-closeable bottom sheet on mobile/tablet. |
| KITCHEN-MOBILE-FIX-004 | Cards | Added compact order cards with priority left border, hidden overflow item list, sticky action row, and 44px touch targets. |
| KITCHEN-MOBILE-FIX-005 | Gestures | Added swipe right for next status, swipe left for reject/cancel, and long press for KOT preview on compact cards. |
| KITCHEN-MOBILE-FIX-006 | Tablet | Added two-column tablet queue layout without switching to desktop Kanban before `1025px`. |
| KITCHEN-MOBILE-FIX-007 | Navigation | Added mobile/tablet bottom navigation for Orders, Kitchen quick actions, and More with printer/KOT/history tools. |

Verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |
| `npm run build` | Passed with `SARVA_ALLOW_BUILD_WITH_DEV=1` because a local Next dev server was active; existing Firebase/protobuf dynamic dependency warning remains. |

Manual checks still required:

| Area | Task |
| --- | --- |
| Mobile | Verify sticky header/tabs/actions, filter sheet, swipe accept/reject, long-press preview, and bottom navigation on a real phone. |
| Tablet | Verify two-column card grid, touch targets, quick actions, and no desktop Kanban at 769-1024px. |
| Desktop | Verify existing desktop Kitchen remains unchanged above 1024px. |
| Operations | Verify realtime updates, sound, KOT print/reprint, and printer selection in browser after redeploy. |

## POS/Kitchen Production Test Checkpoint - 2026-07-03

| Field | Result |
| --- | --- |
| Checkpoint Status | Stable local production-test checkpoint. |
| Production Readiness | 94% release-ready; remaining blockers are manual deployment, provider, hardware, rules, and browser smoke validation. |
| Code Readiness | 98% code-ready across POS, Kitchen, Customer, Owner, QR, Printing, and Master Menu release surfaces. |
| Scope Frozen | No further implementation for Transfer Table, Merge Table, Split Bill, Payment Timeline, Audit Timeline, or Live Notifications in this sprint. |
| Diff Review | Clean: no sprint task markers, debug statements, commented-out code, merge markers, broken-import evidence, or newly added unused files found in the final diff review. |

Feature checkpoint status:

| Feature | Status | Notes |
| --- | --- | --- |
| Canonical POS Order Promotion | Complete | POS draft promotion is complete and protected for this checkpoint. |
| Payment Transactions | Complete | Existing payment transaction path is complete and protected for this checkpoint. |
| Print History | Complete | Existing print history/audit path is complete and protected for this checkpoint. |
| Kitchen/Order Linking | Complete | POS, order, and Kitchen linking is complete and protected for this checkpoint. |
| Active Orders Dashboard | Complete | Active Orders is the operational center for POS/Kitchen test coverage. |
| Waiter View | Complete | Waiter-focused live metrics and quick actions are available in Active Orders. |
| Cashier View | Complete | Cashier-focused pending bills, payments, collection, and receipt queue metrics are available in Active Orders. |
| Manager View | Complete | Manager-focused kitchen load, delayed order, revenue, and staff status metrics are available in Active Orders. |
| Kitchen Reminder | Complete | Reminder action is available from Active Orders. |
| Bill/KOT/Receipt Printing | Complete | Existing print flows and logging are preserved. |
| Partial Payment | Complete | Partial payment state is supported for checkpoint testing. |
| Transfer Table | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Merge Table | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Split Bill | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Payment Timeline | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Audit Timeline | Deferred | Next sprint enhancement; do not implement during this checkpoint. |
| Live Notifications | Deferred | Next sprint enhancement; do not implement during this checkpoint. |

Final verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed after stopping active local dev server; existing Firebase/protobuf dynamic dependency warning remains. |
| `git diff --check` | Passed with Git line-ending normalization warnings only. |

Remaining manual tasks:

| Area | Task |
| --- | --- |
| Production Access | Complete MAN-002, MAN-006, MAN-008, SMTP/provider checks, and hosted route smoke. |
| Browser Smoke | Verify Customer, Owner, Admin, POS, Kitchen, QR, printer, and view-switch flows after redeploy. |
| Hardware | Test bill, receipt, KOT, and reprint output on real 58mm/80mm printers. |
| Multi-device | Verify POS/Kitchen realtime handoff, Kitchen sound, and active-order updates across cashier/waiter/kitchen devices. |
