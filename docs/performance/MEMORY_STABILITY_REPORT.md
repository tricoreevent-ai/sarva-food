# Memory Stability Report

Generated: 2026-08-10T09:48:54.434Z

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
| server:heap-growth | PASS | -0.04 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
| 2026-08-10T09:48:50.718Z | 89.57 | 175.25 | ok |
| 2026-08-10T09:48:52.449Z | 90.21 | 175.25 | ok |
| 2026-08-10T09:48:54.433Z | 89.53 | 175.25 | ok |
