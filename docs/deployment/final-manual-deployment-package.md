# Final Manual Deployment Package

Release: `v1.0.0-rc5` candidate; existing `v1.0.0-rc4` tag remains immutable
Branch: `release/production-nammude`
Current pushed baseline: `2b8a348c416b0d952ab80d80083202280548c4d9`
Runtime release commit: final pushed RC5 commit after local gates pass
Final repository certification commit: final RC5 validation commit after local gates pass
Release tag: keep `v1.0.0-rc4` unchanged; create immutable `v1.0.0-rc5` on the final committed candidate.

## Files Changed

- `package.json`, `package-lock.json`
- `.env.example`, `.env.production.example`, `.env.hostinger.example`
- `src/lib/release.ts`
- `src/app/api/release-info/route.ts`
- `src/lib/env.ts`
- `src/lib/server/table-qr.ts`
- `src/lib/server/public-cache.ts`
- `src/lib/server/public-firestore.ts`
- `src/lib/server/public-outage-alert.ts`
- `src/components/firebase/firestore-store-hydrator.tsx`
- `src/lib/DataConsistencyAudit.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/customer/account/route.ts`
- `src/app/api/customer/orders/route.ts`
- `src/app/api/public/order-notification/route.ts`
- `src/app/api/public/reviews/route.ts`
- `src/app/api/payments/razorpay/webhook/route.ts`
- `src/app/api/admin/system-diagnostics/route.ts`
- `src/app/api/admin/firebase-diagnostics/route.ts`
- `src/lib/server/request-trace.ts`
- `src/lib/server/production-logger.ts`
- `src/lib/server/api-response.ts`
- `src/lib/server/production-health.ts`
- `src/app/health/live/route.ts`
- `src/app/health/ready/route.ts`
- `src/app/health/startup/route.ts`
- `src/lib/server/operational-logging.ts`
- `src/lib/server/owner-api-access.ts`
- `src/lib/server/module-auth.ts`
- `src/app/api/owner/orders/route.ts`
- `src/app/api/owner/pos/route.ts`
- `src/app/api/owner/kitchen/route.ts`
- `src/app/api/owner/kitchen/stream/route.ts`
- `src/app/api/owner/system-diagnostics/route.ts`
- `src/app/api/owner/master-menu-templates/route.ts`
- `src/app/api/owner/loyalty-rules/route.ts`
- `src/app/api/owner/tables/route.ts`
- `src/app/api/owner/analytics/route.ts`
- `src/app/api/owner/customers/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/email-otp/route.ts`
- `src/app/api/payments/razorpay/order/route.ts`
- `src/app/api/payments/razorpay/verify/route.ts`
- `src/app/api/payments/razorpay/refund/route.ts`
- `scripts/validate-production-env.mjs`
- `scripts/release/repository-hardening-audit.mjs`
- `docs/validation/repository-hardening-audit.md`
- `scripts/release/validate-production.js`
- `scripts/release/release-report.md`
- `docs/deployment/production-environment-matrix.md`
- `docs/deployment/final-manual-deployment-package.md`
- `docs/architecture/production-runbook.md`
- `docs/trackers/changelog.md`
- `docs/release/RELEASE_NOTES.md`
- `docs/deployment/HOSTINGER_DEPLOYMENT_GUIDE.md`
- `docs/architecture/api-documentation.md`
- `docs/validation/final-repository-certification-report.md`
- `docs/trackers/MASTER_IMPLEMENTATION_TRACKER.md`

## Configuration Changes

- Release version is `v1.0.0-rc5`.
- Package version is `1.0.0-rc.5`.
- Keep existing `v1.0.0-rc1`, `v1.0.0-rc2`, and `v1.0.0-rc3` immutable; deploy the final pushed `release/production-nammude` commit.
- `NEXT_PUBLIC_APP_VERSION` must be `v1.0.0-rc5` in production.
- Health metadata now falls back to production-safe environment labels when app env is absent.
- Admin owner credential actions no longer return generated temporary passwords to the browser.
- Public no-store health endpoints are available at `/health/live`, `/health/ready`, and `/health/startup`.
- `TABLE_QR_SECRET` is required in production and must be at least 32 characters.
- `scripts/release/validate-production.js` now delegates to `scripts/validate-production-env.mjs`.

## Environment Variables Required

Use `docs/deployment/production-environment-matrix.md` and `.env.hostinger.example`.

Minimum production validation command:

```bat
cmd /c npm run validate:prod-env
```

Latest local result: `46` pass, `1` warning, `24` errors because this workspace does not have real production Hostinger/Firebase/Razorpay secrets or HTTPS production env values.

Latest hosted provider verification result: `8` pass, `0` errors, `3` manual. Razorpay owner-scoped/live dashboard checks, WhatsApp/SMS/push, and live provider sends/webhooks remain external/manual.

