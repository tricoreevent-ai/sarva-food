# Food Gedi Release Utilities

All release utilities live in `scripts/release`.

## How to Commit

Run:

```bat
scripts\release\git-commit-push.bat
```

The script detects the current branch, shows status, prompts for a commit message, commits changes, and pushes.

## How to Push

Run:

```bat
scripts\release\git-push-only.bat
```

It detects the current branch and pushes it to `origin`.

## How to Deploy

Use `deploy-checklist.md`.

Minimum deployment path:

1. Configure production env values.
2. Run `npm run validate:prod-env` in a production-equivalent environment.
3. Deploy the latest release branch commit on Hostinger.
4. Clear cache and restart/redeploy.
5. Verify `/api/release-info` and smoke routes.

## How to Validate

Run:

```bat
scripts\release\release-check.bat
```

This runs typecheck, lint, build, `git diff --check`, and regenerates `release-report.md`.

To validate production environment variables directly:

```bat
node scripts\release\validate-production.js
```

For a repository-side hardening scan:

```bat
npm run audit:release
```

The report is written to `docs/validation/repository-hardening-audit.md`.

Health endpoints after deployment:

```bat
curl.exe https://violet-squid-380447.hostingersite.com/health/live
curl.exe https://violet-squid-380447.hostingersite.com/health/ready
curl.exe https://violet-squid-380447.hostingersite.com/health/startup
```

## How to Rollback

1. Keep the last known-good deployment SHA.
2. Restore the previous Hostinger deployment or redeploy the previous SHA.
3. Restore prior environment values if deployment changed env.
4. Clear cache.
5. Verify `/api/release-info`, login, POS, Kitchen, QR, and Admin routes.

## How to Regenerate Release Report

Run:

```bat
scripts\release\release-check.bat
```

The report is written to `scripts\release\release-report.md`.

## How to Perform Smoke Testing

Use `production-smoke-test.md`.

Mark Pass, Fail, and Remarks for each workflow before production launch.

## How to Verify Production

Use both:

- `deploy-checklist.md`
- `production-smoke-test.md`

Release is production-ready only after validation commands pass and manual infrastructure, provider, hardware, browser, and multi-device checks are complete.
