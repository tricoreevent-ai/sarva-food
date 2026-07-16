# Stress Test Report

Date: 2026-07-16T08:41:42.670Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.47ms | 0.58ms | 2.41ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.07ms | 0.61ms | <100ms update |
| POS 1000-item category switch | 0.08ms | 0.14ms | 0.30ms | <50ms switch |
| POS 1000-item search filter | 0.12ms | 0.20ms | 0.50ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2342 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
