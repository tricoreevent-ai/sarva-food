# RC6.5 Production UAT Plan

Release: `v1.0.0-rc6.5`
Repository/production SHA at preparation: `509679d2c0d1e6ce5a3a315369f799a79700006c`
Production URL: `https://violet-squid-380447.hostingersite.com`

## UAT Checklist

| Module | Checks | Status | Notes |
| --- | --- | --- | --- |
| Customer | Signup/login/logout, profile, address, restaurant browsing, favorites, offers, cart reset after logout/account switch | Pending | Verify no stale cart/session data |
| Restaurant | Listing, restaurant detail, hero/media, menu categories, item details, availability, offers, share links | Pending | Compare listing/detail data |
| QR Ordering | QR/table link open, table/session identity, add items, send order, owner/kitchen visibility | Pending | Test printed QR and copied QR URL |
| Menu | 1000-item search/filter/category performance, image loading, sold-out handling, price consistency | Pending | Include mobile and desktop |
| Cart | Add/remove, quantity changes, restaurant switch reset, offer removal, totals update | Pending | Confirm compact summary has no thumbnails in checkout |
| Checkout | Delivery, parcel, scheduled, validation errors, duplicate CTA absence, sticky mobile CTA | Pending | Confirm address-only delivery succeeds |
| Payment | Cash, COD, UPI disabled state, Razorpay if enabled, retry/failure/refund | Pending | Provider dashboard evidence required |
| Order Tracking | Success page, order detail, status changes, customer history | Pending | Verify realtime/status refresh |
| Owner Dashboard | KPIs, live orders, alerts, counters, navigation, sync health | Pending | Compare with Active Orders and Reports |
| Active Orders | Two-level filters, counts, priority ordering, actions, role permissions | Pending | Owner and Waiter must share operational behavior |
| Kitchen | New KOT, preparing, ready, delay, item-first card, history | Pending | Kitchen cannot serve/complete |
| Waiter | Ready notification, acknowledge, pickup/serve, payment handoff, completion | Pending | Validate waiter permissions only |
| POS | Dine-in/parcel/delivery, add-on KOT, bill split/merge, payment-first/kitchen-first settings | Pending | Validate no duplicate KOTs |
| Reports | Revenue, payments, tips, GST, refunds, daily closing, order history | Pending | Reconcile with orders/payments |
| Settings | Owner profile, payment settings, printers, QR, operational settings, staff | Pending | Avoid changing live provider values unless authorized |
| Notifications | Owner/waiter/kitchen alerts, sound settings, foreground/background push where enabled | Pending | VAPID/device checks required |
| Authentication | Customer/owner/admin/staff login, logout, session expiry, protected routes | Pending | Confirm role redirects |
| Session Management | Login reset, logout reset, account switch reset, restaurant switch reset | Pending | No persisted ordering state after logout |
| Role Switching | Owner, manager, waiter, kitchen, cashier, admin navigation and forbidden actions | Pending | Confirm no privilege escalation |
| Analytics | Dashboard/report counters, event consistency, no stale cards | Pending | Compare with operational state |

## Operational Test Scenarios

| Scenario | Preconditions | Steps | Expected Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| Breakfast rush | Owner, kitchen, waiter logged in; menu active | Place 10 mixed QR/website orders in 10 minutes | Owner/kitchen/waiter counters stay synchronized; no duplicate KOTs |  |  |
| Lunch rush | 3 tables, parcel, delivery enabled | Run dine-in + parcel + delivery orders simultaneously | Filters and dashboard priority show urgent work first |  |  |
| Dinner rush | 100 active/order-history seed or real load | Process sustained orders, ready, payment, complete | No UI freeze; history/reports reconcile |  |  |
| Single waiter | One waiter assigned | Accept, kitchen ready, waiter serve, payment complete | Waiter receives only permitted actions |  |  |
| Multiple waiters | Two waiters active | Reassign order, ready notification, serve | Assignment, notifications, audit reflect correct waiter |  |  |
| Kitchen overload | Many KOTs in preparing | Mark delayed/ready in mixed order | Delayed/critical orders remain visible and prioritized |  |  |
| Simultaneous QR orders | Two devices scan same/different table QR | Add and send orders concurrently | Table/session isolation preserved |  |  |
| Parcel pickup | Customer selects pickup | Place order, kitchen ready, pickup complete | No delivery address required; reports classify parcel |  |  |
| Delivery | Customer enters address | Place delivery order, accept, kitchen, dispatch/payment | Address accepted; owner sees delivery classification |  |  |
| Scheduled order | Customer chooses future slot | Place scheduled order, accept later | Scheduled filters/counts and kitchen timing correct |  |  |
| Order modification | Accepted order exists | Add/remove item where allowed | Totals/KOT/audit remain consistent |  |  |
| Add-on after kitchen acceptance | Dine-in KOT active | Add more items from POS | Add-on KOT links to parent; no duplicate parent KOT |  |  |
| Bill split | Served unpaid dine-in order | Split by item/amount and collect payment | Payment records/reports reconcile |  |  |
| Bill merge | Compatible open unpaid bills | Merge bills, pay, complete | Only bill totals merge; kitchen state not corrupted |  |  |
| Payment retry | Payment fails once | Retry with valid method | Failed payment logged; successful payment completes cleanly |  |  |
| Cancellation | New/accepted order | Cancel before/after kitchen where policy allows | Status/audit/reports reflect cancellation |  |  |
| Refund | Paid order exists | Process full/partial refund | Refund record and accounting reversal created |  |  |
| Network interruption | Browser online then offline | Place/update order during interruption, reconnect | Clear error/retry behavior; no duplicate submission |  |  |
| Session expiry | Active user session expires | Attempt protected action | User sees actionable sign-in message; no data leakage |  |  |
| Restaurant switch | Cart has restaurant A items | Open restaurant B and add item | Incompatible cart cleared/reset |  |  |

