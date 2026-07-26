# Stress Test Report

Date: 2026-07-26T13:15:01.436Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.47ms | 0.92ms | 1.21ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.09ms | 0.39ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.15ms | 0.33ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.22ms | 0.66ms | debounced |
| Active Orders 100-order filter/group | 0.19ms | 0.28ms | 0.70ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -1878 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
