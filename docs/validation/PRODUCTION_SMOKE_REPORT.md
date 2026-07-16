# Production Smoke Report

Generated: 2026-07-10T15:16:12.607Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 7 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 18 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| route:/ | PASS | HTTP 200 |
| route:/restaurants | PASS | HTTP 200 |
| route:/offers | PASS | HTTP 200 |
| route:/api/release-info | PASS | HTTP 200 |
| route:/health/live | PASS | HTTP 200 |
| route:/health/ready | PASS | HTTP 200 |
| route:/api/public/restaurants | PASS | HTTP 200 |
| manual:Customer authentication | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Owner authentication | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Kitchen flow | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:POS billing | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Admin | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:QR ordering | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Table ordering | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Checkout | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Razorpay | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Offers | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Coupons | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Notifications | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Print | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Realtime updates | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Role switching | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Offline recovery | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Error boundaries | MANUAL | Requires authenticated browser/provider/hardware validation. |
| manual:Accessibility | MANUAL | Requires authenticated browser/provider/hardware validation. |

## POS Draft Autosave P0 Local Browser QA

| Check | Status | Evidence |
| --- | --- | --- |
| Authorization | PASS | Owner, waiter view, and cashier view POS GET returned `200`; invalid writes reached `400` validation instead of `403 pos:update`. |
| Rapid item edits | PASS | Three immediate adds produced quantity `3`, one latest recovery record, and one visible failure notification. |
| Provider failure | PASS | Simulated `503` retained cart state and classified the failure as database/provider unavailable. |
| Offline/online | PASS | Quantity `2` remained in cart and recovery storage while offline; reconnect retried automatically and cleared recovery. |
| Refresh recovery | PASS | Pending draft line restored from scoped recovery and New Order reopened after reload. |
| Clear/Hold recovery | PASS | Clear and Hold now stage an empty local recovery snapshot before retrying the server draft deletion; failed deletes cannot silently leave an untracked stale draft. |
| Notification dedupe | PASS | One stable notification with Retry and Dismiss remained visible across repeated failures. |
| Storage targets | PASS | localStorage and IndexedDB metadata saved the latest draft; sessionStorage remains payment-only; no direct Firestore offline write bypasses repository behavior. |
| Hosted/operator devices | MANUAL | Deploy and verify owner/waiter/cashier, restaurant switch, close/reopen, real Firestore interruption, and multi-device behavior. |
