# Risk Register

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Date: 2026-07-13

| Risk | Level | Status | Evidence | Mitigation |
| --- | --- | --- | --- | --- |
| Hosted env reports `development` | High | 🔴 Blocking | `docs/validation/DEPLOYMENT_VERIFICATION_REPORT.md` `release:environment ERROR`. | Set `NEXT_PUBLIC_APP_ENV=production`, redeploy/restart, clear cache, reverify. |
| Production secrets absent in local validation | High | 🔴 Blocking | `docs/validation/PRODUCTION_ENV_VALIDATION_REPORT.md`: `24` errors. | Configure Hostinger/Firebase/Razorpay/QR/alert secrets; rerun validation in production-equivalent env. |
| Lighthouse/Core Web Vitals unavailable | Medium | 🟡 Pending Manual | Performance report marks desktop/mobile Lighthouse manual. | Run hosted Lighthouse after env correction. |
| `/owner/orders` route JS over verification budget | Medium | 🟡 Pending Manual | `1246 KB` vs `1200 KB` warning. | Defer code split until authenticated visual/regression smoke exists. |
| Provider live behavior unverified | High | 🟡 Pending Manual | Provider report has `3` manual items. | Run Razorpay/WhatsApp/SMS/push/provider dashboard smoke. |
| Authenticated browser/device flows unverified | High | 🟡 Pending Manual | Production smoke has `18` manual items. | Run checklist on target browsers/devices. |
| Firebase rules/index production state unverified | High | 🟡 Pending Manual | Console deployment state is external. | Deploy/review rules/indexes and smoke protected flows. |
| Printer/QR/camera hardware unverified | Medium | 🟡 Pending Manual | Requires restaurant devices. | Validate target printers, QR scanning, camera/upload. |
| Firebase/protobuf dynamic dependency warning | Low | ✅ Accepted | Build/analyze warning trace is upstream Firebase/protobuf. | Document and accept; no freeze-time aliasing. |
