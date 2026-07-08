# Memory Stability Report

Generated: 2026-07-08T17:01:06.748Z

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
| server:heap-growth | PASS | 2.08 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
| 2026-07-08T17:01:01.384Z | 77.81 | 165.21 | ok |
| 2026-07-08T17:01:03.441Z | 79.5 | 165.46 | ok |
| 2026-07-08T17:01:06.747Z | 79.89 | 167.01 | ok |
