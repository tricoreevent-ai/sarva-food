# Plugin Platform Validation Hardening

Feature ID: `PH2C-VALIDATION-001`

Phase 2C is repository-side validation and production hardening for the plugin platform. It does not add Firestore collections, API routes, business workflows, realtime listeners, payment behavior, authentication changes, or Owner/POS/Kitchen/Customer/Admin changes.

## Validation Scope

- Registry, lifecycle, runtime, SDK, sandbox, loader, validator, compatibility, marketplace, installer, diagnostics, storage, context, router, assets, services, hooks, feature flags, dashboard, profiler, error isolation, permissions, configuration, generator, and sample plugins.
- Contract validation for all metadata-bearing plugins.
- Stress benchmarks for registration, metadata lookup, event publish, storage, lifecycle transitions, lazy loading, unloading, and cleanup.
- Static analysis for forbidden imports, relative cycles, duplicate metadata, bundle isolation, and production flag defaults.

## Production Hardening Rules

- All plugin flags default disabled.
- Plugin runtime remains lazy and isolated.
- Plugins use SDK services only.
- Plugins do not import business modules directly.
- Runtime destroy detaches UI, routes, assets, and sandbox state.
- Installer rollback remains the disable path for failed plugin setup.
