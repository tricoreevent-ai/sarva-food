# Provider Verification Report

Generated: 2026-08-10T09:48:38.868Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 8 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 3 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| provider:Firebase | PASS | hosted public/admin Firebase configured |
| provider:Firestore | PASS | hosted Firestore status: connected |
| provider:Authentication | PASS | hosted Firebase public auth config present |
| provider:Storage | PASS | hosted storage status: configured |
| provider:Cloudinary | PASS | hosted Cloudinary status: configured |
| provider:SMTP | PASS | hosted SMTP status: configured |
| provider:Google OAuth | PASS | configured |
| provider:Mapbox | PASS | configured |
| provider:Razorpay | MANUAL | hosted status owner_scoped_or_missing; verify owner-scoped settings and dashboard/webhook before enabling live payments |
| provider:WhatsApp | MANUAL | requires Meta/WhatsApp dashboard env verification before Cloud API launch |
| provider:live-checks | MANUAL | Set PROVIDER_LIVE=1 and run provider dashboard/API smoke with real credentials. |
