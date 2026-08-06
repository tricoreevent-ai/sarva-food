# Stress Test Report

Date: 2026-08-06T07:00:09.795Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.75ms | 1.24ms | 2.50ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.17ms | 1.03ms | <100ms update |
| POS 1000-item category switch | 0.17ms | 0.37ms | 0.74ms | <50ms switch |
| POS 1000-item search filter | 0.30ms | 0.51ms | 1.75ms | debounced |
| Active Orders 100-order filter/group | 0.50ms | 0.74ms | 1.59ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 656 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
