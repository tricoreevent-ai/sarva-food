# Deployment Verification Report

Generated: 2026-07-13T06:11:59.937Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 14 |
| WARNING | 1 |
| ERROR | 2 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| http:release-info | PASS | https://violet-squid-380447.hostingersite.com/api/release-info -> HTTP 200 |
| release:version | ERROR | expected v1.0.0-rc5, saw v1.0.0-rc4 |
| release:sha | WARNING | hosted currently serves b8c1ed6a7d4310f80cd9fdbe9b8621e21d5fc132; current RC5 handoff base is dcff59e050de1dace19460198cb2909372bce7d5 and the final validation commit must be redeployed |
| release:branch | PASS | expected release/production-nammude |
| release:environment | ERROR | saw development |
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
