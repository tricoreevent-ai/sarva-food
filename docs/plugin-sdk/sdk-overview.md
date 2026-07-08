# Sarva Plugin SDK Overview

Feature ID: `PH2B-RUNTIME-001`

Plugins interact with Sarva only through `src/plugins/core/sdk`.

Exports include `PluginContext`, `PluginAPI`, `PluginLifecycle`, `PluginEvents`, `PluginLogger`, `PluginStorage`, `PluginPermissions`, `PluginConfig`, `PluginDiagnostics`, `PluginRuntime`, `PluginManifest`, `PluginRouter`, `PluginUI`, `PluginAssets`, `PluginServices`, `PluginUtilities`, and `PluginVersion`.

No plugin may import Customer, Owner, Kitchen, POS, Admin, repository, API, or Firestore modules directly.
