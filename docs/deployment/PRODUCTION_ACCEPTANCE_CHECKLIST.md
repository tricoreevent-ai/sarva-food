# Production Acceptance Checklist

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-13

## Acceptance Decision

Current decision: `NO GO`.

Production readiness score: `86%`.

## Required Pass Gates

| Gate | Status | Required Evidence |
| --- | --- | --- |
| Release metadata | 🔴 Blocking | `/api/release-info` shows final SHA, branch, `v1.0.0-rc5`, HTTPS URL, `deploymentEnvironment: production`. |
| Production env validation | 🔴 Blocking | `npm run validate:prod-env` passes with real production values. |
| Health endpoints | ✅ Completed | `/health/live`, `/health/ready`, `/health/startup` return healthy/safe metadata after final redeploy. |
| Build pipeline | ✅ Completed | Typecheck, lint, build, analyze pass. |
| Bundle/performance | 🟡 Pending Manual | Lighthouse mobile/desktop and Chrome Performance/Coverage/Memory captured after final redeploy. |
| Security | 🟡 Pending Manual | HTTPS/HSTS/CSP/cookies/auth redirects/role guards verified in browser. |
| Browser compatibility | 🟡 Pending Manual | Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop pass. |
| API/customer/owner/admin flows | 🟡 Pending Manual | Authenticated smoke passes with no P0/P1 issue. |
| Firestore | 🟡 Pending Manual | Rules/indexes deployed and protected read/write smoke passes. |
| Providers | 🟡 Pending Manual | Firebase, Cloudinary, SMTP, OAuth, Razorpay, WhatsApp/SMS/push validated. |
| Hardware | 🟡 Pending Manual | Printer, QR, camera/upload checks pass on target devices. |
| Rollback | 🟡 Pending Manual | Previous known-good SHA/env rollback verified or documented in Hostinger. |

## Hostinger Release Verification

| Endpoint | Status | Current Result | Required Result |
| --- | --- | --- | --- |
| `/api/release-info` | FAIL | Hosted SHA is still `dcff59e050de1dace19460198cb2909372bce7d5`, Node `v22.18.0`, but `applicationVersion=v1.0.0-rc4` and `deploymentEnvironment=development`. | Deploy `fc0986e9ba5dedb302dedcdd5eb9e20346844dba`, report `applicationVersion=v1.0.0-rc5`, `deploymentEnvironment=production`, and Node 22. |
| `/health/live` | PASS | Endpoint returns `ok` with safe public metadata. | Endpoint returns `ok` after final RC5 redeploy. |
| `/health/ready` | PASS | Endpoint returns `ok`; Firestore connected, Storage/SMTP/Cloudinary configured, Firebase Admin/Public configured, VAPID missing, Razorpay owner-scoped or missing. | Endpoint returns `ok`; provider gaps are either configured or explicitly accepted for production scope. |
| `/health/startup` | PASS | Endpoint returns `ok`; Firestore connected, Storage/SMTP/Cloudinary configured, Firebase Admin/Public configured, VAPID missing, Razorpay owner-scoped or missing. | Endpoint returns `ok` after final RC5 redeploy/restart. |

## Production Configuration Status

