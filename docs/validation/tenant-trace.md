# Tenant Trace

Status: In progress. Exact authenticated production session values require an
Owner/Admin session and are not inferred here.

## Proven Runtime Values

The public restaurant API returned the same record locally and in production:

| Field | Value |
| --- | --- |
| `tenantId` | `cafe-al-arab-thanisandra` |
| `restaurantSlug` | `cafe-al-arab-thanisandra` |
| `ownerId` | `7EFvpGe3tqNpMHOcmPMFFmq8bGk1` |
| `branchId` | `br-cafe-al-arab-thanisandra` |

The corresponding `users/{ownerId}` document was read through the local Admin
service account and contains:

```text
role: owner
active: true
tenantId: cafe-al-arab-thanisandra
tenantIds: [cafe-al-arab-thanisandra]
restaurantIds: [cafe-al-arab-thanisandra]
branchIds: [br-cafe-al-arab-thanisandra]
```

## Resolution Paths

| Surface | Resolution path | Actual/default result | Risk |
| --- | --- | --- | --- |
| Owner login/session | `verifyFirebaseIdToken()` reads `users/{uid}` then `/api/auth/session` writes scoped owner cookies | User document values above | Server cookies and Firestore client auth are separate mechanisms |
| Owner menu | `authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID`, then `resolveTenantId()` | Cafe Al Arab default/alias | Uses client store plus default fallback |
| Owner orders | Builds a union from `authUser.restaurantSlug`, `authUser.tenantId`, matching restaurant docs, then always includes `DEFAULT_RESTAURANT_ID` | Cafe Al Arab aliases/default | Can query more than one identifier before de-duplication |
| Owner reports | Reads `useAppStore().orders` and `tableOrders` | No runtime tenant query | No canonical tenant-scoped server query |
| Owner offers | `authUser.restaurantSlug`, then `/api/owner/offers`; API resolves `session.tenantId` | Cafe Al Arab | Client/store and server session use different sources |
| Owner loyalty | Hydrator uses `DEFAULT_TENANT_ID`; loyalty page reads local Zustand data | Cafe Al Arab default | Does not use canonical customer order data |
| POS | `restaurant-ops-service` defaults to `DEFAULT_RESTAURANT_ID` and `DEFAULT_BRANCH_ID` | Cafe Al Arab default branch | Defaults mask missing runtime scope |
| Kitchen | `listenKitchenOrders()` resolves restaurant ID and defaults branch ID | Cafe Al Arab default branch | Requires Firebase user document tenant/branch access |
| Customer orders | `/api/orders` resolves requested restaurant ID and writes the restaurant `tenantId` | Restaurant document tenant | Server write path is canonical |

## Code Locations

- Tenant aliases/defaults: `src/lib/tenant.ts`
- Owner session cookies and Firebase profile lookup: `src/lib/server-auth.ts`,
  `src/app/api/auth/session/route.ts`
- Owner order union: `src/components/flows/owner-order-management-flow.tsx`
- Menu listener/API: `src/services/advanced-menu-service.ts`,
  `src/app/api/owner/menu/route.ts`
- Operational defaults: `src/services/production-data-service.ts`,
  `src/services/restaurant-ops-service.ts`
- Website order write: `src/app/api/orders/route.ts`

## Conclusion

Public local and production tenant values are identical. The authenticated owner
record is correctly scoped in Firestore. Full owner-session parity is still
**unproven** because the authenticated Hostinger owner-cookie payload was not
available during this investigation.

The current architecture has multiple tenant derivation paths and unconditional
Cafe Al Arab defaults. It needs one server-backed tenant resolver before this
can be considered complete.
