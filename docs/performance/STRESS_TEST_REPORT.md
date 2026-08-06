# Stress Test Report

Date: 2026-08-06T07:39:16.119Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.79ms | 1.53ms | 2.59ms | <100ms update |
| Kitchen snapshot reconciliation | 0.06ms | 0.16ms | 0.90ms | <100ms update |
| POS 1000-item category switch | 0.22ms | 0.34ms | 0.52ms | <50ms switch |
| POS 1000-item search filter | 0.30ms | 0.51ms | 1.79ms | debounced |
| Active Orders 100-order filter/group | 0.52ms | 0.85ms | 1.72ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 576 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
