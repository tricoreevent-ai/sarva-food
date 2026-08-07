# RC6.26 Production Operations Handover

Generated: 2026-08-07

## Executive Summary

The repository is complete at commit `1a1f12bf3f0d99600b51bd932abecc1f0fb3be09` on `release/production-nammude`. RC6.25 passed typecheck, ESLint, production build, bundle analyze, release audit, operational smoke, runtime profile, theme contrast, brand visual regression, and `git diff --check`.

No application feature work remains. Production launch is blocked only by external infrastructure, provider configuration, deployment verification, and manual UAT.

## Repository Status

| Area | Status | Manual action |
| --- | --- | --- |
| Implementation | Complete | None |
| Pending source TODO/FIXME/HACK | None actionable | Keep `npm run audit:release` in release checks |
| Disabled production code | None found | Keep dev/test flags disabled |
| Temporary runtime code | None found | Keep ignored local logs uncommitted |
| Duplicate implementation / dead routes | None confirmed | Verify authenticated browser flows after deploy |
| Obsolete assets | None confirmed | Run brand/visual regression after asset changes |

No additional repository work remains.

## Remaining Repository Tasks

None.

## Remaining Manual Tasks

| Task | Blocking? | Owner | Verification |
| --- | --- | --- | --- |
| Hostinger deploy final branch/SHA | Yes | Infrastructure | `/api/release-info` shows production env and final SHA |
| Production env variables | Yes | Infrastructure | `npm run validate:prod-env` and `/health/ready` |
| Firebase rules/indexes/storage/auth/domain/VAPID | Yes | Firebase admin | Firebase Console plus app smoke |
| Razorpay live keys, webhook, settlements | Yes for payments | Payment admin | Live low-value payment/refund and dashboard reconciliation |
| SMTP sender and alert delivery | Recommended, blocking for email OTP/alerts | Mail admin | OTP email and alert email received |
| WhatsApp Cloud API | Optional unless automated WhatsApp is enabled | Meta admin | Template/webhook test succeeds |
| Browser/device UAT | Yes | QA | Signed checklist completed |
| Lighthouse/Chrome profiling | Yes | QA/performance | Reports stored with launch notes |

## Hostinger Checklist

1. Login to Hostinger hPanel with the production account.
2. Open Websites, select the production domain/application.
3. Open Node.js application for the app, not a staging or test app.
4. Verify Git repository is `https://github.com/tricoreevent-ai/sarva-food.git`.
5. Verify branch is `release/production-nammude`.
6. Verify deployed commit is `1a1f12bf3f0d99600b51bd932abecc1f0fb3be09` or later approved release commit.
7. Verify Node version is `22.x`; package requires `>=22 <23`.
8. Verify npm version is `10.x` or later.
9. Verify install command is `npm ci` if Hostinger supports it; otherwise use `npm install`.
10. Verify build command is `npm run build`.
11. Verify start command is `npm run start`.
12. Verify output folder is `.next`.
13. Verify working directory is the repository root containing `package.json`.
14. Verify environment is `production`.
15. Verify `NODE_ENV=production` is set by Hostinger or explicitly configured.
16. Enter all required environment variables from the checklist below.
17. Keep dev/test/plugin diagnostic flags disabled unless running controlled profiling.
18. Verify restart policy is enabled / always restart on crash.
19. Clear Hostinger/cache/CDN cache.
20. Restart the Node.js application.
21. Open `/health/live`; expect HTTP 200.
22. Open `/health/ready`; expect configured Firebase/Storage/SMTP status as intended.
23. Open `/api/release-info`; verify version `v1.0.0-rc6.5`, production env, branch, and SHA.
24. Open customer home, restaurant page, owner login, admin login, and one API route.
25. Run production smoke with `PRODUCTION_URL=https://<domain> npm run smoke:production`.
26. Run deployment verification with `PRODUCTION_URL=https://<domain> EXPECTED_SHA=<sha> npm run verify:deployment`.

