# Reconciliation Report

Generated: 2026-06-23

Tenant: `cafe-al-arab-thanisandra`

## Section 1: Canonical Firestore

Proven checkpoint values:

| Metric | Value |
| --- | ---: |
| Orders | 5 |
| Revenue | INR 3732 |
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
      "billableOrderCount": 5,
      "revenue": 3732,
      "tax": 169,
      "activeOrderCount": 4,
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
    "revenue": 3732
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
  "buildCommit": "unknown",
  "generatedAt": "2026-06-23T10:13:29.763Z"
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
  "analyticsError": "404 The remote server returned an error: (404) Not Found."
}
```

### `/api/owner/system-diagnostics`

```json
{
  "diagnosticsError": "404 The remote server returned an error: (404) Not Found."
}
```

### `/api/owner/customers`

```json
{
  "customersError": "404 The remote server returned an error: (404) Not Found."
}
```

Production result: MISMATCH.

## Section 4: Reconciliation Matrix

| Metric | Firestore | Local API | Production API | Result |
| --- | ---: | ---: | ---: | --- |
| Orders | 5 | 5 | unavailable: 404 | MISMATCH |
| Revenue | 3732 | 3732 | unavailable: 404 | MISMATCH |
| Customers | 3 | 3 | unavailable: 404 | MISMATCH |
| Loyalty | 3 | 3 | unavailable: 404 | MISMATCH |

Final result: MISMATCH.

## Section 5: Dashboard Verification

Local runtime source: authenticated `/api/owner/analytics`

| Dashboard Metric | Runtime Value | Firestore | Result |
| --- | ---: | ---: | --- |
| Dashboard Revenue | 3732 | 3732 | MATCH |
| Dashboard Orders | 5 | 5 | MATCH |
| Dashboard Customers | 3 | 3 | MATCH |
| Dashboard Loyalty | 3 | 3 | MATCH |

Production dashboard verification: blocked because production does not expose `/api/owner/analytics` and returns 404.

Browser-rendered dashboard automation was not available because `node_modules/@playwright/test` is not installed.

## Section 6: Reports Verification

Local runtime source: authenticated `/api/owner/analytics`

| Reports Metric | Runtime Value | Firestore | Result |
| --- | ---: | ---: | --- |
| Orders | 5 | 5 | MATCH |
| Revenue | 3732 | 3732 | MATCH |
| Customers | 3 | 3 | MATCH |
| Loyalty | 3 | 3 | MATCH |

Production reports verification: blocked because production does not expose `/api/owner/analytics` and returns 404.

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
| Revenue | 3732 |

Production diagnostics: blocked because `/api/owner/system-diagnostics` returns 404.

## Section 8: Hostinger Validation

| Field | Value |
| --- | --- |
| Current local branch | `main` |
| Current local SHA | `f70687d08cc5d8c9c1974c566cbf1d718e7773b3` |
| Production release branch | `release/production-nammude` |
| Production build commit | `unknown` |
| Production build date | `2026-06-23T10:13:29.763Z` |
| Repaired production APIs present | NO |

Is Hostinger running the latest repaired code? NO.

Evidence: owner login works in production, but `/api/owner/analytics`, `/api/owner/system-diagnostics`, and `/api/owner/customers` all return 404.

## Section 9: Firestore Permission Errors

Current status: NOT VERIFIED as fixed.

| Collection | Query | Rule | Result |
| --- | --- | --- | --- |
| Unknown production browser listener | Browser console previously showed `Missing or insufficient permissions` | Not captured in current run | OPEN |
| `customerTransactions` | Repository/API intended access | Local `firestore.rules` updated | Not deployed/verified in production |
| `loyaltyRules` | Repository/API intended access | Local `firestore.rules` updated | Not deployed/verified in production |

Result: OPEN until a production browser console check proves the listener error is gone or identifies the exact denied query.

## Section 10: Customer Module Validation

Local `/api/owner/customers`:

| Customer | Orders | Spend | Loyalty |
| --- | ---: | ---: | ---: |
| TriCore Events | 3 | 1756 | 17 |
| Scheduled Customer | 1 | 1488 | 14 |
| Demo Customer | 1 | 488 | 4 |

Customer count: 3.

Production `/api/owner/customers`: 404, not deployed.

## Section 11: Final Status Table

| Item | Status |
| --- | --- |
| Repository Layer | Completed locally |
| Backfill | Completed |
| CRM Records | Completed locally |
| Loyalty Records | Completed locally |
| Analytics API | Local MATCH, production 404 |
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
