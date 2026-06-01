# Sarva Food Task Tracker

Last updated: 2026-06-01

This file is the project-visible source of truth for implementation progress. Update it whenever a task is started, completed, deferred, or blocked.

## In Progress

- [ ] Deploy the latest verified application build to Hostinger.
- [ ] Configure and verify the production outage alert recipient in Hostinger and Admin CMS.

## Completed

- [x] Admin and owner login routes bypass the lazy dashboard shell to avoid Next.js dev HMR router initialization errors during login.
- [x] Customer, owner, and admin shells now load through independent `React.lazy()` + `Suspense` runtime boundaries.
- [x] Customer, owner, and admin modules each have independent route/runtime error recovery so one module crash does not take down another module.
- [x] Module retry and scoped auth hydration updates use `useTransition()` to keep the interface responsive during recovery/session updates.
- [x] Customer high-traffic routes now have customer-scoped error boundaries: home/root, restaurants, restaurant detail, offers, cart, checkout, orders, profile, account, and tracking.
- [x] Admin and owner route errors now use the same transition-safe module recovery component.
- [x] Module API ownership remains separated by endpoint family: customer/public APIs under `/api/public` plus customer order/payment APIs, owner APIs under `/api/owner`, and admin APIs under `/api/admin`.
- [x] Owner POS opens without requiring branch onboarding first.
- [x] Owner POS uses a safe fallback main branch when a branch document is not available yet.
- [x] Customer listing is restricted to restaurants with complete public profile, location, contact, media, cuisine, hours, and delivery configuration.
- [x] `divakdi@gmail.com` is linked to `Cafe Al Arab UL`.
- [x] Cafe Al Arab UL baseline owner profile, customer listing data, location, hours, delivery settings, contacts, cuisines, and banners are seeded.
- [x] Owner Branding supports multiple restaurant banners.
- [x] Owner Branding includes a live customer-facing banner preview.
- [x] Owner sidebar includes a Banners shortcut.
- [x] Admin CMS supports configurable homepage content and branding.
- [x] Customer homepage and restaurant listing use CMS-backed public content.
- [x] Hostinger production environment template and deployment notes are present.
- [x] Customer, owner, and admin auth guardrails are separated by role.
- [x] Customer homepage and restaurant listing show simple, non-technical recovery messages when restaurant data cannot be loaded.
- [x] Public restaurant, category, menu, offer, CMS, and review API failures trigger a throttled database outage alert email.
- [x] Admin CMS includes customer service alert controls for recipient email, enable/disable, and customer-facing recovery copy.
- [x] Hostinger environment template includes the `DATABASE_ALERT_EMAIL` outage fallback recipient.
- [x] Printer settings use the safe default operational branch when onboarding has not created a branch document yet.
- [x] Verification completed on 2026-05-31: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Customer homepage loading uses a branded animated state instead of blank restaurant-card placeholders while public data loads in the background.
- [x] Verification completed after homepage loader update on 2026-05-31: `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Admin Firebase startup diagnostics now run through a server-side Admin SDK endpoint instead of browser Firestore aggregation queries.
- [x] Admin dashboard no longer triggers client-side `permission-denied` aggregation errors for protected Firestore collections.
- [x] Admin startup banner now uses a lightweight health check; full collection and index scans stay on the Firebase Diagnostics page.
- [x] Admin, owner, and customer route guards now use module-scoped session cookies instead of one shared `sarva_role` cookie.
- [x] Admin and owner logins can coexist without redirecting the owner app back to the admin dashboard.
- [x] Local same-browser session verification passed on 2026-05-31: admin and owner scoped sessions remain valid in the same cookie jar.

## Deployment Follow-Up

- [ ] Add the required production environment variables in Hostinger.
- [ ] Set `DATABASE_ALERT_EMAIL` in Hostinger to the admin mailbox that should receive database outage alerts.
- [ ] Open Admin → System Settings → Customer service alerts and save the same recipient address.
- [ ] Confirm SMTP settings in Hostinger so outage alerts and credentials email can be delivered.
- [ ] Run `npm run firebase:seed:production` after deploying if hosted Firestore still contains old test-owner records.
- [ ] Redeploy the latest GitHub commit to Hostinger.
- [ ] Verify customer homepage, `/owner/login`, `/owner/pos`, and `/admin/login` on the hosted URL.

## Notes

- Owners may use operational screens immediately after login.
- A restaurant is intentionally hidden from the customer portal until its public profile is complete.
- Public outage messages must never expose Firestore, Firebase, stack traces, environment variables, or other infrastructure details.