Latest hosted deployment verification result: `15` pass, `1` warning, `1` error because Hostinger still reports `deploymentEnvironment=development`.

## Firebase Deployment Commands

```bat
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only firestore:indexes
```

Optional full Firebase deploy, only after rules/index review:

```bat
npx firebase-tools deploy
```

## Hostinger Deployment Sequence

1. Select the production Hostinger site.
2. Set branch `release/production-nammude`.
3. Configure production env from `.env.hostinger.example`.
4. Confirm `NEXT_PUBLIC_APP_ENV=production`.
5. Confirm `NEXT_PUBLIC_APP_VERSION=v1.0.0-rc5`.
6. Confirm `NEXT_PUBLIC_APP_URL` is the final HTTPS domain.
7. Deploy the final pushed `release/production-nammude` commit.
8. Restart the Node app after env changes.
9. Verify `/api/release-info`.

## Cache Clearing Sequence

1. Clear Hostinger/application cache.
2. Hard-refresh `/`.
3. Recheck `/api/release-info`.
4. Recheck `/robots.txt`, `/sitemap.xml`, `/manifest.json`.

## Production Verification Commands

```bat
cmd /c npm run typecheck
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run smoke:operational
cmd /c npm run audit:release
cmd /c npm run validate:prod-env
git diff --check
```

Health endpoint smoke after redeploy:

```bat
curl.exe -I https://violet-squid-380447.hostingersite.com/health/live
curl.exe -I https://violet-squid-380447.hostingersite.com/health/ready
curl.exe -I https://violet-squid-380447.hostingersite.com/health/startup
```

Hosted:

```bat
scripts\release\production-verify.bat
```

## Rollback Commands

```bat
git switch release/production-nammude
git tag --list
git log --oneline -5
git revert <bad_commit_sha>
git push origin release/production-nammude
```

Hostinger rollback:

1. Redeploy the previous known-good SHA.
2. Restore previous env values if changed.
3. Restart the Node app.
4. Clear cache.
5. Verify `/api/release-info`, `/owner/login`, `/owner/pos`, `/owner/kitchen`, `/admin/login`.

## Browser Smoke Checklist

- Customer discovery, restaurant detail, menu, cart, checkout, order success, tracking, profile.
- Owner login, dashboard, order desk, notifications, view switch, menu, tables, settings.
- POS draft, send KOT, active orders, payment, bill/receipt print.
- Kitchen realtime, status changes, filters, sound, KOT preview/reprint.
- Admin login, CMS, restaurants, users, diagnostics, Menu Library import/export.
- Mobile, tablet, desktop, and Kitchen TV layouts.

## Printer Smoke Checklist

- 58mm bill.
- 80mm receipt.
- A4 bill.
- KOT print.
- Duplicate bill.
- Split receipt.
- Reprint from print history.

## QR Smoke Checklist

- Generate table QR.
- Scan on mobile.
- Start session.
- Phone/OTP path.
- Place table order.
- Request waiter.
- End/extend/transfer session.
- Confirm `TABLE_QR_SECRET` remains stable across redeploy.

## Provider Smoke Checklist

- SMTP OTP, owner credential email, order email, outage alert.
- Firebase Auth customer/owner/admin login and Google authorized domain.
- Cloudinary signature, upload, and delivery.
- Razorpay order, verify, webhook, refund/settlement before live payments.
- WhatsApp Cloud API send/webhook before launch.
- Mapbox autocomplete/map surfaces.
- FCM foreground/background push after VAPID is configured.

## Lighthouse Checklist

- Redeploy current release commit first.
- Run mobile and desktop Lighthouse on production URL.
- Record LCP, CLS, INP/TBT, Speed Index, unused JS.
- Compare against `docs/performance/performance-audit.md`.
- Do not sign off performance against stale Hostinger metadata.

## Release Certification Checklist

- `v1.0.0-rc5` tag points to the final committed candidate after the existing RC4 tag remains unchanged.
- `/api/release-info` reports final SHA, branch, `deploymentEnvironment: production`, HTTPS public URL, and `applicationVersion: v1.0.0-rc5`.
- `/health/live`, `/health/ready`, and `/health/startup` return safe no-store health metadata with no exposed secrets.
- Production env validation passes with real Hostinger values.
- Firestore rules/indexes are deployed.
- Authenticated browser smoke passes.
- Provider smoke passes where provider launch is in scope.
- Printer/device/multi-device smoke passes.

## GO / NO-GO Rule

Recommendation remains `NO-GO` until Hostinger env/redeploy, Firebase rules/index deployment, authenticated browser smoke, provider smoke, and hardware smoke are complete.
