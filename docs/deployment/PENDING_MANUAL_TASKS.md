# Pending Manual Tasks

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-20

Repository simulations now cover draft interruption/quota/permission/conflict classification, restaurant/operator isolation, reconnect/focus/visibility recovery, operational role contracts, notification/service-worker lifecycle behavior, Active Orders lifecycle/action contracts, payment independence, POS New Order cancel resume, Kitchen item-first cards, Kitchen notify/recall/reminder contracts, and print-context guards. The items below remain manual because they require production credentials, provider consoles, real browsers/devices, or physical hardware.

| Status | Area | Task | Evidence / Exit Criteria |
| --- | --- | --- | --- |
| 🔴 Blocking | Environment | Deploy Phase 5C; verify public VAPID, stable payment encryption key, QR secret, database alert email, and final provider values. Owner Razorpay secrets belong in Owner Settings, not public/global env. | `npm run validate:prod-env` passes in production-equivalent env and health/provider probes have no launch blockers. |
| 🟡 Pending Manual | Push | Register owner/customer devices; verify FCM foreground/background, actions, deep links, refresh/delete, Chrome/Edge/Firefox/Android and supported Safari/iPhone PWA behavior. | Test Center and Firebase delivery evidence pass without duplicates. Customer Order Confirmation/Rejection remain workflow-manual. |
| 🟡 Pending Manual | Owner Razorpay | Complete owner sandbox checkout, signature, capture, refund, failed/cancel/timeout, dashboard webhook, live key rotation, settlement, and two-owner isolation smoke. | Payment Verification Center plus Razorpay dashboard evidence pass; no cross-tenant key usage. |
| 🟡 Pending Manual | Hosted runtime smoke | Run authenticated Owner Active Orders, customer, POS, Kitchen, QR/table, and admin smoke on hosted RC5 runtime. | No P0/P1 browser console, workflow, duplicate notification/KOT/order, or responsive issue. |
| 🟡 Pending Manual | Active Orders multi-role QA | Verify Owner, Manager, Waiter, Cashier, and Kitchen flows for payment before/during/after Kitchen preparation, Serve, Complete, Preview, Print, Reminder, Transfer, Split, Merge, Timeline, History, Kitchen Recall, and Assign Waiter. | Hosted runtime matches repository lifecycle and no action is dead or duplicated. |
| 🟡 Pending Manual | Lighthouse | Run hosted mobile and desktop Lighthouse/Core Web Vitals. | Scores and warnings added to release notes/certification. |
| 🟡 Pending Manual | Browser QA | Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop. | Hydration, responsive, dark mode, print, clipboard, QR, camera, upload, offline, notifications pass. |
| 🟡 Pending Manual | Authenticated flows | Customer, owner, admin, POS, Kitchen, QR/table ordering. | No role leak, redirect bug, console error, or realtime regression. |
| 🟡 Pending Manual | Providers | WhatsApp/SMS, SMTP, Cloudinary, Google OAuth, Mapbox, and remaining push/Razorpay dashboard checks. | Provider dashboard/API smoke passes with real credentials. |
| 🟡 Pending Manual | Firebase Console | Rules, indexes, authorized domains, VAPID, protected reads/writes. | Console state verified and protected smoke passes. |
| 🟡 Pending Manual | Hardware | 58mm/80mm/A4 print, KOT, receipts, reprint, QR scan/camera/upload. | Target restaurant devices pass. |
