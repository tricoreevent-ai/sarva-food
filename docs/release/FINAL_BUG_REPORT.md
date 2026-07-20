# Final Bug Report

Date: 2026-07-20T11:22:07.694Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | RC5 production hardening only; no feature redesign, Firestore schema/rule/index change, auth flow change, or provider contract change. |
| Smart Bill Merge | Partial-payment tickets were incorrectly blocked from billing-only merge; open partial-payment tickets now merge while locked, authorized, paid, refunded, closed, or already merged bills remain blocked. |
| Split Bill | Split Bill was service-gated even though payment is independent of Kitchen/service state; split now follows payment-state guards only. |
| Security | Tenant isolation, owner permissions, payment locks, and provider-secret boundaries remain unchanged. |
| Firestore audit | No collection, schema, rule, index, or repository contract changed. No duplicate listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/components/flows/pos-billing-flow.tsx` | Split Bill no longer requires Served; Smart Bill Merge uses a billing-specific guard that allows partial-payment open tickets and blocks locked/terminal/finalized bills. |
| `src/repositories/order-repository.ts` | Merge transactions use a repository billing guard matching the UI guard, preserving tenant checks and kitchen-ticket separation. |
| `scripts/release/operational-hardening-smoke.mjs` | Operational smoke verifies payment-independent split flow and partial-payment bill-only merge guards. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
