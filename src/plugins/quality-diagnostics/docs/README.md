# Quality Diagnostics Plugin

Feature ID: `PH1-QD-001`

Feature flag: `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false`

## Business Objective

Provide an isolated Phase 1 quality lane for optional render and memory diagnostics without changing customer, POS, Kitchen, owner, admin, payment, auth, API, Firestore, or realtime behavior.

## Technical Design

The plugin mounts only when an enhancement flag is enabled. When disabled, no runtime plugin chunk is loaded by the customer or dashboard shells.

```text
Shell IdleMount
  -> EnhancementRuntime
    -> Feature Flag Manager
    -> Lifecycle Manager
      -> initialize
      -> enable
      -> PluginErrorBoundary
        -> QualityDiagnosticsRuntime
          -> useQualityDiagnostics
            -> startQualityDiagnostics
```

## Configuration

Owned files:

- `metadata.ts`
- `config.schema.ts`
- `config.defaults.ts`
- `validator.ts`

The default config validates sample interval, panel visibility, long-task thresholds, and memory thresholds before plugin enablement.

## Metadata

`metadata.ts` exposes the registry contract used by the Phase 2A discovery, registry, dependency, compatibility, marketplace, installer, and diagnostics engines.

## Performance Analysis

- Disabled by default.
- No initial-load impact when disabled.
- No Firestore reads.
- No API calls.
- No realtime listeners.
- Uses one bounded interval and one PerformanceObserver only when enabled.
- Lifecycle registration and runtime component import happen only after the feature flag and permission policy pass.

## Risk Analysis

Risk level: low.

Rollback: set `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS=false` or revert the plugin folder and shell mount.

## Acceptance Criteria

- Feature flag defaults to false.
- Plugin remains independent under `src/plugins/quality-diagnostics`.
- Plugin lifecycle runs initialize then enable before runtime rendering.
- Runtime loads lazily after idle only when enabled.
- Plugin has config, permission, lifecycle, health, recovery, and error isolation.
- No schema, endpoint, collection, or listener changes.
- `npm run test:enhancements`, `npm run typecheck`, and `npm run lint` pass.

## Validation

- Unit: registry and flag defaults audited by `npm run test:enhancements`.
- Integration: shell mount remains idle and flag-gated.
- Lifecycle: manager registration, health, recovery, and config files are audited.
- Regression: no business workflow files changed.
- Accessibility: dev-only panel uses `output` with polite live updates.
- Performance: disabled default prevents startup cost.
- Memory: observer and interval cleanup run on unmount.
