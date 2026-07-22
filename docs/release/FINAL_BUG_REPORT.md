# Final Bug Report

Date: 2026-07-22T08:45:55.047Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Kitchen Accept RBAC | Fixed. Accept succeeded, but a secondary Kitchen bootstrap read called `/api/owner/tables` and failed for Kitchen roles without `tables:read`. Kitchen now avoids Tables master data and uses Kitchen-scoped print access. |
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
| `src/components/flows/kitchen-display-flow.tsx` | Replaced Kitchen History cards with an enterprise table and removed the Kitchen bootstrap dependency on Owner Tables; printer settings now use `usePrinterSettings("kitchen")`. |
| `src/app/api/owner/kitchen/route.ts` | Added bounded page/pageSize/search/date/status/payment/priority/table/waiter/customer/item/print filters for Kitchen History. |
| `scripts/release/operational-hardening-smoke.mjs` | Operational smoke now verifies owner-login UX, Kitchen History table contracts, and Kitchen no-Tables RBAC bootstrap. |
| `src/app/api/owner/printers/route.ts` | Added a Kitchen-scoped print surface with Kitchen/print RBAC and filtered KOT printer payloads. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
