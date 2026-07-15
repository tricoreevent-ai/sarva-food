# API Documentation

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Runtime release commit: final RC5 validation commit after local gates pass; current handoff base `dcff59e050de1dace19460198cb2909372bce7d5`

## Production API Families

| Family | Purpose | Auth |
| --- | --- | --- |
| `/api/public/*` | Public catalog, reviews, table-order, order notification, CMS/cache/outage surfaces. | Public or endpoint-specific validation. |
| `/api/customer/*` | Customer account, cart, orders, profile, saved data. | Customer session. |
| `/api/owner/*` | Owner orders, POS, Kitchen, tables, menu, settings, diagnostics, staff, inventory, accounting. | Owner session, tenant scope, feature permission where required. |
| `/api/admin/*` | Admin CMS, diagnostics, restaurants, users, support, platform data. | Admin session. |
| `/api/payments/razorpay/*` | Razorpay order, verify, refund, webhook. | Session or provider signature depending on endpoint. |
| `/api/whatsapp/*` | WhatsApp Cloud API send and webhook. | Session/provider token validation. |
| `/api/release-info` | Release metadata. | Public safe metadata only. |
| `/health/live`, `/health/ready`, `/health/startup` | No-store liveness/readiness/startup metadata. | Public safe status only. |

## Release API Certification

- No duplicate API family was added during final certification.
- API response contracts were preserved; no schema or Firestore collection was added.
- Public metadata exposes request ids and safe status only.
- Server diagnostics use centralized masked logging for touched high-risk routes.
- Admin owner credential actions send generated temporary passwords by email only and do not return them in API responses.
- Provider endpoints still require production credentials and provider-console smoke before launch signoff.

## Verification

```bat
cmd /c npm run audit:release
cmd /c npm run smoke:operational
cmd /c npm run typecheck
cmd /c npm run lint
cmd /c npm run build
```
