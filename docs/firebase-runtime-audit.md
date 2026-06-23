# Firebase Runtime Audit

Status: In progress. This report does not mark data parity complete.

Captured on 2026-06-23 from the running localhost bundle and the deployed Hostinger JavaScript bundle. Public Firebase configuration is intentionally visible to browser clients; API keys are not repeated here.

## Runtime Comparison

| Value | Localhost runtime | Hostinger runtime | Match |
| --- | --- | --- | --- |
| Project ID | `sarva-food-app` | `sarva-food-app` | Yes |
| App ID | `1:488410799126:web:04386fab3760927f066937` | `1:488410799126:web:04386fab3760927f066937` | Yes |
| Auth domain | `sarva-food-app.firebaseapp.com` | `sarva-food-app.firebaseapp.com` | Yes |
| Storage bucket | `sarva-food-app.firebasestorage.app` | `sarva-food-app.firebasestorage.app` | Yes |
| Messaging sender ID | `488410799126` | `488410799126` | Yes |
| Firestore database | `(default)` | `(default)` client SDK default | Yes |
| Firestore emulator | `false` | `false` | Yes |

## Evidence

- Localhost application: `http://localhost:3000`, Next development bundle:
  `.next/dev/static/chunks/app/page.js`.
- Production application: `https://violet-squid-380447.hostingersite.com`, deployed bundle:
  `/_next/static/chunks/4084-d8545a28c9a6f05e.js`.
- Local server Admin SDK fallback: `service-account-key.json` has `project_id:
  sarva-food-app`.
- Both local and production `/api/release-info` returned the same release marker on
  2026-06-23. Both currently report `buildCommit: "unknown"`, so this endpoint
  cannot prove an exact source commit.

## Finding

**Same public Firebase project: YES.**

The local browser bundle, deployed browser bundle, and local Admin service-account
target all resolve to `sarva-food-app`. The original hypothesis that localhost uses
a different public Firebase project is disproven by runtime evidence.

## Remaining Server-Side Limitation

Hostinger's private Admin SDK credentials cannot be extracted from a public browser
bundle. The authenticated Admin Firebase Diagnostics route can prove the production
Admin SDK project, but requires an Admin session. Until that check is run, full
client-plus-server parity remains unproven.

## Repository Risk

`.env.hostinger.example` targets `sarva-food-app`, while
`.env.production.example` still contains `sarva-food-production`. The latter is
not the deployed runtime value, but it is a deployment risk and must not be used
for Hostinger.
