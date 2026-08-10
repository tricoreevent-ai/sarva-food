# Stress Test Report

Date: 2026-08-10T08:23:52.452Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.29ms | 0.38ms | 1.01ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.03ms | 0.24ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.09ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.06ms | 0.12ms | 0.54ms | debounced |
| Active Orders 100-order filter/group | 0.12ms | 0.18ms | 0.53ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 473 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
