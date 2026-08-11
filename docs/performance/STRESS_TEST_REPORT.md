# Stress Test Report

Date: 2026-08-11T06:45:00.609Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.64ms | 1.30ms | 2.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.11ms | 0.50ms | <100ms update |
| POS 1000-item category switch | 0.11ms | 0.19ms | 0.43ms | <50ms switch |
| POS 1000-item search filter | 0.22ms | 0.43ms | 0.99ms | debounced |
| Active Orders 100-order filter/group | 0.26ms | 0.59ms | 0.90ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 579 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
