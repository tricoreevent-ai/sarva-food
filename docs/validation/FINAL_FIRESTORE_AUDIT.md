# Final Firestore Audit

Date: 2026-07-20T15:28:42.110Z

## Scope

No Firestore collection, schema, or index changed. RC5 waiter-serving hardening updates Firestore rules only to align direct protected writes with the server RBAC matrix while keeping Kitchen/order document shapes unchanged.

## Result

| Area | Result |
| --- | --- |
| Kitchen orders | Existing kitchen ticket documents are read through the current tenant-scoped repository and mapped to the same TableOrder shape. |
| History paging | Server accepts bounded page/pageSize and filter parameters before returning rows to the UI. |
| Billing/payment | Existing payment fields are displayed and exported; direct Firestore status-only updates no longer allow paymentStatus mutation. Server payment APIs remain the write path. |
| RBAC parity | Waiter direct status-only writes are limited to Served/Completed; Kitchen roles are limited to Accepted/Preparing/Ready/Cancelled and cannot Serve/Complete. |
| Audit/timeline | Existing statusHistory, print count, payment status, and merged-ticket metadata are displayed without adding write paths. |
| Listeners and indexes | No listener or index added. Rules changed and require Firebase Console deployment/smoke. |

Firebase Console rules deployment and authenticated protected read/write smoke remain manual.
