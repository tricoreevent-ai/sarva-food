# Stress Test Report

Date: 2026-07-26T10:09:15.417Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.79ms | 1.18ms | 3.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.16ms | 1.07ms | <100ms update |
| POS 1000-item category switch | 0.13ms | 0.25ms | 4.18ms | <50ms switch |
| POS 1000-item search filter | 0.25ms | 0.55ms | 1.17ms | debounced |
| Active Orders 100-order filter/group | 0.34ms | 0.89ms | 1.80ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2093 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