| Item | Status | Current Evidence | Required Action |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | FAIL | Hosted metadata reports `development`. | Set `production` in Hostinger and redeploy/restart. |
| `NEXT_PUBLIC_APP_VERSION` | FAIL | Hosted metadata reports `v1.0.0-rc4`. | Set `v1.0.0-rc5` in Hostinger and redeploy/restart. |
| `NEXT_PUBLIC_APP_URL` | PASS | Hosted metadata reports `https://violet-squid-380447.hostingersite.com`. | Replace only if final custom HTTPS domain is used. |
| Firebase Admin | PASS | Health endpoints report Admin configured. | Keep service account values in Hostinger only. |
| Firebase Client | PASS | Health endpoints report public Firebase configured. | Confirm Firebase authorized domains before launch. |
| Firebase VAPID | FAIL | Health endpoints report `vapidConfigured=false`. | Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. |
| SMTP | PASS | Health endpoints report SMTP configured. | Run OTP/order/outage mail smoke. |
| Cloudinary | PASS | Health endpoints report public and server credentials configured. | Run signature/upload/transform smoke. |
| Google OAuth | MANUAL | Repository and docs are configured for public/server client IDs. | Run hosted sign-in and redirect-domain smoke. |
| Mapbox | MANUAL | Repository and docs require `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. | Verify map/address surfaces on hosted app. |
| Razorpay | MANUAL | Health endpoints report owner-scoped or missing global keys/webhook. | Verify live/sandbox order, checkout, verify, webhook, failure, refund. |
| `TABLE_QR_SECRET` | MANUAL | Required by environment matrix; not exposed by public health metadata. | Confirm production secret is set and QR smoke passes. |
| `DATABASE_ALERT_EMAIL` | MANUAL | Required by environment matrix; not exposed by public health metadata. | Confirm outage recipient is set and alert path is tested. |

## Production Smoke Matrix

| Workflow | Status | Expected Result | Verification Method | Pass Criteria |
| --- | --- | --- | --- | --- |
| Customer | MANUAL | Browse menu, session state, restaurant data, profile state load correctly. | Hosted browser smoke with real/customer test account. | No console P0/P1 errors; customer can reach checkout. |
| Restaurant | MANUAL | Restaurant landing/menu surfaces load production data. | Hosted browser smoke. | Correct restaurant, menu, availability, and media render. |
| Cart | MANUAL | Add/remove/update items persist without duplicate entries. | Hosted browser smoke. | Totals, item count, and modifiers stay consistent. |
| Checkout | MANUAL | Checkout validates address/table/payment path and creates one order. | Hosted browser smoke. | Exactly one order and one audit timeline are created. |
| Payments | MANUAL | Razorpay/UPI/payment state completes or fails gracefully. | Provider-backed payment smoke. | Order payment status and receipt state match provider result. |
| Owner | MANUAL | Owner dashboard and active order actions work with real roles. | Authenticated owner smoke. | Orders update once, no duplicate navigation/notifications. |
| Kitchen | MANUAL | Kitchen receives KOT and status transitions correctly. | Multi-device kitchen smoke. | One KOT per intended print/update; status timeline correct. |
| POS | MANUAL | POS cart, bill print, payment collection, completion work. | POS station smoke. | Print/payment/order completion history is correct. |
| Admin | MANUAL | Admin guarded pages and operational controls work with real roles. | Authenticated admin smoke. | Role guards hold; no unauthorized access. |
| QR Ordering | MANUAL | Signed QR/table flow routes to the correct restaurant/table. | Physical QR/mobile smoke. | Table context, order type, and KOT are correct. |
| Notifications | MANUAL | Email/push/owner/kitchen notifications send once. | Provider and multi-device smoke. | No duplicate notifications; failure paths show graceful state. |
| Printing | MANUAL | KOT, bill, reprint, 58mm/80mm/A4 output are correct. | Hardware print smoke. | Correct format, no duplicate KOT/bill, print history recorded. |
| Reports | MANUAL | Reports load production data without blocking operations. | Owner/admin report smoke. | Data matches orders/payments; export paths behave as expected. |
| Inventory | MANUAL | Inventory updates reflect order/payment lifecycle where applicable. | Owner/admin inventory smoke. | Stock adjustments and audit history are correct. |

## Device Matrix

| Device | Expected Result | Verification Method | Pass Criteria |
| --- | --- | --- | --- |
| Desktop | Owner/admin/POS/customer flows render and respond correctly. | Chrome/Edge/Firefox hosted smoke. | No layout breakage, blocked action, or P0/P1 console error. |
| Tablet | Owner/kitchen/POS surfaces remain touch friendly. | Tablet browser smoke. | Key actions fit viewport and touch targets are usable. |
| Android | Customer/QR/checkout flows work in Chrome. | Android Chrome hosted smoke. | QR/session/cart/checkout complete without layout or auth issue. |
| iPhone | Customer/QR/checkout flows work in Safari. | iPhone Safari hosted smoke. | Login/session/cart/checkout and media upload work. |
| Kitchen TV | Kitchen board is readable and updates in realtime. | Target display smoke. | Status columns fit and realtime updates arrive once. |
| 58mm Printer | KOT/bill print uses correct narrow format. | Hardware print smoke. | Text is readable, totals correct, no duplicate print. |
| 80mm Printer | KOT/bill print uses correct receipt format. | Hardware print smoke. | Text is readable, totals correct, no duplicate print. |
| A4 Printer | Reports/bills print legibly on A4. | Browser print preview and physical print. | Pagination, totals, and headers are correct. |
| QR Scanner | Scanner opens the signed table/restaurant URL. | Physical scanner/mobile camera smoke. | Correct restaurant/table/order mode opens. |
| Camera Upload | Image upload/capture paths work on mobile. | Camera/upload smoke with Cloudinary. | Image uploads, transforms, and displays from production CDN. |

## Provider Matrix

| Provider | Repository Status | Production Status | Manual Verification |
| --- | --- | --- | --- |
| Firebase | PASS | PASS | Confirm production project, authorized domains, Auth providers, and emulator flags. |
| Firestore | PASS | PASS | Deploy rules/indexes and run protected role read/write smoke. |
| Storage | PASS | PASS | Confirm Storage rules and run upload/read smoke. |
| SMTP | PASS | PASS | Send OTP, owner credentials, order mail, and outage alert. |
| Cloudinary | PASS | PASS | Verify signature, upload, transform, and hosted delivery. |
| Google OAuth | PASS | MANUAL | Run hosted sign-in and redirect-domain smoke. |
| Mapbox | PASS | MANUAL | Verify map load, autocomplete, profile, and address surfaces. |
| Razorpay | PASS | MANUAL | Verify order, checkout, payment verify, webhook, failure, and refund. |
| Push | PASS | FAIL | Set VAPID key, then test foreground/background/click/unsubscribe. |
| WhatsApp | PASS | MANUAL | Verify token, phone id, webhook verification, template, and send path. |
| SMS | PASS | MANUAL | Confirm provider selection and transactional compliance before launch. |
| Webhook | PASS | MANUAL | Verify Razorpay/WhatsApp webhook URLs, signatures, retries, and logs. |

## Sign-off Rule

Mark production accepted only after every 🔴 item is resolved and every 🟡 item has a dated manual result. Repository-only evidence is sufficient for RC5 deployment testing, not for public production launch.
