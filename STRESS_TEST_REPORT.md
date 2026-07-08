# Stress Test Report

Date: 2026-07-08T10:50:32.956Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.26ms | 0.39ms | 1.23ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.25ms | <100ms update |
| POS 1000-item category switch | 0.04ms | 0.08ms | 0.20ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.15ms | 0.30ms | debounced |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 2326 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
