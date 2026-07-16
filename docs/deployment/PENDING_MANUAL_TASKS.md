# Pending Manual Tasks

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-16

| Status | Area | Task | Evidence / Exit Criteria |
| --- | --- | --- | --- |
| 🔴 Blocking | Environment | Deploy Phase 4C; set public VAPID, stable payment encryption key, QR secret, database alert email, and final provider values. Owner Razorpay secrets belong in Owner Settings, not public/global env. | `npm run validate:prod-env` passes in production-equivalent env and health/provider probes have no launch blockers. |
| 🟡 Pending Manual | Push | Register owner/customer devices; verify FCM foreground/background, actions, deep links, refresh/delete, Chrome/Edge/Firefox/Android and supported Safari/iPhone PWA behavior. | Test Center and Firebase delivery evidence pass without duplicates. Customer Order Confirmation/Rejection remain workflow-manual. |
| 🟡 Pending Manual | Owner Razorpay | Complete owner sandbox checkout, signature, capture, refund, failed/cancel/timeout, dashboard webhook, live key rotation, settlement, and two-owner isolation smoke. | Payment Verification Center plus Razorpay dashboard evidence pass; no cross-tenant key usage. |
| 🟡 Pending Manual | Hosted runtime smoke | Run authenticated Owner Active Orders, customer, POS, Kitchen, QR/table, and admin smoke on hosted RC5 runtime. | No P0/P1 browser console, workflow, duplicate notification/KOT/order, or responsive issue. |
| 🟡 Pending Manual | Lighthouse | Run hosted mobile and desktop Lighthouse/Core Web Vitals. | Scores and warnings added to release notes/certification. |
| 🟡 Pending Manual | Browser QA | Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop. | Hydration, responsive, dark mode, print, clipboard, QR, camera, upload, offline, notifications pass. |
| 🟡 Pending Manual | Authenticated flows | Customer, owner, admin, POS, Kitchen, QR/table ordering. | No role leak, redirect bug, console error, or realtime regression. |
| 🟡 Pending Manual | Providers | WhatsApp/SMS, SMTP, Cloudinary, Google OAuth, Mapbox, and remaining push/Razorpay dashboard checks. | Provider dashboard/API smoke passes with real credentials. |
| 🟡 Pending Manual | Firebase Console | Rules, indexes, authorized domains, VAPID, protected reads/writes. | Console state verified and protected smoke passes. |
| 🟡 Pending Manual | Hardware | 58mm/80mm/A4 print, KOT, receipts, reprint, QR scan/camera/upload. | Target restaurant devices pass. |
