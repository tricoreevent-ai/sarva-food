# Stress Test Report

Date: 2026-07-22T05:05:21.506Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.28ms | 0.32ms | 1.25ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.03ms | 0.24ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.08ms | 0.19ms | <50ms switch |
| POS 1000-item search filter | 0.07ms | 0.13ms | 0.34ms | debounced |
| Active Orders 100-order filter/group | 0.12ms | 0.18ms | 0.42ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2312 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
