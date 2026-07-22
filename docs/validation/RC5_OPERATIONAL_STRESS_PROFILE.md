# RC5 Operational Stress Profile

Generated: 2026-07-22T08:46:21.575Z

Result: PASS — 4/4 profiles passed.

| Profile | Status | Duration ms | Metrics |
| --- | --- | ---: | --- |
| sequential-numbering:128-concurrent | PASS | 2.92 | writes: 128.00; duplicates: 0.00; skipped: 0.00 |
| realtime-sync:multi-screen-deltas | PASS | 231.22 | patches: 960.00; p95Ms: 1.81; listeners: 5.00; duplicateRows: 0.00 |
| memory:long-running-patch-profile | PASS | 21.02 | iterations: 240.00; retainedRows: 40.00; heapDeltaMb: 1.36 |
| source:production-hardening-contracts | PASS | 0.71 | auditedFiles: 11.00 |

## Coverage

- Simulated 128 concurrent restaurant orders across Owner Dashboard, Owner Orders/POS, Kitchen, Reports, History-style terminal states, QR/waiter sources, partial payments, merged live rows, and Kitchen add-on tickets.
- Verified atomic sequential-number allocation model has no duplicates or gaps under 128 concurrent allocations.
- Verified realtime patch fan-out keeps one row per id, uses incremental deltas, and preserves shared order/KOT state across open operational screens.
- Verified Kitchen ready-signal notifications use SSE with no interval polling and close listeners on unmount.
- Verified Kitchen bootstrap no longer calls the owner Tables API and printer access uses a Kitchen-scoped print surface.
- Verified long-running patch profile retains bounded rows and does not create unbounded client-side listener/cache growth.

## Metrics

- Realtime p95 patch latency: 1.81ms.
- Listener budget: 5 active page-level SSE consumers in the simulated multi-screen session.
- Duplicate rows/writes/notifications observed in simulation: 0.
- Long memory heap delta: 1.36MB over 240 iterations.

Hosted multi-device browser latency, real Firestore backend contention, production network waterfalls, physical printer output, and provider dashboards still require manual production QA.
