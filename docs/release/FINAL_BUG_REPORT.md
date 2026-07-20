# Final Bug Report

Date: 2026-07-20T06:49:20.172Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | Phase 5C corrects payment workflow, POS draft resume, Owner Orders payment visuals, and Kitchen card presentation without changing Firestore collection/schema/rule/index contracts. |
| Workflow | Payment is independent of Kitchen/service state while completion remains guarded by Served + Paid. |
| POS draft | New Order cancel resumes the existing draft/cart/customer/discount/payment draft; Clear Order remains destructive. |
| Kitchen UI | Kitchen cards are item-first and move customer/payment/staff/source details into Preview/More. |
| Payment configuration | Owner-scoped Razorpay remains the primary path; global keys are optional legacy fallback. |
| Security | Payment test actions reuse same-origin owner permissions, redact responses, and block provider mutations in live mode. |
| Firestore audit | No collection, schema, rule, index, or repository contract changed. No duplicate listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/lib/order-state-machine.ts` | Removed Kitchen/Served gating from payment start/record guards while preserving paid/refunded/cancelled protection. |
| `src/components/flows/pos-billing-flow.tsx` | Updated Active Orders payment/split gating, served+paid completion affordance, and POS New Order cancel resume. |
| `src/components/flows/kitchen-display-flow.tsx` | Replaced information-heavy Kitchen cards with item-first cards and icon actions. |
| `src/components/flows/owner-order-management-flow.tsx` | Aligned pending bills and paid workflow state with independent payment. |
| `scripts/release/operational-hardening-smoke.mjs` | Expanded smoke coverage to 20/20 for payment independence, draft resume, Owner workflow state, and Kitchen item-first cards. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
