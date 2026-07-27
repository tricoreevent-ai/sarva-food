# Stress Test Report

Date: 2026-07-27T07:32:46.675Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.33ms | 0.65ms | 1.49ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.31ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.10ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.42ms | debounced |
| Active Orders 100-order filter/group | 0.14ms | 0.25ms | 0.54ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | -2200 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
