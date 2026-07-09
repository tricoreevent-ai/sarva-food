# Production Performance Verification Report

Generated: 2026-07-08T17:24:06.692Z

## Summary

| Status | Count |
| --- | --- |
| PASS | 3 |
| WARNING | 1 |
| ERROR | 0 |
| FAIL | 0 |
| MANUAL | 2 |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| target:url | PASS | http://localhost:3000 |
| bundle:tracked-route-js | WARNING | /owner/orders 1246 KB / budget 1200 KB |
| bundle:static-js-total | PASS | 8847 KB built JS total; informational, not first-load budget. |
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
| staticFiles | 393 |
| staticJsKb | 8847 |
| staticCssKb | 191 |
| routeCount | 102 |
| maxRoute | /handler/[...stack] 1968 KB JS / 191 KB CSS |
| maxTrackedRoute | /owner/orders 1246 KB JS / 191 KB CSS |

## Tracked Routes

| Route | JS KB | CSS KB | Chunks |
| --- | --- | --- | --- |
| / | 459 | 191 | 19 |
| /owner | 561 | 191 | 27 |
| /owner/kitchen | 642 | 191 | 30 |
| /owner/orders | 1246 | 191 | 40 |
| /owner/pos | 565 | 191 | 28 |
| /owner/settings | 674 | 191 | 31 |
| /profile | 548 | 191 | 25 |
