# Production Performance Verification Report

Generated: 2026-07-13T06:23:52.966Z

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
| target:url | PASS | https://violet-squid-380447.hostingersite.com |
| bundle:tracked-route-js | WARNING | /owner/orders 1246 KB / budget 1200 KB |
| bundle:static-js-total | PASS | 8776 KB built JS total; informational, not first-load budget. |
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
| staticFiles | 394 |
| staticJsKb | 8776 |
| staticCssKb | 190 |
| routeCount | 102 |
| maxRoute | /handler/[...stack] 1968 KB JS / 190 KB CSS |
| maxTrackedRoute | /owner/orders 1246 KB JS / 190 KB CSS |

## Tracked Routes

| Route | JS KB | CSS KB | Chunks |
| --- | --- | --- | --- |
| / | 459 | 190 | 19 |
| /owner | 571 | 190 | 29 |
| /owner/kitchen | 647 | 190 | 32 |
| /owner/orders | 1246 | 190 | 42 |
| /owner/pos | 576 | 190 | 30 |
| /owner/settings | 685 | 190 | 33 |
| /profile | 549 | 190 | 25 |
