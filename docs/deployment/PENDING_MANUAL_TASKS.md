# Pending Manual Tasks

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-13

| Status | Area | Task | Evidence / Exit Criteria |
| --- | --- | --- | --- |
| 🔴 Blocking | Hostinger | Set `NEXT_PUBLIC_APP_ENV=production`, redeploy/restart, clear cache. | `/api/release-info` and `/health/ready` report `deploymentEnvironment: production`. |
| 🔴 Blocking | Environment | Configure real Firebase Admin/VAPID, QR secret, database alert email, Razorpay live keys/webhook, HTTPS app URL. | `npm run validate:prod-env` passes in production-equivalent env. |
| 🟡 Pending Manual | Lighthouse | Run hosted mobile and desktop Lighthouse/Core Web Vitals. | Scores and warnings added to release notes/certification. |
| 🟡 Pending Manual | Browser QA | Chrome, Edge, Firefox, Safari, Android Chrome, iPhone Safari, tablet, Kitchen TV, desktop. | Hydration, responsive, dark mode, print, clipboard, QR, camera, upload, offline, notifications pass. |
| 🟡 Pending Manual | Authenticated flows | Customer, owner, admin, POS, Kitchen, QR/table ordering. | No role leak, redirect bug, console error, or realtime regression. |
| 🟡 Pending Manual | Providers | Razorpay, WhatsApp/SMS/push, SMTP, Cloudinary, Google OAuth, Mapbox. | Provider dashboard/API smoke passes with real credentials. |
| 🟡 Pending Manual | Firebase Console | Rules, indexes, authorized domains, VAPID, protected reads/writes. | Console state verified and protected smoke passes. |
| 🟡 Pending Manual | Hardware | 58mm/80mm/A4 print, KOT, receipts, reprint, QR scan/camera/upload. | Target restaurant devices pass. |
