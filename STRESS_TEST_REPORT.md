# Stress Test Report

Date: 2026-07-08T17:26:27.709Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.98ms | 2.22ms | 65.45ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.12ms | 1.56ms | <100ms update |
| POS 1000-item category switch | 0.16ms | 0.32ms | 0.60ms | <50ms switch |
| POS 1000-item search filter | 0.27ms | 0.61ms | 6.15ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 114 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
