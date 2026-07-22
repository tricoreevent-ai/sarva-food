# Stress Test Report

Date: 2026-07-22T08:45:55.047Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.41ms | 1.04ms | 4.46ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.08ms | 0.36ms | <100ms update |
| POS 1000-item category switch | 0.07ms | 0.12ms | 0.27ms | <50ms switch |
| POS 1000-item search filter | 0.13ms | 0.25ms | 0.52ms | debounced |
| Active Orders 100-order filter/group | 0.18ms | 0.38ms | 0.74ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2288 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
