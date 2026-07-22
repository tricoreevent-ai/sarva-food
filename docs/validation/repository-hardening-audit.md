# Repository Hardening Audit

Generated: 2026-07-22T05:05:12.278Z

| Check | Hits | Note |
| --- | ---: | --- |
| runtime-console | 16 | Runtime console call; prefer productionLogger or operational logging. |
| raw-error-message | 55 | Raw error-message access; ensure returned/logged text is sanitized. |
| debt-marker | 0 | Debt marker requiring release triage. |
| firestore-unbounded-get | 0 | Potential unbounded Firestore collection read. |
| listener-lifecycle | 55 | Realtime/listener site; verify cleanup and reconnect bounds. |
| api-error-envelope | 164 | API error envelope; verify requestId/meta where customer-safe. |

## Top Findings

### runtime-console

- `src/hooks/use-customer-data.ts` (1)
- `src/hooks/use-realtime-order.ts` (1)
- `src/components/flows/customer-discovery-home.tsx` (1)
- `src/components/flows/kitchen-display-flow.tsx` (5)
- `src/components/flows/pos-billing-flow.tsx` (4)
- `src/components/flows/restaurant-detail-flow.tsx` (2)
- `src/components/flows/restaurant-tables-flow.tsx` (2)

### raw-error-message

- `src/app/api/auth/phone-verification/route.ts` (1)
- `src/app/api/auth/session/route.ts` (1)
- `src/app/api/customer/account/route.ts` (1)
- `src/app/api/owner/kitchen/route.ts` (4)
- `src/app/api/owner/orders/route.ts` (1)
- `src/app/api/owner/payment-settings/route.ts` (1)
- `src/app/api/owner/pos/route.ts` (1)
- `src/repositories/master-menu-template-repository.ts` (1)
- `src/lib/server/api-response.ts` (1)
- `src/lib/server/public-firestore.ts` (3)
- `src/hooks/useWhatsAppShare.ts` (1)
- `src/components/flows/admin-portal-login-flow.tsx` (1)
- `src/components/flows/auth-login-flow.tsx` (1)
- `src/components/flows/kitchen-display-flow.tsx` (3)
- `src/components/flows/owner-menu-management-flow.tsx` (2)
- `src/components/flows/owner-order-management-flow.tsx` (2)
- `src/components/flows/owner-portal-login-flow.tsx` (1)
- `src/components/flows/owner-settings-flow.tsx` (9)
- `src/components/flows/pos-billing-flow.tsx` (14)
- `src/components/flows/restaurant-detail-flow.tsx` (1)
- `src/components/flows/restaurant-tables-flow.tsx` (2)
- `src/components/flows/schedule-order-flow.tsx` (1)
- `src/components/flows/table-qr-ordering-flow.tsx` (2)

### debt-marker

- None

### firestore-unbounded-get

- None

### listener-lifecycle

- `src/app/api/owner/kitchen/stream/route.ts` (2)
- `src/app/api/owner/pos/stream/route.ts` (3)
- `src/hooks/use-operational-view.ts` (1)
- `src/hooks/use-phone-verification.ts` (1)
- `src/hooks/use-public-app-name.ts` (2)
- `src/hooks/use-realtime-order.ts` (1)
- `src/components/flows/kitchen-display-flow.tsx` (12)
- `src/components/flows/owner-order-management-flow.tsx` (3)
- `src/components/flows/owner-settings-flow.tsx` (1)
- `src/components/flows/pos-billing-flow.tsx` (14)
- `src/components/flows/restaurant-browser-flow.tsx` (1)
- `src/components/flows/restaurant-detail-flow.tsx` (3)
- `src/components/flows/table-qr-ordering-flow.tsx` (3)
- `public/sw.js` (8)

### api-error-envelope

- `src/app/api/admin/categories/route.ts` (4)
- `src/app/api/admin/cms/route.ts` (1)
- `src/app/api/admin/cuisines/route.ts` (4)
- `src/app/api/admin/data/route.ts` (3)
- `src/app/api/admin/firebase-diagnostics/route.ts` (1)
- `src/app/api/admin/master-menu-templates/route.ts` (9)
- `src/app/api/admin/owner-credentials/route.ts` (2)
- `src/app/api/admin/restaurant-leads/route.ts` (1)
- `src/app/api/admin/support-issues/route.ts` (4)
- `src/app/api/admin/system-diagnostics/route.ts` (2)
- `src/app/api/auth/phone-verification/route.ts` (1)
- `src/app/api/auth/session/route.ts` (3)
- `src/app/api/auth/test-session/route.ts` (3)
- `src/app/api/cloudinary/signature/route.ts` (1)
- `src/app/api/customer/account/route.ts` (6)
- `src/app/api/customer/cart/route.ts` (2)
- `src/app/api/customer/catering/route.ts` (2)
- `src/app/api/customer/orders/route.ts` (3)
- `src/app/api/owner/accounting/route.ts` (5)
- `src/app/api/owner/analytics/route.ts` (2)
- `src/app/api/owner/communication/route.ts` (2)
- `src/app/api/owner/customers/route.ts` (3)
- `src/app/api/owner/inventory/route.ts` (5)
- `src/app/api/owner/kitchen/notify-waiter/route.ts` (1)
- `src/app/api/owner/kitchen/route.ts` (3)
- `src/app/api/owner/loyalty-rules/route.ts` (4)
- `src/app/api/owner/master-menu-templates/route.ts` (6)
- `src/app/api/owner/menu/route.ts` (6)
- `src/app/api/owner/notification-test/route.ts` (2)
- `src/app/api/owner/offers/route.ts` (7)
- 20 more files omitted.

## Release Interpretation

- This audit is static and repository-side only.
- A hit is not automatically a bug; it marks code that needs safe logging, cleanup, bounded query, or listener review.
- Provider, Hostinger, Firebase Console, authenticated browser, physical printer, and real-device checks remain manual.
