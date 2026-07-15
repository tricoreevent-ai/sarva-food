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
| release:sha | WARNING | hosted currently serves dcff59e050de1dace19460198cb2909372bce7d5; current RC5 image closure commit is fc0986e9ba5dedb302dedcdd5eb9e20346844dba and must be pushed, deployed, and verified |
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
