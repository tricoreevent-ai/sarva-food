# Notification Troubleshooting Guide

| Symptom | Check | Resolution |
| --- | --- | --- |
| VAPID missing | `/health/ready`, Hostinger env | Set the public Web Push certificate key and redeploy. |
| Permission denied | Owner Notification Test Center | Reset site notification permission in browser settings. |
| Service worker not controlled | Test Center, browser Application panel | Reload after registration; clear stale Sarva caches if needed. |
| Token not registered | Register Device | Confirm HTTPS, Firebase config, sender id, and browser support. |
| Foreground works, background fails | Background test, service-worker console | Verify `/sw.js`, active scope `/`, and OS notification permission. |
| FCM reports no tokens | Device count | Register an owner device for the current restaurant. |
| Notification remains pending | Push status and server logs | Trigger the next dispatch; bounded retry stops after three attempts. |
| Deep link opens root | Payload link | Use a same-origin path beginning with `/`. |
| Duplicate display | Browser/service-worker console | Clear old service workers and verify only `/sw.js` controls the origin. |
| Safari unsupported | Browser Support status | Install the site as a supported PWA or use foreground/in-app notifications. |

Never paste Firebase Admin credentials, private VAPID material, or FCM registration tokens into support tickets or logs.
