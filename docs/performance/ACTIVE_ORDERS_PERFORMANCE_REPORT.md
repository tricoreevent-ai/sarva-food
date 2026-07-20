# Active Orders Performance Report

Date: 2026-07-20T06:49:20.172Z

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
| Kitchen 100-order filter/sort | 0.32ms | 0.40ms | 1.53ms | <100ms update |
| Kitchen snapshot reconciliation | 0.02ms | 0.04ms | 0.32ms | <100ms update |
| POS 1000-item category switch | 0.05ms | 0.10ms | 0.21ms | <50ms switch |
| POS 1000-item search filter | 0.08ms | 0.14ms | 0.35ms | debounced |
| Active Orders 100-order filter/group | 0.14ms | 0.21ms | 0.44ms | <50ms interaction |

## Density And Runtime Controls

| Area | Result |
| --- | --- |
| Desktop density | 4 columns at desktop, 5 at 2XL, and 6 at 1920px; the fixed-height cards-only viewport is designed to expose at least 20 collapsed orders without page growth. |
| Card work | Collapsed cards build only the operational summary and action bar; details, timelines, notes, and history mount on expansion. |
| Interaction | Expansion is immediate and uses no height animation. Search is debounced 120ms and grouping is a single memoized pass. |
| Actions | Serve, Notify Waiter, Payment, Print, Preview, and More remain visible while collapsed. |
| Phase 5C Kitchen cards | Item-first cards keep memoized card boundaries, lazy More/Preview details, icon actions, and corrected virtual row sizing; no new listener or animation work was added. |
| Browser gate | Chrome and React DevTools are available, but flame graphs/FPS/INP need a valid authenticated production-equivalent owner session. |

## Route Snapshot

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |
| / | 17 | 463 KB | 193 KB | 250 KB | Over |
| /restaurants | 19 | 497 KB | 193 KB | - | Tracked |
| /checkout | 26 | 589 KB | 193 KB | - | Tracked |
| /orders | 20 | 514 KB | 193 KB | - | Tracked |
| /profile | 23 | 553 KB | 193 KB | 250 KB | Over |
| /owner | 27 | 584 KB | 193 KB | 350 KB | Over |
| /owner/orders | 32 | 711 KB | 193 KB | 500 KB | Over |
| /owner/settings | 31 | 699 KB | 193 KB | 300 KB | Over |
| /owner/kitchen | 30 | 666 KB | 193 KB | - | Tracked |
| /owner/pos | 28 | 589 KB | 193 KB | 650 KB | Pass |
| /admin | 21 | 504 KB | 193 KB | - | Tracked |