## Environment Variables Checklist

### Required

| Name | Purpose | Where used | Example value | How to verify | Safe default? | Blocking? |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Enables production-safe behavior | Runtime config, health/release checks | `production` | `npm run validate:prod-env`; `/api/release-info` | No | Yes |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS origin and trusted links | Public links, origin validation, WhatsApp/share links | `https://violet-squid-380447.hostingersite.com` | Must be HTTPS in validation and browser | No | Yes |
| `NEXT_PUBLIC_APP_VERSION` | Deployed release identity | Release info, health reports | `v1.0.0-rc6.5` | `/api/release-info` | No | Yes |
| `NEXT_PUBLIC_USE_FIREBASE` | Enables production Firebase data plane | Firebase bootstrap/auth/data | `true` | Validator and app data smoke | No | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web client key | `src/firebase/config.ts` | `AIza...` | Firebase client initializes | No | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase auth/session flows | `sarva-food-app.firebaseapp.com` | Login smoke | No | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Production Firebase project | Firebase client/repository | `sarva-food-app` | Health project id | No | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Storage, image/media health | `sarva-food-app.firebasestorage.app` | Upload/media smoke | No | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender id | Messaging/bootstrap | `488410799126` | Validator format check | No | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app id | Firebase bootstrap | `1:488410799126:web:...` | Validator format check | No | Yes |
| `FIREBASE_ADMIN_PROJECT_ID` | Server-side Firebase Admin project | `src/firebase/admin.ts` | `sarva-food-app` | `/health/ready` admin configured | No | Yes |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account identity | Firebase Admin SDK | `firebase-adminsdk-...@...iam.gserviceaccount.com` | Validator service-account format | No | Yes |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Signs Admin SDK requests | Firebase Admin SDK | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Validator PEM check; server health | No | Yes |
| `TABLE_QR_SECRET` | Prevents forged QR table sessions | Table QR signing/verification | 32+ random chars | QR session smoke | No | Yes |
| `PAYMENT_SETTINGS_ENCRYPTION_KEY` | Encrypts owner payment credentials | Payment settings storage | 32+ random chars | Validator secret check | No | Yes |

### Recommended

| Name | Purpose | Where used | Example value | How to verify | Safe default? | Blocking? |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web push public key | FCM/browser notifications | Firebase Web Push key | Push subscription test | Push disabled if missing | No unless push required |
| `SMTP_HOST` | Email SMTP host | Email OTP/alerts | `smtp.gmail.com` | OTP email smoke | Email disabled if missing | No unless email OTP required |
| `SMTP_PORT` | SMTP port | Email transport | `587` | SMTP health | Defaults not guaranteed | No unless email required |
| `SMTP_SECURE` | TLS mode | Email transport | `false` for 587, `true` for 465 | SMTP health | No | No unless email required |
| `SMTP_USER` | SMTP login | Email transport | `orders@example.com` | SMTP health | No | No unless email required |
| `SMTP_PASS` | SMTP password/app password | Email transport | Gmail 16-char app password | OTP email smoke | No | No unless email required |
| `SMTP_FROM` | Sender identity | Email transport | `Nammude <orders@example.com>` | Received email From header | No | No unless email required |
| `DATABASE_ALERT_EMAIL` | Alert recipient | DB/provider alerts | `ops@example.com` | Trigger/test alert | Alerts disabled if missing | No |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Map features | Mapbox/geolocation UI | `pk...` restricted token | Address/map smoke | Maps degrade if missing | No |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Google sign-in public client | Auth login UI | `...apps.googleusercontent.com` | OAuth login smoke | Other auth still works | No |
| `GOOGLE_OAUTH_CLIENT_ID` | Google sign-in server client | Auth server checks | Same as public client | Validator client-match | Other auth still works | No |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth secret | Auth server checks | Provider secret | OAuth callback smoke | Other auth still works | No |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public media cloud name | Client media display/upload prep | `ddk6xbfxd` | Image/upload smoke | Firebase/static fallback | No |
| `CLOUDINARY_CLOUD_NAME` | Server media cloud name | Signed uploads | `ddk6xbfxd` | Cloudinary health | Upload disabled if missing | No |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Signed uploads | Numeric key | Upload smoke | No | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Signed uploads | Provider secret | Upload smoke | No | No |
| `CLOUDINARY_URL` | Combined Cloudinary config | Server Cloudinary config | `cloudinary://key:secret@cloud` | Upload smoke | Alternative to split keys | No |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public payment key | Checkout | `rzp_live_...` | Live payment smoke | Owner-scoped settings may replace | Yes if payments global |
| `RAZORPAY_KEY_ID` | Server payment key id | Payment order/verify/refund | `rzp_live_...` | Payment order smoke | Owner-scoped settings may replace | Yes if payments global |
| `RAZORPAY_KEY_SECRET` | Server payment secret | Payment order/verify/refund | Provider secret | Live payment smoke | No | Yes if payments global |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | Razorpay webhook route | Provider webhook secret | Webhook signature test | No | Yes if webhooks enabled |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser Sentry DSN | Client monitoring | Sentry DSN | Client test event | First-party monitoring remains | No |
| `SENTRY_DSN` | Server Sentry DSN | Server monitoring | Sentry DSN | Server test event | First-party monitoring remains | No |

