# Go Live Guide

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Preconditions

- Repository gates pass.
- Hostinger env validation passes with real production values.
- Hosted `/api/release-info` reports the final SHA, `v1.0.0-rc4`, and `deploymentEnvironment: production`.
- Firebase rules/indexes are deployed.
- Provider dashboard checks are complete.
- Manual browser/device/printer smoke passes.

## Deployment Steps

1. Confirm branch `release/production-nammude`.
2. Confirm final commit SHA.
3. Confirm env values in Hostinger.
4. Run `npm run validate:prod-env` in a production-equivalent environment.
5. Run `npm run test:enhancements`.
6. Run `npm run typecheck`.
7. Run `npm run lint`.
8. Run `npm run build`.
9. Run `npm run analyze`.
10. Push final commit.
11. Redeploy Hostinger from the final commit.
12. Clear Hostinger cache.
13. Verify health/release endpoints.
14. Run provider smoke.
15. Run authenticated browser smoke.
16. Run device/printer smoke.
17. Run Lighthouse/Core Web Vitals.
18. Record signoff.

## Required Hosted Checks

- `/`
- `/restaurants`
- `/checkout`
- `/api/release-info`
- `/health/live`
- `/health/ready`
- `/health/startup`
- `/owner/login`
- `/admin/login`
- Protected owner route redirect
- Protected owner API rejection without session

## Go-Live Decision

Current decision: `NO GO`.

Only change to `GO` after every manual/external gate is marked passed.
