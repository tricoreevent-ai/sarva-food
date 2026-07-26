# Active Orders Performance Report

Date: 2026-07-26T10:09:15.417Z

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
| Kitchen 100-order filter/sort | 0.79ms | 1.18ms | 3.93ms | <100ms update |
| Kitchen snapshot reconciliation | 0.07ms | 0.16ms | 1.07ms | <100ms update |
| POS 1000-item category switch | 0.13ms | 0.25ms | 4.18ms | <50ms switch |
| POS 1000-item search filter | 0.25ms | 0.55ms | 1.17ms | debounced |
| Active Orders 100-order filter/group | 0.34ms | 0.89ms | 1.80ms | <50ms interaction |

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
| / | 17 | 465 KB | 198 KB | 250 KB | Over |
| /restaurants | 19 | 495 KB | 198 KB | - | Tracked |
| /checkout | 26 | 599 KB | 198 KB | - | Tracked |
| /orders | 20 | 523 KB | 198 KB | - | Tracked |
| /profile | 24 | 563 KB | 198 KB | 250 KB | Over |
| /owner | 28 | 609 KB | 198 KB | 350 KB | Over |
| /owner/orders | 33 | 746 KB | 198 KB | 500 KB | Over |
| /owner/settings | 32 | 735 KB | 198 KB | 300 KB | Over |
| /owner/kitchen | 31 | 714 KB | 198 KB | - | Tracked |
| /owner/pos | 29 | 614 KB | 198 KB | 650 KB | Pass |
| /admin | 21 | 513 KB | 198 KB | - | Tracked |
