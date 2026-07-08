# Sarva Plugin SDK Overview

Feature ID: `PH2B-RUNTIME-001`

Plugins interact with Sarva only through `src/plugins/core/sdk`.

Exports include `PluginContext`, `PluginAPI`, `PluginLifecycle`, `PluginEvents`, `PluginLogger`, `PluginStorage`, `PluginStorageManager`, `PluginStorageMode`, `PluginStorageSnapshot`, `PluginPermissions`, `PluginConfig`, `PluginDiagnostics`, `PluginRuntime`, `PluginManifest`, `PluginRouter`, `PluginUI`, `PluginAssets`, `PluginServices`, `PluginUtilities`, and `PluginVersion`.

Client hooks are available from `src/plugins/core/sdk/hooks` so plugin UI can use runtime, config, permissions, storage, logger, events, diagnostics, health, and lifecycle state through the SDK path.

No plugin may import Customer, Owner, Kitchen, POS, Admin, repository, API, or Firestore modules directly.
