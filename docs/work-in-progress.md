# Work In Progress

Last updated: 2026-06-25

Current Sprint: Sprint 2 Stabilization

Current Phase: Repository and screen stabilization

Current Task: Admin, customer, staff, printer, audit, and view-switching stabilization

Files Changed:

- `src/app/admin/analytics/page.tsx`
- `src/app/admin/campaigns/page.tsx`
- `src/app/admin/cms/page.tsx`
- `src/app/admin/featured-menu-items/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/plans/page.tsx`
- `src/app/admin/restaurants/page.tsx`
- `src/app/admin/reviews/page.tsx`
- `src/app/admin/subscriptions/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/api/admin/data/route.ts`
- `src/app/api/customer/account/route.ts`
- `src/app/api/customer/catering/route.ts`
- `src/app/api/customer/orders/route.ts`
- `src/app/api/owner/audit-logs/route.ts`
- `src/app/api/owner/printers/route.ts`
- `src/app/api/owner/view-mode/route.ts`
- `src/components/owner/operational-view-switcher.tsx`
- `src/hooks/use-admin-repository-data.ts`
- `src/hooks/use-operational-view.ts`
- `src/hooks/use-printer-settings.ts`
- `src/lib/server/owner-api-access.ts`
- `src/repositories/admin-repository.ts`
- `src/repositories/audit-repository.ts`
- `src/repositories/customer-account-repository.ts`
- `src/repositories/printer-repository.ts`
- `src/services/customer-order-api.ts`
- `docs/full-data-consistency-audit.md`
- `docs/screen-migration-tracker.md`
- `docs/work-in-progress.md`
- `docs/project-tracker.md`
- `docs/changelog.md`

Completed %: 45

Current Branch: `main`

Current Commit: `b109d3ecfa3e475570750eb5972ae5a0bffc67a6`

Last Verified Build: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS on 2026-06-25

Last Verified Production SHA: `e75a3c5cf0873a0d212263010e75b0c4b3470aeb`

Files Remaining:

- Complete Staff & Access permission enforcement verification.
- Complete protected owner view-switching browser validation.
- Complete printer profile/routing/test print browser validation.
- Complete audit log screen filter/session validation.
- Run production validation after commit and deployment.

Next Command:

```powershell
npm run build
```

Next Exact Task:

Browser-validate owner Staff & Access, operational view switching, audit logs, printer settings, admin repository screens, and customer profile/order history against repository APIs.

Known Risks:

- Production validation still requires deployment and Hostinger/runtime access.
- Permission matrix requires authenticated owner/staff role coverage.

Acceptance Criteria:

- Admin pages load from `/api/admin/data` without business-data `useAppStore` reads.
- Customer order history loads from `/api/customer/orders`.
- Owner staff, printer, audit, and view-switching APIs enforce scoped owner access.
- Typecheck, lint, build, and diff check stay green.
