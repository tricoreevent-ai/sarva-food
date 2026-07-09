# Post Deployment Checklist

Feature ID: `RC1-PRODUCTION-GO-LIVE`

## Metadata

- `/api/release-info` returns final SHA.
- `applicationVersion` is `v1.0.0-rc4`.
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
