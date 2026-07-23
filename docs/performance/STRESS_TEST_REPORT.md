# Stress Test Report

Date: 2026-07-23T16:03:45.662Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.52ms | 0.92ms | 2.34ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.06ms | 0.43ms | <100ms update |
| POS 1000-item category switch | 0.16ms | 0.23ms | 0.41ms | <50ms switch |
| POS 1000-item search filter | 0.20ms | 0.36ms | 1.51ms | debounced |
| Active Orders 100-order filter/group | 0.23ms | 0.61ms | 1.25ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2112 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
