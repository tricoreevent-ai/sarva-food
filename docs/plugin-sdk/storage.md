# Plugin Storage

Plugin storage is namespace-isolated per plugin id.

Supported modes: memory, session, persistent, encrypted.

Storage supports version, migration, quota, cleanup, key listing, and snapshot reporting.

`PluginStorageManager` is exported through the official SDK for plugins that need to validate memory, session, persistent, and encrypted storage modes without importing storage internals.
