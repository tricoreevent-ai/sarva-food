# Active Orders Performance Report

Date: 2026-07-27T08:12:25.252Z

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
| Kitchen 100-order filter/sort | 0.64ms | 0.91ms | 1.50ms | <100ms update |
| Kitchen snapshot reconciliation | 0.03ms | 0.10ms | 0.61ms | <100ms update |
| POS 1000-item category switch | 0.10ms | 0.20ms | 0.72ms | <50ms switch |
| POS 1000-item search filter | 0.18ms | 0.34ms | 0.82ms | debounced |
| Active Orders 100-order filter/group | 0.27ms | 0.39ms | 0.92ms | <50ms interaction |

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
| / | 18 | 481 KB | 193 KB | 250 KB | Over |
| /restaurants | 20 | 510 KB | 193 KB | - | Tracked |
| /checkout | 27 | 615 KB | 193 KB | - | Tracked |
| /orders | 21 | 538 KB | 193 KB | - | Tracked |
| /profile | 25 | 578 KB | 193 KB | 250 KB | Over |
| /owner | 28 | 631 KB | 193 KB | 350 KB | Over |
| /owner/orders | 33 | 775 KB | 193 KB | 500 KB | Over |
| /owner/settings | 32 | 757 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 31 | 736 KB | 193 KB | - | Tracked |
| /owner/pos | 29 | 636 KB | 193 KB | 650 KB | Pass |
| /admin | 23 | 540 KB | 193 KB | - | Tracked |
