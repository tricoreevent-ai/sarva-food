# First Real Plugin

Feature ID: `PH2D-PRODUCTION-001`

The Restaurant Health Dashboard is the first real Food Gedi plugin implemented on the official Plugin SDK. It is an Admin/Developer diagnostics plugin that validates production plugin readiness without touching business workflows.

Scope:

- Uses only SDK/context surfaces for plugin behavior.
- Registers all supported extension points.
- Registers lazy admin/developer/settings/report routes.
- Exercises memory, session, persistent, and encrypted storage modes.
- Validates permissions for guest, customer, kitchen, waiter, owner, admin, and developer roles.
- Remains disabled by default through `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD=false`.

No Firestore, repository, application API, payment, auth, realtime, Customer, Owner, Kitchen, POS, Admin, QR, Inventory, or Reports business module is imported.
