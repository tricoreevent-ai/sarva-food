# Data Parity Report

Status: In progress. This is a source-of-truth audit, not task completion.

## Canonical Firestore Baseline

Read on 2026-06-23 through the local service account for:

```text
project: sarva-food-app
database: (default)
tenant: cafe-al-arab-thanisandra
```

| Collection/metric | Canonical value |
| --- | ---: |
| `orders` | 5 |
| `customerOrders` | 5 |
| Order revenue (`sum(total)`) | INR 3,732 |
| `customers` | 0 |
| `loyaltyCustomers` | 0 |
| `offers` | 2 |
| `menus` | 8 |
| `menuItems` | 0 |
| `kitchenOrders` | 4 |
| `tables` | 0 |
| Tenant-scoped users | 2 |

Order statuses: 4 `new`, 1 `delivered`.

## Localhost vs Production Public API

| Endpoint | Localhost | Production | Explanation |
| --- | ---: | ---: | --- |
| Restaurant profile | 1 | 1 | Same tenant, owner, branch, and restaurant slug |
| Public menu | 8 | 8 | Same public path and source data |
| Public offers | 0 | 1 | Runtime timezone-dependent offer filter |

`OFFER5894` is active until 2026-10-17 but is configured for `01:01` through
`11:00`. The local request ran at 11:27 IST and correctly hid it according to
the local process clock. Hostinger generated its response at 05:57 UTC and
returned the same offer inside that server-time window.

## Why Local Screens Can Show Zero

1. The owner dashboard and reports page read Zustand state, not canonical
   `orders` data.
2. `FirestoreStoreHydrator` resets owner operational state but does not hydrate
   `state.orders` from the `orders` collection.
3. A failed shared order listener is converted to an empty list by
   `listenToQueryShared`.
4. Website order creation writes `orders` and `customerOrders`, but does not
   write `customers`, `customerTransactions`, `customerLoyalty`, or
   `loyaltyCustomers`.

The observed zero customer and loyalty records are therefore a real database
pipeline gap, not merely a display problem.

## Root Cause

The primary issue is **not a different public Firebase project**. It is a
combination of:

- operational screens using local/Zustand state instead of one canonical
  repository;
- incomplete customer and loyalty writes from website orders;
- listener errors being collapsed into empty state;
- duplicated tenant defaults/resolution paths;
- server-local timezone used to evaluate public offer time windows.

## Fix Plan

No implementation has been applied in this audit phase. The next approved phase
must:

1. introduce a server-backed `CustomerRepository`;
2. make every order path atomically update customer, transaction, and loyalty
   documents;
3. replace dashboard/report/loyalty local-state reads with repository/API data;
4. retain and expose listener failures with collection/query context;
5. resolve offer windows in the restaurant timezone, not server-local time;
6. add an authenticated diagnostics comparison for Hostinger Admin SDK,
   tenant scope, counts, and revenue.

## Verification Method

After implementation, use the same owner session in localhost and Hostinger,
then compare the authenticated diagnostics endpoint and repository response for:

```text
project, database, tenant, orders, revenue, customers, loyalty, offers,
menus, tables, staff, and listener status
```

Only equal values with no listener failures can close this investigation.
