# Production Performance Verification Report

Generated: 2026-07-15T11:57:51.319Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 4 |
| WARNING | 0 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 2 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| target:url | PASS | http://localhost:3000 |
| bundle:tracked-route-js | PASS | /owner/orders 697 KB / budget 1200 KB |
| bundle:static-js-total | PASS | 8837 KB built JS total; informational, not first-load budget. |
| bundle:analyzer-client | PASS | .next/analyze/client.html is present and usable. |
| lighthouse:desktop | MANUAL | Chrome/Lighthouse unavailable or RUN_LIGHTHOUSE=1 not set. |
| lighthouse:mobile | MANUAL | Run with RUN_LIGHTHOUSE=1 PRODUCTION_URL=https://... |

## Budgets

| Metric | Budget |
| --- | --- |
| desktopPerformance | 0.95 |
| mobilePerformance | 0.9 |
| lcpMs | 2500 |
| cls | 0.1 |
| inpMs | 200 |
| ttfbMs | 800 |
| routeJsKb | 1200 |

## Bundle Snapshot

| Metric | Value |
| --- | --- |
| staticFiles | 398 |
| staticJsKb | 8837 |
| staticCssKb | 191 |
| routeCount | 103 |
| maxRoute | /handler/[...stack] 1971 KB JS / 191 KB CSS |
| maxTrackedRoute | /owner/orders 697 KB JS / 191 KB CSS |

## Tracked Routes

| Route | JS KB | CSS KB | Chunks |
| --- | --- | --- | --- |
| / | 462 | 191 | 19 |
| /owner | 576 | 191 | 29 |
| /owner/kitchen | 651 | 191 | 32 |
| /owner/orders | 697 | 191 | 34 |
| /owner/pos | 581 | 191 | 30 |
| /owner/settings | 690 | 191 | 33 |
| /profile | 553 | 191 | 25 |
