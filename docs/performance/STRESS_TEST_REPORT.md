# Stress Test Report

Date: 2026-07-22T06:06:06.139Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 1.54ms | 3.27ms | 16.70ms | <100ms update |
| Kitchen snapshot reconciliation | 0.10ms | 0.23ms | 1.31ms | <100ms update |
| POS 1000-item category switch | 0.33ms | 0.58ms | 1.13ms | <50ms switch |
| POS 1000-item search filter | 0.46ms | 0.77ms | 2.51ms | debounced |
| Active Orders 100-order filter/group | 0.77ms | 1.50ms | 3.96ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2401 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
