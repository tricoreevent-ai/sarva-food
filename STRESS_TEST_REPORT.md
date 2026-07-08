# Stress Test Report

Date: 2026-07-08T14:50:48.154Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.39ms | 0.49ms | 2.20ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.34ms | <100ms update |
| POS 1000-item category switch | 0.07ms | 0.17ms | 0.26ms | <50ms switch |
| POS 1000-item search filter | 0.11ms | 0.19ms | 0.47ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2396 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
