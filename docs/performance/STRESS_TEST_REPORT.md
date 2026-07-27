# Stress Test Report

Date: 2026-07-27T08:12:25.252Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.64ms | 0.91ms | 1.50ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.10ms | 0.61ms | <100ms update |
| POS 1000-item category switch | 0.10ms | 0.20ms | 0.72ms | <50ms switch |
| POS 1000-item search filter | 0.18ms | 0.34ms | 0.82ms | debounced |
| Active Orders 100-order filter/group | 0.27ms | 0.39ms | 0.92ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -1602 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
