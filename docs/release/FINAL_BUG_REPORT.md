# Final Bug Report

Date: 2026-07-23T16:03:45.662Z

## 2026-07-24 Deployment Certification

| Severity | Finding | Resolution |
| --- | --- | --- |
| P0 | `/api/cloudinary/signature` issued signed upload parameters without authentication and accepted arbitrary caller signing fields. | Added session/RBAC, tenant-folder authorization, parameter allowlist, and rate limiting. |
| P0 | `/api/public/order-notification` trusted caller recipient/content and could act as an SMTP relay. | Requires the owning customer/order, derives the restaurant, ignores caller recipient email, and rate limits requests. |
| P1 | Production exposed the development test-session route as a recognizable disabled endpoint. | Production returns HTTP 404. |
| P1 | Public callback, restaurant-lead, and monitoring ingestion lacked process-level abuse bounds. | Added rate limits, payload bounds, and text limits. |
| P1 | Release-info fallback timestamp represented request time instead of a stable artifact time. | Uses configured deployment metadata or `.next/BUILD_ID` modification time. |

Live Firestore data issues are recorded in Final Release Readiness and require controlled production-data remediation; the repository audit did not write production data.

## RC5 Release Closure

| Severity | Finding | Resolution |
| --- | --- | --- |
| P0 | Direct menu-item pages crashed because `useWhatsAppShare` resolved `useAlert` before the descendant customer provider existed. | Installed one root alert provider and removed duplicate customer/dashboard providers. |
| P1 | Customer order tracking used a 10-second REST polling interval despite an existing shared Firestore listener. | Uses the shared deduplicated snapshot listener; secure customer REST remains initial/fallback data. |
| P1 | Kitchen History exposed Archive controls that only displayed success toasts, and Admin Subscriptions exposed a Notify action without persistence/delivery. | Removed the false-success controls. |
| P1 | Kitchen History drawer Print/Preview controls could display instruction-only messages instead of performing the named operation. | History print invokes `window.print`; redundant preview action is not rendered. |
| P1 | Public footer accepted placeholder social URLs and direct item share/cart could not complete while the item crash existed. | Invalid social links are filtered; direct item sharing and cart persistence pass production-browser UAT. |
| P2 | Payment Verification Center records failed/cancel/timeout checks as explicit Manual QA evidence rather than simulating real provider outcomes. | Documented as provider Manual QA; no false provider mutation is claimed. |

No unresolved repository P0 or P1 issue was confirmed after retest.

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | RC5 owner-login and Kitchen History enterprise UI hardening; authentication APIs, Firestore schema/rules/indexes, and provider contracts remain backward compatible. |
| Owner Login | Legacy compact owner login lacked enterprise state handling; new surface adds remembered email, autofocus/autocomplete, Caps Lock detection, session-timeout messaging, stronger loading state, and accessible feedback. |
| Kitchen History | Long accordion/card history was not scalable for management workflows; new screen provides bounded server-filtered paging, sticky table actions, sorting, saved filters, bulk selection, export, print, and expandable details. |
| Security | Tenant isolation, owner permissions, auth endpoints, and provider-secret boundaries remain unchanged. |
| Firestore audit | No collection, schema, rule, or index changed. Kitchen create idempotency and scoped SSE read paths now prevent duplicate KOTs, stale ready signals, and stale Reports. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/components/flows/owner-portal-login-flow.tsx` | Rebuilt the owner login UX while preserving the existing owner auth and password OTP flows. |
| `src/components/flows/kitchen-display-flow.tsx` | Replaced Kitchen History cards with an enterprise table, filters, exports, bulk selection, sticky actions, and expandable row details. |
| `src/app/api/owner/kitchen/route.ts` | Added bounded page/pageSize/search/date/status/payment/priority/table/waiter/customer/item/print filters for Kitchen History. |
| `scripts/release/operational-hardening-smoke.mjs` | Operational smoke now verifies owner-login UX and Kitchen History table contracts. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
