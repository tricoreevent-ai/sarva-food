# RC5 Production Infrastructure Certification

Generated: 2026-07-26

## Firebase production target

| Item | Value |
| --- | --- |
| Project ID | `sarva-food-app` |
| Project number | `488410799126` |
| Firestore database | `projects/sarva-food-app/databases/(default)` |
| Firestore region | `me-central1` |
| Firestore type | `FIRESTORE_NATIVE` |
| Firestore edition | `STANDARD` |
| Free tier | `true` |
| Storage bucket | `sarva-food-app.firebasestorage.app` |

Production release metadata and local Firebase env both point to `sarva-food-app`. Firestore CLI metadata confirms the default database is still free-tier; production cannot be treated as load-test/certification capacity until billing/quota is upgraded.

## Public API cache policy

Read-only public catalog endpoints must be cacheable:

| Endpoint | Cache policy | Firestore protection |
| --- | --- | --- |
| `/api/public/restaurants` | CDN/server cache, stale-while-revalidate | repeated restaurant discovery does not repeatedly read Firestore |
| `/api/public/menu` | CDN/server cache, stale-while-revalidate | repeated menu/QR/item-page views reuse cache |
| `/api/public/offers` | short CDN/server cache | offer visibility can refresh quickly without per-request reads |
| `/api/public/categories` | long server cache | low-change global catalog data |
| `/api/public/cuisines` | long server cache | low-change global catalog data |
| `/api/public/reviews` | short public cache for customer reads; no-store for management scope | public review display is protected; owner moderation stays live |

Client public-data fetches use in-flight request de-duplication and a short memory cache before making identical network requests.

## Firestore failure semantics

Health checks and public APIs classify Firestore dependency failures as:

- `firestore_quota_exceeded`
- `firestore_permission_denied`
- `firestore_authentication_failed`
- `firestore_timeout`
- `firestore_network_unavailable`
- `firestore_configuration_missing`
- `firestore_unavailable`

Public APIs return user-safe dependency messages and `503` for retryable Firestore outages. Technical details remain in server logs.

## Production Firestore script safeguards

Production Firestore scripts must refuse to run against `sarva-food-app` unless explicitly confirmed:

```powershell
$env:ALLOW_PRODUCTION_FIRESTORE="true"
```

or:

```powershell
npm run firebase:validate:production-data -- --production-confirm
```

| Script | Estimated reads | Estimated writes/deletes | Risk |
| --- | ---: | ---: | --- |
| `firebase:validate:production-data` | 32,000 | 0 | Two full runs can exceed the 50k/day free-tier read quota |
| `firebase:cleanup:dry-run` | 40,000 | 0 | Can exhaust free-tier reads |
| `firebase:cleanup:apply` | 40,000 | up to 40,000 writes | Production data mutation |
| `firebase:seed:production` | 0 | 500-1,000 writes | Production data mutation |
| `firebase:backfill-customers` | up to 50,000 | up to 50,000 writes in apply mode | Full order scan |
| `firebase:backfill-order-consistency` | up to 50,000 | up to 50,000 writes in apply mode | Full order/KOT scan |
| `firebase:legacy-menu:apply` | 40 | up to 40 deletes | Production data deletion |
| repair scripts | 1-2,500 | 1-500 writes/deletes | Targeted production repair |

## Production/staging isolation

Production must not be used for:

- stress testing
- load testing
- repeated certification scripts
- profiling
- exploratory diagnostics
- destructive repair dry-runs without approval

Create a separate staging Firebase project with its own Firestore database, storage bucket, service accounts, web app credentials, and authorized domains. Run load/stress/certification only against staging.

## Monitoring and alerting

Configure Cloud Monitoring alerts for Firestore:

| Signal | Alert thresholds |
| --- | --- |
| Document reads/day | 60%, 80%, 95%, 100% |
| Document writes/day | 60%, 80%, 95%, 100% |
| Deletes/day | 60%, 80%, 95%, 100% |
| Firestore request latency | p95 above operational baseline |
| Firestore errors | any sustained `RESOURCE_EXHAUSTED`, `PERMISSION_DENIED`, `UNAUTHENTICATED`, `UNAVAILABLE`, `DEADLINE_EXCEEDED` |
| Public API 5xx/503 rate | sustained failures over 5 minutes |
| `/health/ready` and `/health/startup` | any non-200 for production |

Recommended exports:

- Cloud Logging sink for application and Firestore errors.
- BigQuery export for request/error analytics.
- Error Reporting for server exceptions.
- Budget alerts for Firebase/GCP billing.

## Recovery runbook

1. Stop production validation/load scripts.
2. Check `/health/ready` for `failureKind` and `issue`.
3. If `firestore_quota_exceeded`, enable billing/raise quota or wait for daily reset.
4. Verify public APIs return cached data or graceful `503` responses.
5. Clear Hostinger/CDN cache only after deployment changes.
6. Re-run one smoke pass, not repeated quota-heavy validations.

Production recommendation remains `NOT READY` until Firestore quota/billing is healthy and Cloud Monitoring alerts are configured.
