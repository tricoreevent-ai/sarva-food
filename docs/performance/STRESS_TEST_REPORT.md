# Stress Test Report

Date: 2026-07-16T04:35:18.415Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.52ms | 0.71ms | 2.68ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.51ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.17ms | 0.38ms | <50ms switch |
| POS 1000-item search filter | 0.15ms | 0.24ms | 0.66ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2392 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
