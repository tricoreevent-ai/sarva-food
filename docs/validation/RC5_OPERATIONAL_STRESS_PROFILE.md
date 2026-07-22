# RC5 Operational Stress Profile

Generated: 2026-07-22T06:00:59.961Z

Result: PASS — 4/4 profiles passed.

| Profile | Status | Duration ms | Metrics |
| --- | --- | ---: | --- |
| sequential-numbering:128-concurrent | PASS | 8.32 | writes: 128.00; duplicates: 0.00; skipped: 0.00 |
| realtime-sync:multi-screen-deltas | PASS | 10183.27 | patches: 7200.00; p95Ms: 9.86; listeners: 5.00; duplicateRows: 0.00 |
| memory:long-running-patch-profile | PASS | 1257.28 | iterations: 1800.00; retainedRows: 40.00; heapDeltaMb: 0.23 |
| source:production-hardening-contracts | PASS | 3.59 | auditedFiles: 9.00 |

## Coverage

- Simulated 128 concurrent restaurant orders across Owner Dashboard, Owner Orders/POS, Kitchen, Reports, History-style terminal states, QR/waiter sources, partial payments, merged live rows, and Kitchen add-on tickets.
- Verified atomic sequential-number allocation model has no duplicates or gaps under 128 concurrent allocations.
- Verified realtime patch fan-out keeps one row per id, uses incremental deltas, and preserves shared order/KOT state across open operational screens.
- Verified Kitchen ready-signal notifications use SSE with no interval polling and close listeners on unmount.
- Verified long-running patch profile retains bounded rows and does not create unbounded client-side listener/cache growth.

## Metrics

- Realtime p95 patch latency: 9.86ms.
- Listener budget: 5 active page-level SSE consumers in the simulated multi-screen session.
- Duplicate rows/writes/notifications observed in simulation: 0.
- Long memory heap delta: 0.23MB over 1800 iterations.

Hosted multi-device browser latency, real Firestore backend contention, production network waterfalls, physical printer output, and provider dashboards still require manual production QA.
