# Stress Test Report

Date: 2026-08-07T08:40:51.382Z

## Synthetic Operational Load

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.56ms | 0.71ms | 2.42ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.08ms | 0.44ms | <100ms update |
| POS 1000-item category switch | 0.09ms | 0.16ms | 0.37ms | <50ms switch |
| POS 1000-item search filter | 0.14ms | 0.26ms | 0.90ms | debounced |
| Active Orders 100-order filter/group | 0.23ms | 0.57ms | 1.27ms | <50ms interaction |

## Scenario

| Load | Value |
| --- | ---: |
| Kitchen orders | 100 |
| POS products | 1000 |
| Iterations per scenario | 200 |
| Heap delta | 682 KB |

## Result

The synthetic CPU paths stay under the POS 50ms and Kitchen 100ms budgets on this machine. Real FPS, device CPU, memory after 30 minutes, and Firestore listener counts remain manual browser/provider gates.
