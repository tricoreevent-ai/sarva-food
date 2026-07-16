# Stress Test Report

Date: 2026-07-16T09:34:49.846Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.67ms | 1.01ms | 3.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.04ms | 0.13ms | 0.54ms | <100ms update |
| POS 1000-item category switch | 0.11ms | 0.21ms | 0.44ms | <50ms switch |
| POS 1000-item search filter | 0.17ms | 0.29ms | 0.81ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2566 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
