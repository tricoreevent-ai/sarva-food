# Plugin Registry

The enterprise registry owns plugin metadata and state only. It does not instantiate plugins.

State machine:

```text
UNREGISTERED -> REGISTERED -> VALIDATED -> INITIALIZED -> ENABLED -> RUNNING
RUNNING -> SUSPENDED -> RESUMED -> RUNNING
RUNNING -> DISABLED -> INITIALIZED
* -> DESTROYED
```

Invalid transitions throw `PluginRegistryError`.
