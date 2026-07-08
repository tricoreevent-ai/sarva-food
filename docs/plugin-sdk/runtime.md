# Plugin Runtime

Runtime owns execution. Registry owns metadata.

```text
Discovery -> Metadata Validation -> Dependency Resolution -> Compatibility Validation -> Registry Registration -> Context Creation -> SDK Injection -> Permission Validation -> Config Validation -> Lazy Import -> Lifecycle Initialize -> Health Monitor -> UI Registration -> Route Registration -> Runtime Execution
```

`src/plugins/core/runtime` starts, disables, unloads, and destroys plugins through lifecycle, registry, loader, context, sandbox, UI, route, asset, and health services.
