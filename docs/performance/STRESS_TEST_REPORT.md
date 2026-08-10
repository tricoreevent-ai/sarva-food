# Stress Test Report

Date: 2026-08-10T06:35:54.107Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.35ms | 0.43ms | 1.56ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.07ms | 0.37ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.10ms | 0.23ms | <50ms switch |
| POS 1000-item search filter | 0.11ms | 0.24ms | 0.70ms | debounced |
| Active Orders 100-order filter/group | 0.18ms | 0.35ms | 0.77ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 738 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
