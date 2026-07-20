# Stress Test Report

Date: 2026-07-20T15:28:42.110Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.30ms | 0.36ms | 1.71ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.27ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.09ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.36ms | debounced |
| Active Orders 100-order filter/group | 0.13ms | 0.19ms | 0.47ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2347 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