### Optional

| Name | Purpose | Where used | Example value | How to verify | Safe default? | Blocking? |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SHORT_LINK_ORIGIN` | Branded short-link origin | Smart campaign links | `https://fg.menu` | Campaign link smoke | Falls back to app URL | No |
| `NEXT_PUBLIC_APP_NAME` | Public app display name | Branding/metadata | `Nammude` | Browser title/metadata | Built-in default | No |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics id | Analytics | `G-...` | Analytics debug view | Analytics limited | No |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stack auth project | Optional Stack auth path | Provider id | Stack login smoke | Firebase auth remains | No |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stack public key | Optional Stack auth path | Provider key | Stack login smoke | Firebase auth remains | No |
| `NEXT_PUBLIC_STACK_BASE_URL` | Stack base URL override | Optional Stack auth path | `https://...` | Stack login smoke | Provider default | No |
| `STACK_SECRET_SERVER_KEY` | Stack server key | Optional Stack auth path | Provider secret | Stack server auth smoke | Firebase auth remains | No |
| `UPI_MERCHANT_ID` | UPI payment metadata | Payment display/provider config | Merchant id | UPI smoke | UPI hidden/disabled | No |
| `UPI_MERCHANT_VPA` | UPI VPA | Payment display/provider config | `merchant@bank` | UPI smoke | UPI hidden/disabled | No |
| `WHATSAPP_CLOUD_API_TOKEN` | WhatsApp Cloud API token | Automated WhatsApp send | Meta access token | Meta send test | Manual share still works | No |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sender number id | Automated WhatsApp send/webhook | Meta phone id | Meta send test | Manual share still works | No |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook verification | Webhook verification route | Random token | Meta webhook verify | Webhook disabled | No |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_DIAGNOSTICS` | Controlled performance diagnostics | Client diagnostics | `true` during profiling | Browser console/report | Can be false | No |
| `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS` | Quality diagnostics | Plugin/diagnostic paths | `false` | Env validator | Should stay false | No |
| `NEXT_PUBLIC_ENABLE_PLUGIN_RUNTIME_DASHBOARD` | Developer plugin dashboard | Plugin diagnostics | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_ENABLE_PLUGIN_PROFILER` | Plugin profiler | Plugin diagnostics | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD` | Controlled health dashboard | Admin diagnostics | `false` | Env validator | Should stay false | No |
| `NEXT_PUBLIC_ENABLE_DEVELOPER_CLOCK_WIDGET` | Example widget flag | Plugin examples | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_ENABLE_DEVELOPER_NOTES_WIDGET` | Example widget flag | Plugin examples | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_ENABLE_SYSTEM_INFORMATION_WIDGET` | Example widget flag | Plugin examples | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_ENABLE_THEME_PREVIEW_WIDGET` | Example widget flag | Plugin examples | `false` | Env validator | Must stay false | Yes if true |
| `NEXT_PUBLIC_FIREBASE_USE_EMULATORS` | Emulator control | Firebase client | `false` | Env validator | Defaults false | Yes if true |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | Development login switch | Auth UI | `false` | Env validator | Defaults false | Yes if true |
| `NEXT_PUBLIC_ENABLE_TEST_LOGIN` | Test login switch | Auth UI | `false` | Env validator | Defaults false | Yes if true |
| `NEXT_PUBLIC_BUILD_COMMIT` / `NEXT_PUBLIC_GIT_COMMIT_SHA` / `NEXT_PUBLIC_COMMIT_SHA` | Release commit metadata | Build/release info | Final SHA | `/api/release-info` | Hostinger may provide SHA | No |
| `NEXT_PUBLIC_BUILD_DATE` / `NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP` / `BUILD_DATE` | Build timestamp | Build/release info | ISO timestamp | `/api/release-info` | Generated/unknown | No |
| `HOSTINGER_GIT_COMMIT_SHA` / `GIT_COMMIT_SHA` | Host build SHA | Build/release info | Final SHA | `/api/release-info` | Hostinger may provide | No |

