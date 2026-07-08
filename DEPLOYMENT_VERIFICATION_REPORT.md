# Deployment Verification Report

Generated: 2026-07-08T17:00:52.384Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 15 |
| WARNING | 1 |
| ERROR | 1 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| http:release-info | PASS | https://violet-squid-380447.hostingersite.com/api/release-info -> HTTP 200 |
| release:version | PASS | expected v1.0.0-rc3, saw v1.0.0-rc3 |
| release:sha | WARNING | hosted currently serves 7fcd009d828635aef090fc9785af94b6ffc6b971; final certification commit is pending and must be redeployed |
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
