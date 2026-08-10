# Stress Test Report

Date: 2026-08-10T07:35:15.479Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 1.78ms | 9.07ms | 26.99ms | <100ms update |
| Kitchen snapshot reconciliation | 0.08ms | 0.28ms | 1.23ms | <100ms update |
| POS 1000-item category switch | 0.30ms | 1.36ms | 17.70ms | <50ms switch |
| POS 1000-item search filter | 0.44ms | 1.55ms | 10.72ms | debounced |
| Active Orders 100-order filter/group | 0.65ms | 1.69ms | 5.54ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 404 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
