# Final Bug Report

Date: 2026-07-08T17:26:27.709Z

## Final RC Bug-Hunt Result

| Area | Result |
| --- | --- |
| Scope | Stabilization only. Business workflows and API contracts were preserved. The only data shape addition is optional `restaurantSettings.operationalSettings.orderDelayThresholdMinutes` for the requested late-order alert setting. |
| Marker audit | No actionable runtime TODO/FIXME/HACK/XXX, `@ts-ignore`, `console.log`, or debugger code remains from the targeted scan. Docs, lockfiles, CLI script logging, and intentional placeholder copy were left unchanged. |
| Safe cleanup | Removed three React hook suppression comments by making dependencies explicit in Admin Menu Library, Address Autocomplete, and Owner Dashboard animated numbers. |
| Route/API audit | Static route, API, loading/error, retry, auth, permission, listener, and duplicate-request scans found no new P0/P1 code blocker. |
| Firestore audit | No collection, schema, rule, index, or repository contract changed. No duplicate Firestore listener was introduced. |
| React/Next warnings | Build/analyze pass with the accepted Firebase/protobuf dynamic dependency warning only. |
| Remaining bugs | No unresolved local P0/P1 code bug confirmed. Production release still depends on manual env, provider, Firestore, browser, Lighthouse, Chrome profiling, and hardware smoke. |

## Confirmed Fixes

| File | Fix |
| --- | --- |
| `src/app/admin/menu-library/page.tsx` | Replaced hook dependency suppression with a memoized loader and deferred effect call. |
| `src/components/maps/address-autocomplete.tsx` | Replaced hook dependency suppression with memoized registered-location and search callbacks. |
| `src/app/owner/page.tsx` | Replaced animated-number hook suppression with a ref-backed latest display value. |
| `src/components/flows/owner-order-management-flow.tsx` | Aligned Active Orders Status/Priority/Progress/ETA/Quick View/Actions columns; desktop Quick View uses Radix Popover and mobile expands inline. |
| `src/components/flows/owner-settings-flow.tsx` | Added owner-configurable 10/15/20/25/30 minute prepared-not-served delay threshold. |
| `src/app/api/owner/operational-settings/route.ts` | Persists the shared delay threshold in the existing `restaurantSettings` document. |
| `src/lib/kitchen-delay.ts` | Applies late-order checks only to prepared/ready orders that are not served or terminal. |
| `src/app/api/payments/razorpay/order/route.ts`, `src/app/api/payments/razorpay/verify/route.ts` | Uses the same customer session resolver as order creation to avoid payment-session mismatch. |
| `src/components/forms/checkout-form.tsx` | Payment/order API calls explicitly use same-origin credentials. |

## Accepted Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
