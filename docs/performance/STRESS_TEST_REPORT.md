# Stress Test Report

Date: 2026-07-21T12:21:43.575Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.38ms | 0.47ms | 1.84ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.06ms | 0.33ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.11ms | 0.25ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.16ms | 0.42ms | debounced |
| Active Orders 100-order filter/group | 0.16ms | 0.24ms | 0.57ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2456 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
