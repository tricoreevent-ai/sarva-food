# Risk Register

Release: `v1.0.0-rc6.5` candidate; existing RC tags remain immutable
Date: 2026-07-29

| Risk | Level | Status | Evidence | Mitigation |
| --- | --- | --- | --- | --- |
| RC6.5 hosted SHA not verified | High | 🔴 Blocking | Hosted deployment evidence must be refreshed after the final RC6.5 reconciliation commit. | Deploy RC6.5, clear cache/restart, verify `/api/release-info` exact SHA/version, then rerun hosted smoke. |
| Production secrets absent in local validation | High | 🔴 Blocking | `docs/validation/PRODUCTION_ENV_VALIDATION_REPORT.md`: `17` errors and `1` manual check. | Configure Hostinger/Firebase/QR/alert/encryption secrets, configure Razorpay per owner, and rerun validation in a production-equivalent env. |
| Lighthouse/Core Web Vitals unavailable | Medium | 🟡 Pending Manual | Performance report marks desktop/mobile Lighthouse manual. | Run hosted Lighthouse after env correction. |
| `/owner/orders` route JS | Low | ✅ Resolved Locally | Current analyzer reports `692 KB`, under the `1200 KB` verification budget and preferred `1000 KB` target. | Run hosted Chrome/Lighthouse profiling after deployment. |
| Provider live behavior unverified | High | 🟡 Pending Manual | Provider report has `3` manual items. | Run Razorpay/WhatsApp/SMS/push/provider dashboard smoke. |
| Authenticated browser/device flows unverified | High | 🟡 Pending Manual | Production smoke has `18` manual items. | Run checklist on target browsers/devices. |
| Firebase rules/index production state unverified | High | 🟡 Pending Manual | Console deployment state is external; RC5 waiter-serving pass changed Firestore rules for order/kitchen role parity. | Deploy/review rules/indexes and smoke Waiter Served/Completed plus Kitchen Ready-only protected flows. |
| Printer/QR/camera hardware unverified | Medium | 🟡 Pending Manual | Requires restaurant devices. | Validate target printers, QR scanning, camera/upload. |
| Active Orders hosted multi-role QA pending | Medium | 🟡 Pending Manual | Repository validation passes operational smoke plus stress/realtime/memory profiles, including unified Owner/Waiter Active Orders, send-to-kitchen linkage, Dashboard/Reports/Kitchen live consistency, Kitchen Accept no-Tables RBAC bootstrap, POS Display Options, sequential numbering, waiter service RBAC, payment independence, Ready Signal, multi-ticket dining, add-on KOT idempotency, bill-only merge, completed holding/history, Kitchen History density, and RC6 classification contracts; hosted Owner/Manager/Waiter/Cashier/Kitchen browser evidence is external. | Run the RC6.5 hosted Owner Dashboard/POS/Active Orders/Kitchen/Reports action matrix after deployment and capture console/network/printer evidence. |
| Firebase/protobuf dynamic dependency warning | Low | ✅ Accepted | Build/analyze warning trace is upstream Firebase/protobuf. | Document and accept; no freeze-time aliasing. |
| Push deep-link duplicate tab | Low | ✅ Resolved | Phase 4D service-worker VM simulation verifies exact query/hash tab reuse. | Retain `smoke:operational` in release gates and confirm on real devices. |
