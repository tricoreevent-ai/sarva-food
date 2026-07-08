# Memory Stability Report

Generated: 2026-07-08T14:50:26.614Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 1 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 2 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| server:heap-growth | PASS | -0.06 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
| 2026-07-08T14:50:23.593Z | 79.13 | 172.98 | ok |
| 2026-07-08T14:50:25.095Z | 79.01 | 172.98 | ok |
| 2026-07-08T14:50:26.613Z | 79.07 | 172.98 | ok |
