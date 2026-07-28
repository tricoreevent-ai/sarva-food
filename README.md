# Food Gedi Production Release

Food Gedi is a direct restaurant-to-customer food ordering platform. This release branch is intended for production deployment and keeps the public application name hardcoded/fallback-safe as `Food Gedi`.

## Documentation Hub

Start at `docs/README.md` for trackers, release evidence, deployment guides, validation reports, performance reports, plugin documentation, and runbooks.

Future AI agents must read `docs/AI_HANDOFF.md` before making repository changes.

## Release Branch

Use `release/production-nammude` for Hostinger production deployments.

Recommended Hostinger settings:

- Framework preset: `Next.js`
- Branch: `release/production-nammude`
- Root directory: `./`
- Build command: `npm run build`
- Package manager: `npm`
- Output directory: `.next`
- Node version: `22.x`

Required public branding environment values:

```env
NEXT_PUBLIC_APP_NAME=Food Gedi
NEXT_PUBLIC_BRAND_NAME=Food Gedi
```

After each deployment, clear Hostinger cache and verify the hosted HTML, manifest, and header show `Food Gedi`.

Verify the active deployment with:

```text
https://mistyrose-butterfly-740173.hostingersite.com/api/release-info
```

The response must include:

```json
{
  "appName": "Food Gedi",
  "releaseBranch": "release/production-nammude",
  "releaseMarker": "nammude-production-release"
}
```

## Local Verification

Run these before pushing release changes:

```powershell
npm run typecheck
npm run lint
npm run build
```

## Branding Rule

Do not use the old product name in application UI, metadata, email templates, manifests, seed defaults, or release documentation. Infrastructure identifiers such as Firebase project ids, repository names, cache keys, and legacy file names may remain only when changing them would break deployed services.

## Production Notes

- Public pages are dynamic/no-store guarded to avoid stale Hostinger prerendered HTML.
- Owner-configured CMS branding is normalized so old saved app-name values resolve to `Food Gedi`.
- Static assets remain cacheable; clear Hostinger cache after a release.