## Firebase Checklist

1. Open Firebase Console for the production project.
2. Verify project id matches `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `FIREBASE_ADMIN_PROJECT_ID`.
3. Verify Firestore is in production mode and the correct region/project.
4. Deploy/check `firestore.rules`; run `npm run firebase:deploy:rules` only from an approved admin machine.
5. Deploy/check `firestore.indexes.json`; run `npm run firebase:deploy:indexes` if indexes are missing.
6. Confirm required composite indexes are built and not stuck in building/failed state.
7. Verify Storage bucket matches `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.
8. Deploy/check `storage.rules`.
9. Upload and display one restaurant/menu image.
10. Verify Authentication providers used in production are enabled.
11. Add authorized domains: final Hostinger domain, any custom domain, and branded short-link domain if needed.
12. Verify Admin SDK service account exists and has least required roles.
13. Create/rotate service account key only in Firebase Console; do not commit it.
14. Paste `FIREBASE_ADMIN_PRIVATE_KEY` with escaped newlines in Hostinger.
15. Verify Cloud Messaging is enabled.
16. Copy Web Push certificate public key into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
17. Test foreground and background push on Chrome Android and desktop Chrome.
18. Run `/health/ready` and confirm Firebase/Firestore/Storage statuses.
19. Run `npm run firebase:validate:production-data` from an approved environment with production credentials.

## Payment Checklist

1. Open Razorpay production dashboard.
2. Use only `rzp_live_` keys in production.
3. Configure owner-scoped payment settings or global fallback keys, not sample keys.
4. Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` matches `RAZORPAY_KEY_ID` if global fallback is used.
5. Configure `RAZORPAY_KEY_SECRET` in Hostinger only.
6. Configure webhook endpoint: `https://<domain>/api/payments/razorpay/webhook`.
7. Configure `RAZORPAY_WEBHOOK_SECRET`.
8. Enable payment captured/failed/refund events required by operations.
9. Verify return/callback URLs point to the production domain.
10. Make a low-value live payment.
11. Confirm duplicate payment protection by refreshing/retrying payment verify.
12. Confirm timeout behavior by monitoring failed/slow provider calls.
13. Issue a test refund and confirm app plus Razorpay dashboard status.
14. Verify webhook signature failures are rejected.
15. Reconcile order id, payment id, settlement, refund, and reports.

