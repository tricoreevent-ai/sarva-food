# Deployment Verification Report

Generated: 2026-07-29T14:54:44.481Z

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
| release:version | PASS | expected v1.0.0-rc6.5, saw v1.0.0-rc6.5 |
| release:sha | PASS | expected c17119a509aa28880fc9a507b94317b1d1727b69, saw c17119a509aa28880fc9a507b94317b1d1727b69 |
| release:branch | PASS | expected release/production-nammude |
| release:environment | PASS | saw production |
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
