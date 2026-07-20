# Final Bug Report

Date: 2026-07-20T15:28:42.110Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | RC5 owner-login, waiter-serving RBAC, and Kitchen History enterprise UI hardening; authentication APIs, Firestore schema/indexes, and provider contracts remain backward compatible. Firestore rules changed only for order/kitchen role parity. |
| Owner Login | Legacy compact owner login lacked enterprise state handling; new surface adds remembered email, autofocus/autocomplete, Caps Lock detection, session-timeout messaging, stronger loading state, and accessible feedback. |
| Kitchen History | Long accordion/card history was not scalable for management workflows; new screen provides bounded server-filtered paging, density modes, resizable persisted columns, compact filters, sticky actions, icon-only actions, overflow menu, floating bulk toolbar, export, print, and expandable details. |
| Security | Tenant isolation, owner permissions, auth endpoints, and provider-secret boundaries remain unchanged. |
| Firestore audit | No collection, schema, index, or repository contract changed. Rules now mirror order/kitchen role parity; no duplicate listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/components/flows/owner-portal-login-flow.tsx` | Rebuilt the owner login UX while preserving the existing owner auth and password OTP flows. |
| `src/components/flows/kitchen-display-flow.tsx` | Replaced Kitchen History cards with a dense enterprise data grid, persisted density/column preferences, compact filters, exports, floating bulk actions, sticky actions, and expandable row details. |
| `src/app/api/owner/kitchen/route.ts` | Added bounded page/pageSize/search/date/status/payment/priority/table/waiter/customer/item/print filters for Kitchen History. |
| `scripts/release/operational-hardening-smoke.mjs` | Operational smoke now verifies owner-login UX, waiter-serving RBAC, Firestore role parity, waiter KOT fallback, and Kitchen History density contracts. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
