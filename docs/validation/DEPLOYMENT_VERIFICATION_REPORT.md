# Deployment Verification Report

Phase 4C status: repository implementation and local validation pass; this hosted report predates the Phase 4C commit. Redeploy, clear cache, then verify the exact SHA, `vapidConfigured=true`, service-worker v15, registered-device push, and owner Razorpay sandbox/dashboard evidence before production signoff.

Generated: 2026-07-16T04:57:07.245Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 17 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| http:release-info | PASS | https://violet-squid-380447.hostingersite.com/api/release-info -> HTTP 200 |
| release:version | PASS | expected v1.0.0-rc5 |
| release:sha | PASS | hosted runtime includes Active Orders baseline ba8e957d57b949a94d0c42a3b170cf198917c0d8; use `/api/release-info` for exact hosted SHA |
| release:branch | PASS | expected release/production-nammude |
| release:environment | PASS | production |
| release:timestamp | PASS | deployment timestamp present |
| release:runtime | PASS | runtime v22.18.0 |
| release:plugin-flags | PASS | runtime dashboard/profiler disabled |
| http:health-live | PASS | https://violet-squid-380447.hostingersite.com/health/live -> HTTP 200 |
| health:live-status | PASS | status ok |
| http:health-ready | PASS | https://violet-squid-380447.hostingersite.com/health/ready -> HTTP 200 |
| health:ready-http | PASS | HTTP 200 |
| firebase:firestore | PASS | connected |
| firebase:admin | PASS | Firebase Admin configured |
| env:consistency | PASS | release-info and health environment match |
| http:health-startup | PASS | https://violet-squid-380447.hostingersite.com/health/startup -> HTTP 200 |
| health:startup | PASS | HTTP 200 |
