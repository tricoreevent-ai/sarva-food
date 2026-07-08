# Plugin Best Practices

- Use `definePlugin` from the SDK.
- Register routes, navigation, widgets, and assets lazily.
- Communicate through SDK, registry, lifecycle, event bus, permissions, config, error isolation, and runtime context.
- Keep feature flags disabled by default.
- Never import business modules directly.
