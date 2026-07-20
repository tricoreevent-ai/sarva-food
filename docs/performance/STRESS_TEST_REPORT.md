# Stress Test Report

Date: 2026-07-20T09:37:00.019Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.50ms | 1.39ms | 6.26ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.06ms | 0.53ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.17ms | 0.34ms | <50ms switch |
| POS 1000-item search filter | 0.12ms | 0.23ms | 0.60ms | debounced |
| Active Orders 100-order filter/group | 0.21ms | 0.30ms | 0.74ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2049 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
