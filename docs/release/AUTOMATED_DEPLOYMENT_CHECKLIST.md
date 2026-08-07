# Automated Deployment Checklist

Generated: 2026-08-07T07:09:43.942Z

| Field | Value |
| --- | --- |
| Repository SHA | `68fcfbc736b8f60d1736e2c9679ac82678a12309` |
| Branch | `release/production-nammude` |
| Release version | `v1.0.0-rc6.5` |
| Node version | `v22.16.0` |
| Environment | `not configured` |
| Build status | PASS |
| Smoke status | PASS |

## Automated Gates

| Gate | Status |
| --- | --- |
| Environment | FAIL |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Release audit | PASS |
| Operational smoke | PASS |
| Theme | PASS |
| Brand | PASS |
| Diff check | PASS |

## Required Environment Variables

| Variable | Status | Category |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | ERROR | Release Metadata |
| `NEXT_PUBLIC_APP_URL` | ERROR | Infrastructure |
| `NEXT_PUBLIC_APP_VERSION` | ERROR | Release Metadata |
| `NEXT_PUBLIC_USE_FIREBASE` | PASS | Firebase |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | PASS | Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | PASS | Authentication |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | PASS | Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | PASS | Firebase |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | PASS | Notifications |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | PASS | Firebase |
| `FIREBASE_ADMIN_PROJECT_ID` | ERROR | Firebase |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | ERROR | Firebase |
| `FIREBASE_ADMIN_PRIVATE_KEY` | ERROR | Security |
| `TABLE_QR_SECRET` | ERROR | QR |
| `PAYMENT_SETTINGS_ENCRYPTION_KEY` | ERROR | Payments |

## Configuration Blockers

- **Release Metadata:** Required because it selects production-safe behavior. Used by runtime configuration. Fix: set to production.
- **Infrastructure:** A placeholder cannot initialize production safely. Used by public URL and mutation-origin validation. Fix: set the final HTTPS origin.
- **Release Metadata:** Required because it identifies the deployed release. Used by release and health endpoints. Fix: set to v1.0.0-rc6.5.
- **Firebase:** Required because it authorizes server-side tenant operations on Hostinger. Used by src/firebase/admin.ts. Fix: set the service-account project id.
- **Firebase:** Required because it identifies the server service account. Used by src/firebase/admin.ts. Fix: set the service-account client email.
- **Security:** Required because it signs Firebase Admin requests. Used by src/firebase/admin.ts. Fix: set the full PEM value with escaped newlines.
- **QR:** Required because it prevents forged table sessions. Used by table QR signing and verification. Fix: generate and retain a random value of at least 32 characters.
- **Payments:** Required because it protects owner-managed payment credentials at rest. Used by payment settings encryption. Fix: generate and retain a random value of at least 32 characters.
- **Infrastructure:** must be a valid https URL. Required to prevent unsafe or ambiguous production startup. Used by Infrastructure configuration. Fix: set the documented production value and rerun npm run validate:prod-env.
- **Authentication:** must not be true in production; absence safely defaults to false. Required to prevent unsafe or ambiguous production startup. Used by Authentication configuration. Fix: set the documented production value and rerun npm run validate:prod-env.

## Health Endpoint Verification

- [ ] `/health/live` returns HTTP 200 with the expected SHA and version.
- [ ] `/health/ready` returns PASS with no blocking configuration or database failures.
- [ ] `/health/startup` returns PASS after a clean production restart.

## Outstanding Manual Tasks

- [ ] Set and verify Hostinger production environment variables.
- [ ] Verify Firebase Console services, rules, indexes, authorized domains, and service account.
- [ ] Verify owner-scoped payment provider credentials and webhooks.
- [ ] Verify WhatsApp Cloud credentials if automated outbound messaging is enabled.
- [ ] Verify DNS/TLS and Sentry dashboards if configured.
- [ ] Complete production browser, device, accessibility, provider, and hardware smoke tests.