## WhatsApp Checklist

WhatsApp Cloud API is optional unless automated outbound WhatsApp messages are enabled. Manual WhatsApp share links can work without Cloud API credentials.

1. Open Meta Developer Console.
2. Select the production Meta App.
3. Verify WhatsApp product is added.
4. Verify production phone number id and display number.
5. Set `WHATSAPP_PHONE_NUMBER_ID`.
6. Generate and secure `WHATSAPP_CLOUD_API_TOKEN`.
7. Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
8. Configure webhook URL: `https://<domain>/api/whatsapp/webhook`.
9. Subscribe webhook fields required by message status flows.
10. Create/approve production message templates.
11. Verify app permissions and business verification status.
12. Send a template message to an opted-in test number.
13. Verify webhook receive/delivery status.
14. Verify token expiry/rotation calendar.

## SMTP Checklist

1. Choose production SMTP provider.
2. Configure `SMTP_HOST`.
3. Configure `SMTP_PORT`.
4. Configure `SMTP_SECURE`; use `true` for port 465, usually `false` for 587 with STARTTLS.
5. Configure `SMTP_USER`.
6. Configure `SMTP_PASS`; Gmail must use a 16-character app password without spaces.
7. Configure `SMTP_FROM`.
8. Configure `DATABASE_ALERT_EMAIL`.
9. Send customer/owner OTP email.
10. Verify From, SPF, DKIM, DMARC, spam placement, and bounce behavior.
11. Check `/health/ready` SMTP status.
12. Rotate credentials after staff/provider changes.

## Monitoring Checklist

1. Verify structured server logs are visible in Hostinger logs.
2. Verify `/health/live`, `/health/ready`, and `/health/startup`.
3. Configure uptime monitor for `/health/ready`.
4. Configure alert recipients for downtime and database/provider errors.
5. Configure Sentry DSNs if external error monitoring is required.
6. Verify client analytics ids if GA/Firebase Analytics is required.
7. Verify payment errors, auth failures, webhook failures, and Firestore errors are visible.
8. Set alert thresholds for 5xx rate, latency, memory restarts, failed payments, failed notifications, and Firestore permission errors.
9. Keep logs free of secrets and full payment credentials.

## Production UAT Checklist

| Area | Checks |
| --- | --- |
| Customer | Home, restaurant discovery, category/item pages, profile, support |
| Restaurant | Restaurant detail, banners, menu item visibility, offers |
| Menu | Search, filters, item details, unavailable items, images |
| Cart | Add/remove/update quantities, persistence, session reset |
| Checkout | Address/table/customer details, validation, order creation |
| Payment | Razorpay success/failure/retry/refund/duplicate verify |
| QR Ordering | Scan QR, start session, idle timeout, table request, order submit |
| Pickup | Parcel/takeaway order flow and ready status |
| Delivery | Delivery order flow, status, tracking |
| Order Tracking | Live customer order page and notifications |
| Kitchen | KOT, status transitions, ready signal, history |
| Waiter | Pickup, serve, payment restrictions, notifications |
| Owner | Dashboard, orders, settings, reports, customers |
| POS | New bill, hold, kitchen ticket, payment, print paths |
| Reports | Revenue, GST, tips, refunds, export CSV |
| Marketing | Campaign build/history/analytics, smart links, poster/QR |
| WhatsApp | Manual share and Cloud API if enabled |
| Notifications | Browser push, email, in-app toasts, sound settings |
| Settings | Payment, operational, QR, communication, diagnostics |
| Analytics | Dashboard metrics, campaign metrics, provider monitoring |
| Authentication | Customer, owner, admin login/logout/OTP/OAuth if enabled |
| Role Switching | Owner/waiter/cashier/kitchen/admin permissions |
| Session Reset | Logout, auth bridge, cart reset, QR session reset |
| Stress Testing | Large menus, large carts/orders, concurrent kitchen/POS updates |

