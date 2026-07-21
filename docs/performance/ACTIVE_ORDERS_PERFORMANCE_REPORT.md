# Active Orders Performance Report

Date: 2026-07-21T12:21:43.575Z

## Root Cause

The POS Active Orders panel kept expansion state in the parent and rendered up to 30 un-memoized nested accordions. Every expansion rebuilt each card's workflow, arrays, action objects, callbacks, timelines, and Framer Motion height animation.

## Render Scope

| Interaction | Before | After | Reduction | Measurement |
| --- | --- | --- | --- | --- |
| Open one of 30 cards | 30 card renders | 1 card render | 96.7% | Deterministic memo invalidation scope |
| Switch expanded card | 30 card renders | 2 card renders | 93.3% | Deterministic memo invalidation scope |

## Synthetic CPU

| Scenario | p50 | p95 | Max | Budget |
| --- | --- | --- | --- | --- |
| Kitchen 100-order filter/sort | 0.38ms | 0.47ms | 1.84ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.06ms | 0.33ms | <100ms update |
| POS 1000-item category switch | 0.06ms | 0.11ms | 0.25ms | <50ms switch |
| POS 1000-item search filter | 0.09ms | 0.16ms | 0.42ms | debounced |
| Active Orders 100-order filter/group | 0.16ms | 0.24ms | 0.57ms | <50ms interaction |

## Density And Runtime Controls

| Area | Result |
| --- | --- |
| Desktop density | 4 columns at desktop, 5 at 2XL, and 6 at 1920px; the fixed-height cards-only viewport is designed to expose at least 20 collapsed orders without page growth. |
| Card work | Collapsed cards build only the operational summary and action bar; details, timelines, notes, and history mount on expansion. |
| Interaction | Expansion is immediate and uses no height animation. Search is debounced 120ms and grouping is a single memoized pass. |
| Actions | Serve, Ready Signal, Payment, Print, Preview, and More remain visible while collapsed. |
| Hardening impact | Split Bill and Smart Bill Merge guard changes are O(1), add no dependency/listener, and do not widen card render scope. |
| Browser gate | Chrome and React DevTools are available, but flame graphs/FPS/INP need a valid authenticated production-equivalent owner session. |

## Route Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 198 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 198 KB | - | Tracked |
| /checkout | 26 | 589 KB | 198 KB | - | Tracked |
| /orders | 20 | 514 KB | 198 KB | - | Tracked |
| /profile | 23 | 553 KB | 198 KB | 250 KB | Over |
| /owner | 27 | 586 KB | 198 KB | 350 KB | Over |
| /owner/orders | 32 | 713 KB | 198 KB | 500 KB | Over |
| /owner/settings | 31 | 706 KB | 198 KB | 300 KB | Over |
| /owner/kitchen | 30 | 694 KB | 198 KB | - | Tracked |
| /owner/pos | 28 | 591 KB | 198 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 198 KB | - | Tracked |
