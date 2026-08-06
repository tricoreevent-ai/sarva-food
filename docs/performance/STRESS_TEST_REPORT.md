# Stress Test Report

Date: 2026-08-06T06:18:36.096Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.87ms | 1.46ms | 46.59ms | <100ms update |
| Kitchen snapshot reconciliation | 0.06ms | 0.13ms | 0.74ms | <100ms update |
| POS 1000-item category switch | 0.20ms | 0.35ms | 0.76ms | <50ms switch |
| POS 1000-item search filter | 0.31ms | 0.60ms | 1.75ms | debounced |
| Active Orders 100-order filter/group | 0.48ms | 0.77ms | 1.77ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 511 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