## Browser Checklist

| Browser | Desktop | Mobile | Required checks |
| --- | --- | --- | --- |
| Chrome | Yes | Android | Full UAT, push, Lighthouse, DevTools profile |
| Safari | macOS if available | iPhone/iPad | Layout, forms, PWA/offline, payment redirect |
| Firefox | Yes | Optional Android | Layout, auth, order flows |
| Edge | Windows | Optional | Admin/owner dashboards, reports, printing |

## Device Checklist

| Device | Viewports | Checks |
| --- | --- | --- |
| Desktop | 1440px+ | Admin/owner/POS/kitchen/reports tables |
| Laptop | 1280px-1440px | Dashboard, dialogs, drawer, filters |
| Tablet | iPad/Android tablet portrait and landscape | POS, QR ordering, kitchen, responsive tables |
| Android phone | 360px-430px | Customer flow, QR, checkout, push |
| iPhone | 375px-430px | Safari customer flow, payment redirect, PWA/offline |

## Security Checklist

1. HTTPS active with valid certificate and no mixed content.
2. HSTS/security headers visible.
3. Cookies are HttpOnly/SameSite/Secure where applicable.
4. JWT/session expiry and logout verified.
5. Firestore rules deny cross-tenant and unauthorized reads/writes.
6. Storage rules deny unauthorized writes.
7. Owner/waiter/cashier/kitchen/admin roles cannot access other role actions.
8. Tenant isolation verified across two restaurants.
9. Razorpay webhook signatures enforced.
10. Secrets are only in Hostinger/provider dashboards, not committed.
11. Dev/test login and plugin dashboards disabled.
12. Admin and owner passwords/OTP flows verified.

## Performance Checklist

1. Run Chrome DevTools performance profile on customer home, restaurant page, owner dashboard, POS, kitchen, reports.
2. Run Lighthouse mobile and desktop.
3. Verify LCP, CLS, INP, TBT, image loading, and cache behavior.
4. Record memory before/after 30 minutes of kitchen/POS usage.
5. Record CPU during large order and live order streams.
6. Test offline/online recovery.
7. Test Slow 3G for customer home, restaurant page, checkout.
8. Test large menu and large cart.
9. Test concurrent users across owner, kitchen, waiter, customer.
10. Watch Hostinger memory/restart metrics during stress testing.

## Rollback Checklist

1. Keep the last known-good commit SHA available.
2. Keep a copy of current Hostinger env values before changes.
3. Before deploy, export Firebase rules/indexes and note provider dashboard versions.
4. If deploy fails, switch Hostinger branch/SHA back to last known-good commit.
5. Clear cache and restart app.
6. Verify `/health/live`, `/health/ready`, `/api/release-info`.
7. If env breaks production, restore previous Hostinger env snapshot and restart.
8. If Firebase data/rules break flows, redeploy previous rules/indexes.
9. If payment/WhatsApp/SMTP fails, disable affected provider in settings or restore previous provider credentials.
10. Record incident timeline, root cause, and permanent correction.

## Estimated Time Required

| Workstream | Estimate |
| --- | ---: |
| Hostinger deploy/config/cache/restart | 30-60 minutes |
| Env/provider dashboard setup | 2-4 hours |
| Firebase rules/indexes/auth/storage/VAPID | 1-2 hours |
| Payment live verification/refund/settlement | 1-2 hours |
| SMTP/WhatsApp/monitoring setup | 1-3 hours |
| Manual UAT across roles | 4-8 hours |
| Browser/device/performance/security pass | 4-8 hours |
| Rollback drill and final signoff | 1-2 hours |

## GO / NO-GO

Repository: GO.

Production launch: NO-GO until Hostinger deployment, production env, Firebase, payment, provider, monitoring, browser/device, performance, security, and UAT checklists are manually completed and signed off.

The repository is complete. No further code changes are required. The project has officially entered the Production Operations and UAT phase.
