# Root Cause Analysis: Local vs Production Data

Status: Investigation active. Do not treat this as feature completion.

## Root Cause

1. Public Firebase runtime configuration matches between localhost and Hostinger:
   both use `sarva-food-app` and the default Firestore database.
2. Local Admin credentials also target `sarva-food-app`; canonical data contains
   orders and revenue.
3. Owner dashboard, reports, and loyalty surfaces are not consistently sourced
   from that canonical data. They rely on Zustand state, local derivation, and
   direct listeners with mixed tenant defaults.
4. Website orders do not create/update CRM or loyalty records. The live tenant
   has 5 orders but zero `customers` and zero `loyaltyCustomers`.
5. Some listener paths turn permission denial into an empty result, making a
   failure indistinguishable from no records.
6. Public offer visibility uses the server's local clock. Local IST and
   Hostinger UTC produced different offer results from the same offer document.

## Fix

No fix is applied in this documentation-only phase. Required implementation is
defined in [data-parity-report.md](data-parity-report.md): canonical repositories,
atomic customer/loyalty writes, repository-backed owner screens, explicit
listener error telemetry, restaurant-timezone offer evaluation, and authenticated
Hostinger diagnostics.

## Verification Method

See the runtime, tenant, collection, rule, and parity reports:

- [firebase-runtime-audit.md](../performance/firebase-runtime-audit.md)
- [tenant-trace.md](tenant-trace.md)
- [firestore-collection-trace.md](firestore-collection-trace.md)
- [firestore-rule-failures.md](firestore-rule-failures.md)
- [data-parity-report.md](data-parity-report.md)

The investigation remains open until authenticated local and production
diagnostics return identical tenant-scoped counts and revenue with no
permission-denied listeners.
