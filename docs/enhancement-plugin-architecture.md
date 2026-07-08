# Enhancement Plugin Architecture

Last updated: 2026-07-08

## Rules

- Enhancements live under `src/plugins`.
- Every plugin has an explicit feature flag and defaults disabled.
- Plugins must not depend on other plugins.
- Plugins must not change existing APIs, Firestore collections, schemas, or realtime listeners.
- Runtime plugins mount lazily after idle through shell composition.
- Every plugin must register with the lifecycle manager before rendering runtime UI.
- Cross-plugin communication must use the event bus, not direct imports.
- Developer dashboards and logs must stay silent in production.

## Current Registry

| Feature ID | Plugin | Flag | Status | Impact |
| --- | --- | --- | --- | --- |
| `PH1-QD-001` | Quality Diagnostics | `NEXT_PUBLIC_ENABLE_QUALITY_DIAGNOSTICS` | Disabled by default | No API, Firestore, schema, or realtime impact. |
| `PH2D-PRODUCTION-001` | Restaurant Health Dashboard | `NEXT_PUBLIC_ENABLE_RESTAURANT_HEALTH_DASHBOARD` | Disabled by default | SDK-only Admin/Developer diagnostics plugin; no API, Firestore, schema, or realtime impact. |

## Core Foundation

| Component | Path | Purpose |
| --- | --- | --- |
| Lifecycle Manager | `src/plugins/core/lifecycle` | Register, initialize, enable, disable, suspend, resume, destroy, health-check, and recover plugins. |
| Feature Flags | `src/plugins/core/feature-flags` | Runtime reads, env/local/developer overrides, dependencies, validation, compatibility, rollback, remote-config readiness. |
| Runtime Dashboard | `src/plugins/core/runtime-dashboard` | Developer-only plugin health, load, flags, memory, and profiler view. |
| Event Bus | `src/plugins/core/events` | Typed publish/subscribe with priority and error isolation. |
| Logger | `src/plugins/core/logger` | Development-only plugin-prefixed logs and performance groups. |
| Profiler | `src/plugins/core/profiler` | Disabled-by-default render, long-task, FPS, memory, hydration, and plugin load reporting. |
| Error Isolation | `src/plugins/core/error-isolation` | Plugin-local error boundary, retry, recovery, and disable-after-failure handoff. |
| Permissions | `src/plugins/core/permissions` | Guest/customer/kitchen/waiter/owner/admin/developer visibility policies. |
| Configuration | `src/plugins/core/config` | Defaults, schemas, validation, migration, and version-ready config contract. |
| Testing | `src/plugins/core/testing` | Required enhancement test categories for lifecycle/load/stress/memory/performance/isolation/permissions/flags/lazy/error/hot-toggle. |
| Enterprise Registry | `src/plugins/core/registry` | Metadata-only state machine, O(1) lookup, enable/disable/suspend/resume/destroy coordination. |
| Metadata | `src/plugins/core/metadata` | Required plugin contract and validation helpers. |
| Discovery | `src/plugins/core/discovery` | Lazy local discovery with future remote and hot-reload readiness. |
| Dependency Manager | `src/plugins/core/dependency-manager` | Dependency graph, topological sort, version mismatch, disabled dependency, and cycle detection. |
| Compatibility | `src/plugins/core/compatibility` | App/runtime/platform/environment/module/flag compatibility checks. |
| Validator | `src/plugins/core/validator` | Metadata, dependencies, compatibility, permissions, config, lifecycle, health, registration, and enable validation report. |
| Loader | `src/plugins/core/loader` | Lazy import, retry, timeout, abort, prefetch, cache, unload, and cleanup support. |
| Marketplace | `src/plugins/core/marketplace` | Mock-provider marketplace backend for available, installed, update, category, search, filter, and sort data. |
| Installer | `src/plugins/core/installer` | Transactional install pipeline with rollback. |
| Diagnostics | `src/plugins/core/diagnostics` | Installed/enabled/broken plugin metrics, failures, health score, startup and size signals. |
| Runtime Engine | `src/plugins/core/runtime` | Execution manager for context injection, SDK injection, lifecycle execution, recovery, unload, and destroy. |
| Official SDK | `src/plugins/core/sdk` | Public plugin API surface for all future plugins. |
| SDK Hooks | `src/plugins/core/sdk/hooks.ts` | Public client hook facade for plugin UI. |
| Plugin API | `src/plugins/core/api` | Versioned approved API contract; arbitrary app module calls are blocked by design. |
| Plugin Hooks | `src/plugins/core/hooks` | Client SDK hooks for plugin state, config, permissions, storage, logging, events, runtime, diagnostics, health, and lifecycle. |
| Plugin Services | `src/plugins/core/services` | Approved no-op-safe service injection for toast, modal, clipboard, theme, navigation, localization, formatting, date, currency, analytics, and notifications. |
| Plugin Context | `src/plugins/core/context` | Isolated runtime context with identity, tenant, language, timezone, diagnostics, storage, router, UI, assets, API, services, and logger. |
| Plugin Router | `src/plugins/core/router` | Lazy route and navigation contribution registry. |
| Plugin Storage | `src/plugins/core/storage` | Namespaced memory/session/persistent/encrypted storage with version, migration, quota, cleanup, and snapshots. |
| Plugin Assets | `src/plugins/core/assets` | Versioned icon, image, font, SVG, animation, translation, theme, and manifest registry. |
| Plugin UI | `src/plugins/core/ui` | Permission-aware and flag-aware extension point registry. |
| Plugin Sandbox | `src/plugins/core/sandbox` | Frozen context execution boundary and global-mutation detection. |
| Validation Hardening | `scripts/release/enhancement-registry-audit.mjs` | Phase 2C contract validation, SDK checks, sandbox tests, generator checks, stress benchmarks, memory checks, static analysis, and report generation. |

## Folder Contract

```text
src/plugins/<plugin>/
  config.defaults.ts
  config.schema.ts
  docs/
  hooks/
  metadata.ts
  plugin.ts
  routes/
  services/
  tests/
  types/
  ui/
  validator.ts
  feature-flag.ts
```
