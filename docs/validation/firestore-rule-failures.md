# Firestore Rule Failures

Status: Root-cause investigation in progress. No error is suppressed in this
report; unobservable details are explicitly marked unproven.

## Rule Gate

Every tenant-scoped client listener must satisfy:

```text
hasTenant(resource.data)
AND userHasTenant(resource.data.tenantId)
AND canAccessBranch(resource.data)
```

Source: `firestore.rules` functions `tenantScopedRead`, `userHasTenant`, and
`canAccessBranch`.

For Cafe Al Arab, the owner user document is active and has the expected tenant
and branch membership. Therefore a permission denial for that owner means one of
the following must be true:

1. The browser Firebase user is not the scoped owner user.
2. The Firebase user document is stale, inactive, or lacks the required scope in
   the project actually used by that browser session.
3. A returned document lacks `tenantId`, has a different `tenantId`, or has a
   restricted `branchId`.
4. The failed listener is a different query than the currently inspected owner
   queries.

## Listener Trace

| Listener | Collection/query | Rule evaluated | Failure visibility | Current evidence |
| --- | --- | --- | --- | --- |
| Owner menu | `menus` and `menuItems`; `tenantId`/`restaurantId` aliases | Generic menu tenant-scoped read | Hydrator logs error then fetches `/api/owner/menu` fallback | Exact failing browser query not captured |
| Owner kitchen | `kitchenOrders`; tenant, branch, status, order | `tenantScopedRead()` | Hydrator callback can log warning | Requires active Firebase owner user and matching tenant/branch |
| Owner inventory | `inventory`; default tenant and branch | `tenantScopedRead()` | Hydrator passes no error callback | Failure can silently leave an empty store |
| Owner loyalty | `loyaltyCustomers`; default tenant, `loyaltyPoints desc` | `tenantScopedRead()` or `ownsUser(customerId)` | Hydrator passes no error callback | Canonical count is zero, so an empty result is expected once authorized |
| Owner orders | `orders`; tenant/status/order query | `tenantScopedRead()` | `listenToQueryShared()` logs only in development then emits `[]` | A denied listener can look exactly like zero orders |
| Customer orders | `customerOrders`; `customerId == uid` | `ownsUser(customerId)` or tenant scope | Hook reports generic load error and sets empty rows | Requires Firebase Auth uid equal to `customerId` |
| Customer loyalty | `customerLoyalty`; `customerId == uid` | Owner check or tenant scope | Hook reports generic load error and sets null | No customer loyalty documents currently exist |
| Customer addresses | `customerAddresses`; `customerId == uid` | Owner check or tenant scope | Header listener sets empty addresses on error | Requires Firebase Auth uid equal to `customerId` |

## Exact Error-Handling Defect

`src/services/firestore-query.ts` changes a failed shared query into `emit([])`.
`FirestoreStoreHydrator` also omits error handlers for inventory and loyalty
listeners. This destroys the distinction between an authorized empty collection
and a permission-denied listener in UI state.

This report does not change that behavior because feature work is paused. It
identifies why the browser console error cannot currently be attributed to one
exact collection from existing telemetry alone.

## Evidence Still Required

To identify the exact live browser failure, capture the following while signed
in as the affected owner:

```text
Firebase Auth uid
users/{uid}: active, role, tenantId(s), restaurantId(s), branchId(s)
listener collection and complete query constraints
Firestore error code/message
sample document tenantId and branchId
```

The production Admin Firebase Diagnostics route is Admin-only and can verify
server connectivity and collection counts, but it does not inspect a browser
user's Firestore auth session.
