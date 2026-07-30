# RC6.5 UAT Bug Dashboard

Release: `v1.0.0-rc6.5`
Freeze status: Active
Production URL: `https://violet-squid-380447.hostingersite.com`
Current production SHA at dashboard creation: `509679d2c0d1e6ce5a3a315369f799a79700006c`

## Release Readiness

| Metric | Count |
| --- | ---: |
| Total bugs | 3 |
| Open bugs | 0 |
| Closed bugs | 3 |
| Critical bugs | 0 |
| High bugs | 3 |
| Regression bugs | 0 |
| Release blockers | 0 |

Current decision: `GO for UAT`, `NO-GO for public launch until UAT/provider/device/hardware gates pass`.

## Bug Register

| Bug ID | Module | Environment | Device | Browser | Severity | Status | Root Cause | Files Changed | Validation | Regression Risk | Commit SHA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-RC6.13-001 | Active Orders filter navigation | Production UAT / repository | Desktop, tablet, mobile | Chrome-family visual report | High | Closed | Shared filter bar forced every chip into one horizontal nowrap row and rendered long insight labels inside chips, causing overlap/clipping at scale. | `src/components/orders/order-classification-bar.tsx`, `src/lib/order-classification.ts` | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` | Low: shared component only; no workflow/API/state/listener changes. | This commit |
| UAT-RC6.14-001 | Active Orders filter navigation | Production UAT / repository | Desktop, tablet, mobile | Chrome-family visual report | High | Closed | Rare filter disclosure still lived inside the chip row and zero-count critical/delayed states stayed visible, leaving the navigation less scalable at high filter counts. | `src/components/orders/order-classification-bar.tsx` | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` | Low: shared component only; no workflow/API/state/listener changes. | This commit |
| UAT-RC6.15-001 | Active Orders filter navigation | Production UAT / repository | Desktop, tablet, mobile | Chrome-family visual report | High | Closed | Previous layout still treated too many filters as visible peers, increasing scan cost and vertical footprint as filter counts grow. | `src/components/orders/order-classification-bar.tsx` | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` | Low: shared component only; no workflow/API/state/listener changes. | This commit |

## Status Values

- Open
- Reproducing
- Root Cause Found
- Fixing
- Fixed Pending Validation
- Closed
- Deferred With Sign-Off

## Severity Rules

| Severity | Definition | Release Impact |
| --- | --- | --- |
| Critical | Data loss, payment/accounting corruption, privilege escalation, order loss, production outage | Blocks release |
| High | Core customer/owner/kitchen/waiter/POS workflow blocked | Blocks release |
| Medium | Operational issue with workaround | Requires triage/sign-off |
| Low | Minor workflow issue, low frequency | Track for post-release if accepted |
| Cosmetic | Visual-only issue with no workflow impact | Does not block unless brand-breaking |

## UAT Iteration Report Template

```markdown
## Bugs Fixed

## Root Cause

## Validation

## Regression Check

## Commit SHA

## Release Readiness

## GO / NO-GO
```
