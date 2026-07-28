# Stress Test Report

Date: 2026-07-28T07:36:44.690Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.64ms | 0.81ms | 1.77ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.47ms | <100ms update |
| POS 1000-item category switch | 0.10ms | 0.19ms | 0.57ms | <50ms switch |
| POS 1000-item search filter | 0.14ms | 0.25ms | 0.83ms | debounced |
| Active Orders 100-order filter/group | 0.26ms | 0.43ms | 1.42ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -1840 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