## Device Certification Matrix

| Device/Browser | Portrait | Landscape | Touch | Keyboard | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Android Chrome | Pending | Pending | Pending | N/A | Pending | Customer, QR, waiter if applicable |
| iPhone Safari | Pending | Pending | Pending | N/A | Pending | Customer/checkout/session reset |
| Tablet Chrome/Safari | Pending | Pending | Pending | Optional | Pending | POS/waiter/kitchen |
| Desktop Chrome | N/A | Pending | Optional | Pending | Pending | Owner/admin/POS/reports |
| Desktop Edge | N/A | Pending | Optional | Pending | Pending | Owner/POS |
| Desktop Firefox | N/A | Pending | Optional | Pending | Pending | Public/customer |
| Kitchen TV/display | N/A | Pending | Optional | Optional | Pending | Kitchen board visibility |

## Role-Based Validation

| Role | Must Allow | Must Block | Status |
| --- | --- | --- | --- |
| Customer | Browse, cart, checkout, track, history, logout reset | Owner/kitchen/POS/admin access | Pending |
| Owner | All operational actions, reports, settings, overrides | Cross-tenant access | Pending |
| Manager | Operational supervision where configured | Owner-only sensitive settings if not permitted | Pending |
| Waiter | Accept/serve/complete permitted orders, payment handoff | Kitchen-only/admin-only actions | Pending |
| Kitchen | Accept/prepare/ready KOT | Serve, payment, refund, owner settings | Pending |
| Cashier | Payment, billing, settlement | Kitchen status mutation if not permitted | Pending |
| Admin | Platform admin modules | Tenant data mutation beyond admin role rules | Pending |

## Production Monitoring Checklist

| Event | Required Evidence | Sensitive Data Rule | Status |
| --- | --- | --- | --- |
| Login/logout | Auth/session logs without passwords/OTP | No credentials, no tokens | Pending |
| Order placement | Order id/status/reason on failure | No raw customer secret/payment data | Pending |
| Payment/refund | Provider status, masked ids | No key secret/webhook secret | Pending |
| Kitchen acceptance/ready | Order/KOT ids and actor role | No full PII | Pending |
| Order completion | Order id, payment/service status | No card/provider secret | Pending |
| API failures | Structured safe reason/status | No stack traces to users | Pending |
| Session reset | Reset event/action path | No localStorage contents | Pending |

## Performance Validation

| Load Case | Method | Expected Result | Status |
| --- | --- | --- | --- |
| 100+ active orders | Seed/stage or controlled live rush | Boards remain responsive; no duplicate listeners | Pending |
| 1000+ menu items | Large menu profile | Search/filter/cart remain responsive | Pending |
| Long order history | Large history page | Pagination/filtering stable | Pending |
| Concurrent customers | Multi-device ordering | No duplicate orders/KOTs; counters sync | Pending |
| Memory usage | 30-minute browser/device run | No growing heap/listener leak | Pending |
| Browser responsiveness | Lighthouse/Chrome Performance | Acceptable INP/CLS/no long freezes | Pending |

## Bug Classification

| Severity | Definition | Release Action |
| --- | --- | --- |
| Critical | Data loss, payment/accounting corruption, privilege escalation, order loss | Stop UAT; fix before production |
| High | Core workflow blocked for a role/channel | Fix before production |
| Medium | Workaround exists; operational friction | Triage before launch |
| Low | Minor inconsistency or rare edge | Track for post-release |
| Cosmetic | Visual polish only | Do not block UAT unless brand-breaking |

## Known Risks And Limitations

- Authenticated multi-role production smoke requires real credentials and browser sessions.
- Provider checks require Razorpay/WhatsApp/SMTP/Cloudinary/Firebase dashboards.
- Hardware checks require real printer, QR codes, camera/upload devices, and Kitchen display.
- Lighthouse, Chrome profiling, and long-run heap checks must be captured on the deployed site.
- Production data mutation tests must be coordinated with backup/rollback and restaurant staff awareness.

## Production Sign-Off Checklist

- [ ] Release metadata SHA/version/environment verified.
- [ ] Customer order placement verified.
- [ ] Owner receives order in dashboard/Active Orders.
- [ ] Kitchen receives KOT and marks ready.
- [ ] Waiter serves and completes permitted workflow.
- [ ] Cashier/payment/refund path reconciles.
- [ ] Reports reconcile with orders/payments/tips/tax/refunds.
- [ ] Session reset verified across login/logout/account/restaurant switch.
- [ ] Device/browser matrix completed.
- [ ] Provider dashboards verified.
- [ ] Firebase rules/indexes/auth domains verified.
- [ ] Printer/QR/hardware checks passed.
- [ ] Known issues reviewed and accepted.

## Support Handover Notes

- Use `/api/release-info` first for SHA/version/environment.
- Use `/health/live`, `/health/ready`, and `/health/startup` for runtime/backend health.
- Treat order/payment/accounting mismatches as Critical or High.
- Capture screenshots, role, restaurant, order id, device/browser, time, and exact action for every defect.
- Do not request customer passwords, OTPs, card data, provider secrets, or Firebase service-account values.
