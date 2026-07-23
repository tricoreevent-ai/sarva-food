# Stress Test Report

Date: 2026-07-23T09:53:21.439Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.47ms | 0.68ms | 2.09ms | <100ms update |
| Kitchen snapshot reconciliation | 0.05ms | 0.08ms | 0.73ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.14ms | 0.34ms | <50ms switch |
| POS 1000-item search filter | 0.14ms | 0.22ms | 0.91ms | debounced |
| Active Orders 100-order filter/group | 0.20ms | 0.35ms | 0.96ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2224 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
