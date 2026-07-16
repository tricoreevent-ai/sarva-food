# Deployment Verification Report

Generated: 2026-07-16T04:39:44.923Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 16 |
| WARNING | 1 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| http:release-info | PASS | https://violet-squid-380447.hostingersite.com/api/release-info -> HTTP 200 |
| release:version | PASS | expected v1.0.0-rc5 |
| release:sha | WARNING | hosted currently serves 2b8a348c416b0d952ab80d80083202280548c4d9; latest pushed baseline ba8e957d57b949a94d0c42a3b170cf198917c0d8 must be deployed and verified |
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
