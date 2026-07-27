# Multi-Tenant Authentication Architecture

## Tenant Model

Food Gedi is one platform serving many restaurants, hotels, and cloud kitchens. A tenant is the restaurant business registered on the platform. The current compatibility tenant id for the seeded restaurant is `cafe-al-arab-thanisandra`.

Core tenant records:

- `tenants/{tenantId}`: platform tenant shell, status, owners, primary branch, subscription placeholder.
- `restaurants/{restaurantId}`: customer-facing restaurant profile. It carries `tenantId`.
- `branches/{branchId}`: operational branch record. It carries `tenantId`, `restaurantId`, and `branchId`.
- Every operational collection must carry `tenantId`; branch-scoped collections also carry `branchId`.

`restaurantId` remains as a compatibility alias for existing screens and URLs. Authorization is based on `tenantId`.

## Role Hierarchy

- `admin`: platform-level operator. Creates tenants, owner accounts, primary branches, approvals, and subscription placeholders.
- `owner`: tenant-level business owner. Created only by admin.
- `manager`: branch or tenant operations manager.
- `cashier`: POS, billing, receipts, and customer lookup.
- `waiter`: tables, POS handoff, and KOT creation.
- `chef`: KDS and kitchen order status.
- `accountant`: accounting, expenses, and reports.
- `inventory-manager`: inventory, suppliers, and purchase operations.
- `delivery-staff`: delivery operations.
- `customer`: platform-wide customer account, not tenant-restricted at signup.

Owners cannot create owners or admins. Owner employee creation is restricted to employee roles.

## Login Architecture

- `/login`: public customer login.
- `/signup`: public customer signup with email/password and email verification.
- `/portal/login`: owner and employee operational login.
- `/admin/login`: platform admin login.

Customer auth is separated from operational auth. Operational sign-in checks the existing Firestore `users/{uid}` profile and refuses unapproved or wrong-role accounts instead of silently creating customer profiles.

Development-only login uses:

```env
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
```

It is disabled in production and provides local fixtures:

- `divakdi@gmail.com`
- `manager@sarva.test`
- `cashier@sarva.test`
- `chef@sarva.test`
- `waiter@sarva.test`
- `dinucd@gmail.com`

All use `password123`.

## Firestore Tenant Structure

User mapping:

```ts
users/{uid} = {
  uid,
  tenantId,
  tenantIds,
  restaurantIds,
  branchIds,
  role,
  permissions,
  active
}
```

Customer collections:

- `customerProfiles`
- `customerAddresses`
- `customerOrders`
- `customerLoyalty`

Operational collections include `tenantId`, with `branchId` where applicable:

- `orders`
- `menuItems`
- `menus`
- `menuCategories`
- `tables`
- `kitchenOrders`
- `inventory`
- `inventoryTransactions`
- `purchaseOrders`
- `suppliers`
- `reports`
- `accountingEntries`
- `expenses`
- `printers`
- `printerProfiles`
- `receipts`
- `paymentTransactions`
- `loyaltyCustomers`
- `staffActivityLogs`
- `settings`

## RBAC Model

Firestore rules enforce:

- Admin can read/write platform tenant setup.
- Tenant users can access only documents whose `tenantId` belongs to their profile.
- Branch-scoped users can access only assigned `branchIds`.
- Customers can read/write their own customer profile, addresses, and orders.
- Public reads are limited to published restaurant/menu/offer data.
- Owner/manager can create employee-role user records only within their tenant.
- Owner/manager cannot create owner/admin records.

## Authentication Flow

Customer:

1. Public website.
2. `/signup` creates Firebase Auth user.
3. Verification email is sent.
4. `users/{uid}` and `customerProfiles/{uid}` are created with role `customer`.
5. Customer browses restaurants and places tenant-scoped orders.

Owner/employee:

1. Admin creates tenant and user profile.
2. Firebase UID maps to `users/{uid}`.
3. `/portal/login` verifies role, active status, tenant, and branch access.
4. Session cookies store role, tenant, tenant list, branch list, and compatibility restaurant ids.

Admin:

1. `/admin/login`.
2. Firebase UID maps to `users/{uid}` with role `admin`.
3. Admin can create tenants, owners, branches, approvals, subscriptions, and audit records.

## Owner Onboarding Workflow

Public inquiry starts at `/register-restaurant`.

Flow:

1. Restaurant submits inquiry.
2. Admin reviews in `/admin/restaurants`.
3. Admin creates tenant draft.
4. Admin creates owner account and primary branch.
5. Subscription placeholder is attached.
6. Owner signs in through `/portal/login`.
7. Owner completes restaurant operations setup from `/owner/onboarding`.

## Employee Workflow

Owner employee management is available at `/owner/employees`.

Owner can:

- Create employees.
- Assign role.
- Assign branch.
- Assign permissions.
- Deactivate/reactivate employee.

Owner cannot create:

- Owner accounts.
- Admin accounts.

Employee records are tenant-scoped and written to `users` when Firebase is available.

## Admin Workflow

Admin can:

- Review restaurant inquiries.
- Create tenant shells.
- Create owner records.
- Create primary branch records.
- Maintain subscription placeholders.
- Monitor platform analytics and Firebase diagnostics.
- Disable tenants or users through platform-level records and rules.

## Verification

The implemented pass was verified with:

```bash
npm run typecheck
cmd /c npm run lint
cmd /c npm run build
```

Local smoke checks confirmed:

- `/login`, `/signup`, `/portal/login`, `/admin/login`, `/register-restaurant` return 200.
- Unauthenticated `/owner` redirects to `/portal/login`.
- Unauthenticated `/admin` redirects to `/admin/login`.
- Owner dev session opens owner/POS modules.
- Admin dev session opens admin modules.
- Owner session cannot open `/admin`.
- Admin session cannot open `/owner`.
