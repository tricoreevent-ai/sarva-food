# Post Deployment Checklist

Feature ID: `RC5-SYNCHRONIZED-READINESS`

## Required Before This Checklist Can Pass

- Hostinger `/api/release-info` must report `deploymentEnvironment: production`.
- Hosted SHA must match the final committed RC5 candidate.
- `npm run validate:prod-env` must pass in production-equivalent env.
- Lighthouse mobile/desktop and authenticated browser/device/provider/printer smoke must be recorded.

## Metadata

- `/api/release-info` returns final SHA.
- `applicationVersion` is `v1.0.0-rc5`.
- `deploymentEnvironment` is `production`.
- `publicAppUrl` is the final HTTPS domain.
- Plugin flags are disabled unless approved.

## Health

- `/health/live` returns healthy.
- `/health/ready` returns healthy.
- `/health/startup` returns healthy.
- Firestore connectivity is healthy.
- Storage is configured.
- SMTP is configured.
- Cloudinary is configured.
- Firebase public/admin config is complete.
- Razorpay status matches launch plan.

## Browser Smoke

- Customer browse, cart, checkout, order success, tracking.
- Owner login, dashboard, active orders, settings, logout.
- Kitchen accept, prepare, ready, serve, print KOT.
- POS draft, KOT, payment, receipt, history.
- Admin login, diagnostics, CMS, menu library.
- QR scan, table session, order/request flow.

## Device Smoke

- Desktop Chrome/Edge.
- Android Chrome.
- iPhone Safari.
- Tablet layout.
- Kitchen TV/tablet.
- Cashier tablet.
- QR scanner.
- Barcode scanner if used.
- Thermal printer.
- Receipt printer.
- Kitchen printer.

## Performance

- Lighthouse mobile/desktop.
- Core Web Vitals.
- Chrome Performance trace.
- Chrome Coverage.
- Browser heap/memory.
- Long task review.
- Network waterfall review.
