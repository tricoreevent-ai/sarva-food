# Stress Test Report

Date: 2026-08-10T15:59:37.829Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.54ms | 0.92ms | 1.98ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.10ms | 0.44ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.19ms | 0.36ms | <50ms switch |
| POS 1000-item search filter | 0.11ms | 0.22ms | 0.87ms | debounced |
| Active Orders 100-order filter/group | 0.23ms | 0.41ms | 0.80ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 642 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
