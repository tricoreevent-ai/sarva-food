# Stress Test Report

Date: 2026-07-20T14:04:49.897Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.25ms | 0.32ms | 1.71ms | <100ms update |
| Kitchen snapshot reconciliation | 0.01ms | 0.03ms | 0.20ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.07ms | 0.18ms | <50ms switch |
| POS 1000-item search filter | 0.06ms | 0.11ms | 0.29ms | debounced |
| Active Orders 100-order filter/group | 0.11ms | 0.15ms | 0.54ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2231 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
