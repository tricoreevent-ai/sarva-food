# RC6.12 Release Freeze

Release: `v1.0.0-rc6.5`
Freeze status: Active
Production SHA at freeze entry: `509679d2c0d1e6ce5a3a315369f799a79700006c`

## Freeze Rule

No new features, UX redesigns, architecture changes, or general refactors are permitted during Production UAT.

Only verified UAT defects may be fixed.

## Allowed Changes

- Reproducible production bug fixes.
- Release documentation updates.
- Test evidence updates.
- Targeted validation scripts or reports required to prove a bug fix.

## Blocked Changes

- New features.
- New workflows.
- UI redesigns.
- Architecture rewrites.
- Opportunistic cleanup.
- Dependency upgrades unless required to fix a verified blocker.
- Firestore schema/rule/index changes unless the UAT bug proves they are required.

## UAT Bug Intake Template

| Field | Required Value |
| --- | --- |
| Bug ID | `UAT-YYYYMMDD-###` |
| Module | Customer / Owner / Kitchen / POS / Reports / Settings / Provider / Other |
| Environment | Production URL, release SHA, app version |
| Device | Android / iPhone / Tablet / Desktop / Kitchen display / Printer |
| Browser | Chrome / Edge / Safari / Firefox / PWA |
| Severity | Critical / High / Medium / Low / Cosmetic |
| Reproduction Steps | Exact numbered steps |
| Expected Result | What should happen |
| Actual Result | What happened |
| Evidence | Screenshot, video, logs, order id, timestamp |
| Root Cause | Required before fix |
| Files Changed | Required after fix |
| Validation Performed | Targeted checks and affected workflows |
| Regression Risk | Low / Medium / High with reason |
| Commit SHA | Required after fix |

## Fix Policy

A fix may start only when all are true:

1. The issue is reproducible or supported by enough production evidence to identify the failing path.
2. The root cause is identified.
3. The proposed change is the smallest safe repository change.
4. No unrelated feature, redesign, or refactor is included.
5. Targeted regression validation is defined before implementation.

## Regression Requirement

Every UAT bug fix must include:

- Targeted regression tests.
- Affected operational workflow check.
- Role/permission check when role-based.
- Realtime/counter/report check when order-state related.
- `git diff --check`.
- At least one of `npm run typecheck`, `npm run lint`, `npm run build`, or `npm run smoke:operational`, selected by risk.

## Release Readiness Rule

Production launch remains `NO-GO` while any Critical or High UAT bug is open.

Medium, Low, and Cosmetic bugs may be accepted only with explicit owner sign-off and documented workaround.
