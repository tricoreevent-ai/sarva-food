# Stress Test Report

Date: 2026-08-10T11:58:44.307Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.26ms | 0.52ms | 0.95ms | <100ms update |
| Kitchen snapshot reconciliation | 0.01ms | 0.05ms | 0.39ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.12ms | 0.17ms | <50ms switch |
| POS 1000-item search filter | 0.06ms | 0.11ms | 0.55ms | debounced |
| Active Orders 100-order filter/group | 0.11ms | 0.25ms | 0.47ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 563 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
