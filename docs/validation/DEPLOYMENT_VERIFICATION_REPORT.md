# Deployment Verification Report

Generated: 2026-07-26T13:58:12.789Z

Status: Superseded hosted probe. After RC6.5 deploy, rerun deployment verification and require final SHA plus `applicationVersion=v1.0.0-rc6.5`.

## Summary

| Status | Count |
| --- | --- |
| PASS | 10 |
| WARNING | 0 |
| ERROR | 3 |
| FAIL | 0 |
| MANUAL | 0 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| http:release-info | PASS | https://violet-squid-380447.hostingersite.com/api/release-info -> HTTP 200 |
| release:version | PASS | expected v1.0.0-rc5, saw v1.0.0-rc5 |
| release:sha | PASS | expected c5fd64c84f8bb247a509ded693089c4878e9f6a4, saw c5fd64c84f8bb247a509ded693089c4878e9f6a4 |
| release:branch | PASS | expected release/production-nammude |
| release:environment | PASS | saw production |
| release:timestamp | PASS | deployment timestamp present |
| release:runtime | PASS | runtime v22.18.0 |
| release:plugin-flags | PASS | runtime dashboard/profiler disabled |
| http:health-live | PASS | https://violet-squid-380447.hostingersite.com/health/live -> HTTP 200 |
| health:live-status | PASS | status ok |
| http:health-ready | ERROR | This operation was aborted |
| http:health-startup | ERROR | https://violet-squid-380447.hostingersite.com/health/startup -> HTTP 503 |
| health:startup | ERROR | HTTP 503 |
