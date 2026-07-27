# Stress Test Report

Date: 2026-07-27T07:22:44.027Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.53ms | 0.66ms | 1.22ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.09ms | 0.52ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.24ms | 0.46ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.23ms | 0.71ms | debounced |
| Active Orders 100-order filter/group | 0.22ms | 0.33ms | 0.80ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2146 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
