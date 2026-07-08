# Plugin Validation and QA

Feature ID: `PH2C-VALIDATION-001`

Phase 2C validates the completed Phase 1, Phase 2A, and Phase 2B plugin platform without adding business features.

## Automated Coverage

`npm run test:enhancements` validates:

- Plugin metadata completeness, duplicate ids, duplicate feature flags, duplicate documentation, dependency references, lifecycle shape, documentation, tests, validators, schemas, and feature flag files.
- SDK exports, public API surface, version contract, circular imports, forbidden business imports, and tree-shaking boundaries.
- Sandbox freezing, global mutation detection, prototype pollution probe, runtime cleanup, and destroy behavior.
- UI extension points, route surfaces, permissions, feature flags, lazy loading, ordering, and navigation support.
- Generator output for developer, dashboard widget, sidebar tool, settings page, report, and utility plugin archetypes.
- Stress, memory, performance, production hardening, and static analysis assertions.

## Report Outputs

The audit writes:

- `PLUGIN_PLATFORM_VALIDATION_REPORT.md`
- `reports/plugin-platform/PH2C_VALIDATION_REPORT.md`
- `reports/plugin-platform/PH2C_VALIDATION_REPORT.json`

## Manual Gates

Hosted Chrome, Lighthouse, Core Web Vitals, Firebase Console, provider dashboards, authenticated browser smoke, printer hardware, POS, Kitchen, Owner, Customer, and plugin flag-enabled smoke remain manual production gates.
