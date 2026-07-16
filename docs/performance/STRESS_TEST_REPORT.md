# Stress Test Report

Date: 2026-07-16T09:05:40.811Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.56ms | 0.78ms | 2.98ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.15ms | 0.80ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.18ms | 0.37ms | <50ms switch |
| POS 1000-item search filter | 0.16ms | 0.34ms | 0.69ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2336 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
