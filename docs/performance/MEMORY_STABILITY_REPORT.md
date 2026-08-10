# Memory Stability Report

Generated: 2026-08-10T09:06:08.376Z

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
| server:heap-growth | PASS | 1.31 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
| 2026-08-10T09:06:05.380Z | 87.63 | 174.84 | ok |
| 2026-08-10T09:06:06.874Z | 88.29 | 174.84 | ok |
| 2026-08-10T09:06:08.375Z | 88.94 | 174.84 | ok |
