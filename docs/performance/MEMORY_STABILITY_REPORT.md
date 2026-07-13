# Memory Stability Report

Generated: 2026-07-10T15:16:13.674Z

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
| server:heap-growth | PASS | 5.57 MB growth / budget 64 MB |
| browser:listeners | MANUAL | EventSource/WebSocket/Firestore listener and React mount counts require authenticated Chrome instrumentation. |
| browser:heap | MANUAL | Detached DOM and client heap require 30-minute authenticated browser session. |

## Samples

| Time | Heap MB | RSS MB | Status |
| --- | --- | --- | --- |
| 2026-07-10T15:16:10.512Z | 90.58 | 190.81 | ok |
| 2026-07-10T15:16:12.037Z | 93.23 | 191.45 | ok |
| 2026-07-10T15:16:13.673Z | 96.15 | 194.01 | ok |
