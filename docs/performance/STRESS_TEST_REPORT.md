# Stress Test Report

Date: 2026-07-29T02:26:24.876Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.40ms | 0.51ms | 0.98ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.33ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.17ms | 0.27ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.16ms | 0.68ms | debounced |
| Active Orders 100-order filter/group | 0.16ms | 0.24ms | 0.57ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 1664 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
