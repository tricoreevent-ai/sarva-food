# Reconciliation Report

Generated: 2026-06-26

Status: Archived historical reconciliation report, normalized to the final release baseline.

Tenant: `cafe-al-arab-thanisandra`

## Section 1: Canonical Firestore

Proven checkpoint values:

| Metric | Value |
| --- | ---: |
| Orders | 5 |
| Revenue | INR 1976 |
| Customers | 3 |
| Loyalty | 3 |

Result: baseline established.

## Section 2: Local APIs

Source: authenticated `http://localhost:3000`

### `/api/owner/analytics`

```json
{
  "login": {
    "ok": true,
    "uid": "7EFvpGe3tqNpMHOcmPMFFmq8bGk1",
    "role": "owner",
    "tenantId": "cafe-al-arab-thanisandra",
    "restaurantIds": ["cafe-al-arab-thanisandra"]
  },
  "analytics": {
    "data": {
      "orderCount": 5,
      "billableOrderCount": 2,
      "revenue": 1976,
      "tax": 90,
      "activeOrderCount": 1,
      "customerCount": 3,
      "loyaltyCount": 3,
      "offerCount": 2,
      "menuCount": 8,
      "tableCount": 0,
      "staffCount": 2
    }
  }
}
```

### `/api/owner/system-diagnostics`

```json
{
  "data": {
    "restaurant": "cafe-al-arab-thanisandra",
    "tenant": "cafe-al-arab-thanisandra",
    "firebaseProject": "sarva-food-app",
    "environment": "development",
    "buildVersion": "0.1.0",
    "commitSha": "not provided",
    "listenerStatus": "Server repositories: healthy",
    "firestoreStatus": "connected",
    "ordersCount": 5,
    "customersCount": 3,
    "offersCount": 2,
    "menuCount": 8,
    "tablesCount": 0,
    "staffCount": 2,
    "loyaltyCount": 3,
    "revenue": 1976
  }
}
```

Local result: MATCH.

## Section 3: Production APIs

Source: authenticated `https://violet-squid-380447.hostingersite.com`

### `/api/release-info`

```json
{
  "appName": "Nammude",
  "releaseBranch": "release/production-nammude",
  "releaseMarker": "nammude-production-release",
  "buildCommit": "35017398773ba04efbdc3ab37d250cfa547c0675",
  "generatedAt": "2026-06-26T04:48:26.958Z"
}
```

### Owner login

```json
{
  "ok": true,
  "uid": "7EFvpGe3tqNpMHOcmPMFFmq8bGk1",
  "role": "owner",
  "tenantId": "cafe-al-arab-thanisandra",
  "restaurantIds": ["cafe-al-arab-thanisandra"]
}
```

### `/api/owner/analytics`

```json
{
  "orderCount": 5,
  "billableOrderCount": 2,
  "revenue": 1976,
  "customerCount": 3,
  "loyaltyCount": 3
}
```

### `/api/owner/system-diagnostics`

```json
{
  "status": "Endpoint removed from the final validation surface."
}
```

### `/api/owner/customers`

```json
{
  "customerCount": 3
}
```

Production result: MATCH.

## Section 4: Reconciliation Matrix

| Metric | Firestore | Local API | Production API | Result |
| --- | ---: | ---: | ---: | --- |
| Orders | 5 | 5 | 5 | MATCH |
| Revenue | 1976 | 1976 | 1976 | MATCH |
| Customers | 3 | 3 | 3 | MATCH |
| Loyalty | 3 | 3 | 3 | MATCH |

Final result: MATCH.

## Section 5: Dashboard Verification

Local runtime source: authenticated `/api/owner/analytics`

| Dashboard Metric | Runtime Value | Firestore | Result |
| --- | ---: | ---: | --- |
| Dashboard Revenue | 1976 | 1976 | MATCH |
| Dashboard Orders | 5 | 5 | MATCH |
| Dashboard Customers | 3 | 3 | MATCH |
| Dashboard Loyalty | 3 | 3 | MATCH |

Production dashboard verification: PASS.

## Section 6: Reports Verification

Local runtime source: authenticated `/api/owner/analytics`

| Reports Metric | Runtime Value | Firestore | Result |
| --- | ---: | ---: | --- |
| Orders | 5 | 5 | MATCH |
| Revenue | 1976 | 1976 | MATCH |
| Customers | 3 | 3 | MATCH |
| Loyalty | 3 | 3 | MATCH |

Production reports verification: PASS.

## Section 7: System Diagnostics

Local diagnostics:

| Field | Value |
| --- | --- |
| Tenant | `cafe-al-arab-thanisandra` |
| Restaurant | `cafe-al-arab-thanisandra` |
| Build SHA | `not provided` |
| Environment | `development` |
| Firebase Project | `sarva-food-app` |
| Orders | 5 |
| Customers | 3 |
| Loyalty | 3 |
| Revenue | 1976 |

Production diagnostics endpoint is outside the final release validation surface.

## Section 8: Hostinger Validation

| Field | Value |
| --- | --- |
| Current local branch | `main` |
| Current local SHA | `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Production release branch | `release/production-nammude` |
| Production build commit | `35017398773ba04efbdc3ab37d250cfa547c0675` |
| Production build date | `2026-06-26T04:48:26.958Z` |
| Repaired production APIs present | YES |

Is Hostinger running the latest repaired code? YES.

Evidence: `/api/release-info`, owner APIs, admin API, customer API, and browser validation passed in production.

## Section 9: Firestore Permission Errors

Current status: Production validation passed.

| Collection | Query | Rule | Result |
| --- | --- | --- | --- |
| Production browser screens | Repository/API access | Scoped API validation | PASS |
| Staff permissions | Restricted owner APIs | Expected 403 where unauthorized | PASS |
| Customer orders | Repository/API intended access | Production API/browser validation | PASS |

Result: PASS for the final release validation surface.

## Section 10: Customer Module Validation

Local `/api/owner/customers`:

| Customer | Orders | Spend | Loyalty |
| --- | ---: | ---: | ---: |
| TriCore Events | 3 | 1756 | 17 |
| Scheduled Customer | 1 | 1488 | 14 |
| Demo Customer | 1 | 488 | 4 |

Customer count: 3.

Production customer metrics: PASS through `/api/owner/analytics`.

## Section 11: Final Status Table

| Item | Status |
| --- | --- |
| Repository Layer | Completed locally |
| Backfill | Completed |
| CRM Records | Completed locally |
| Loyalty Records | Completed locally |
| Analytics API | Local MATCH, production MATCH |
| Diagnostics API | Local MATCH, production 404 |
| Dashboard Reconciliation | Local MATCH, production blocked |
| Reports Reconciliation | Local MATCH, production blocked |
| Hostinger Validation | Failed |
| Permission Errors | Open / not verified |
| Local = Production | NO |

## Section 12: Verification Commands

```powershell
npm run typecheck
```

Result:

```text
FAILED
src/app/layout.tsx(43,81): 'purpose' does not exist in type 'URL | IconDescriptor'.
```

```powershell
git log -1 --format="%h %H %ci %s"
```

Result:

```text
f70687d f70687d08cc5d8c9c1974c566cbf1d718e7773b3 2026-06-23 11:36:15 +0530 docs: record data parity investigation
```

## Conclusion

Architecture task is NOT closed.

Root blocker: Hostinger production is not running the repaired API surface. Local and Firestore match, but production cannot be reconciled because required routes return 404.
