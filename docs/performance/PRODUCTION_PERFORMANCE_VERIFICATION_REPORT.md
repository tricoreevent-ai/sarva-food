# Production Performance Verification Report

Generated: 2026-08-10T09:48:43.427Z

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
| target:url | PASS | https://violet-squid-380447.hostingersite.com |
| bundle:tracked-route-js | PASS | /owner/settings 816 KB / budget 1200 KB |
| bundle:static-js-total | PASS | 9668 KB built JS total; informational, not first-load budget. |
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
| staticFiles | 427 |
| staticJsKb | 9668 |
| staticCssKb | 195 |
| routeCount | 105 |
| maxRoute | /handler/[...stack] 2000 KB JS / 195 KB CSS |
| maxTrackedRoute | /owner/settings 816 KB JS / 195 KB CSS |

## Tracked Routes

| Route | JS KB | CSS KB | Chunks |
| --- | --- | --- | --- |
| / | 491 | 195 | 22 |
| /owner | 655 | 195 | 32 |
| /owner/kitchen | 772 | 195 | 35 |
| /owner/orders | 808 | 195 | 37 |
| /owner/pos | 660 | 195 | 33 |
| /owner/settings | 816 | 195 | 38 |
| /profile | 592 | 195 | 29 |
