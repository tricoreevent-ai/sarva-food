# Memory Stability Report

Generated: 2026-07-08T17:24:14.965Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 1 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 3 |
| MANUAL | 2 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| sample:1 | FAIL | fetch failed |
| sample:2 | FAIL | fetch failed |
| sample:3 | FAIL | fetch failed |
| server:heap-growth | PASS | 0.00 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
