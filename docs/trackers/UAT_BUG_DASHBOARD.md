# RC6.5 UAT Bug Dashboard

Release: `v1.0.0-rc6.5`
Freeze status: Active
Production URL: `https://violet-squid-380447.hostingersite.com`
Current production SHA at dashboard creation: `509679d2c0d1e6ce5a3a315369f799a79700006c`

## Release Readiness

| Metric | Count |
| --- | ---: |
| Total bugs | 0 |
| Open bugs | 0 |
| Closed bugs | 0 |
| Critical bugs | 0 |
| High bugs | 0 |
| Regression bugs | 0 |
| Release blockers | 0 |

Current decision: `GO for UAT`, `NO-GO for public launch until UAT/provider/device/hardware gates pass`.

## Bug Register

| Bug ID | Module | Environment | Device | Browser | Severity | Status | Root Cause | Files Changed | Validation | Regression Risk | Commit SHA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _None reported yet_ |  |  |  |  |  |  |  |  |  |  |  |

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
