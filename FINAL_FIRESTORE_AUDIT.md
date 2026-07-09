# Final Firestore Audit

Date: 2026-07-09

## Scope

No Firestore collection, schema, rule, index, repository contract, or API contract was changed in the RC4 release-readiness pass.

## Listener And Read Audit

| Area | Result |
| --- | --- |
| Kitchen SSE | Existing stream remains the realtime path; client reconciliation reduces render churn without adding listeners. |
| Public header addresses | Phase 2 lazy-loads saved-address listener only while location picker is open for a signed-in customer. |
| Customer home menu preview | Phase 2 defers below-fold menu preview network work to idle. |
| App store mutations | Phase 2 loads Firestore mutation services only when mutation actions run. |
| New final pass listeners | None. |
| New final pass indexes | None. |
| RC4 rules/index review | Existing `firestore.rules` keeps catch-all deny and provider-secret collections server-only; `firestore.indexes.json` already contains the active order, kitchen, public restaurant/menu, accounting, inventory, notification, campaign, catering, and delivery composites used by current repository queries. |

## Remaining Manual Firestore Gates

Firestore rules/index deployment, Firebase Console diagnostics, authenticated production reads/writes, and provider-backed Firebase Admin readiness remain manual release gates.

Deployment commands:

```bat
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only firestore:indexes
```
