# Provider Verification Report

Generated: 2026-07-10T07:09:24.118Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 6 |
| WARNING | 0 |
| ERROR | 4 |
| FAIL | 0 |
| MANUAL | 1 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| provider:Firebase | ERROR | local env missing/placeholder: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY |
| provider:Firestore | ERROR | local env missing/placeholder: FIREBASE_ADMIN_PROJECT_ID |
| provider:Authentication | PASS | configured |
| provider:Storage | PASS | configured |
| provider:Cloudinary | PASS | configured |
| provider:SMTP | PASS | configured |
| provider:Google OAuth | PASS | configured |
| provider:Mapbox | PASS | configured |
| provider:Razorpay | ERROR | local env missing/placeholder: NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET |
| provider:WhatsApp | ERROR | local env missing/placeholder: WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WEBHOOK_VERIFY_TOKEN |
| provider:live-checks | MANUAL | Set PROVIDER_LIVE=1 and run provider dashboard/API smoke with real credentials. |
