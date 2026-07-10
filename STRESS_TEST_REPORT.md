# Stress Test Report

Date: 2026-07-10T07:08:25.318Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.90ms | 1.84ms | 4.94ms | <100ms update |
| Kitchen snapshot reconciliation | 0.08ms | 0.17ms | 0.99ms | <100ms update |
| POS 1000-item category switch | 0.28ms | 0.55ms | 0.83ms | <50ms switch |
| POS 1000-item search filter | 0.37ms | 0.66ms | 1.71ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2630 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
