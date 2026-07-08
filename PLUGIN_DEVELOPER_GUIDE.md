# Plugin Developer Guide

Use `src/plugins/core/sdk` for plugin code and `src/plugins/core/sdk/hooks` for client hooks.

Required plugin files:

- `metadata.ts`
- `plugin.ts`
- `feature-flag.ts`
- `config.defaults.ts`
- `config.schema.ts`
- `validator.ts`
- `docs/README.md`
- `tests/README.md`

Rules:

- Do not import app, repository, Firebase, payment, auth, or business modules.
- Keep plugin flags disabled by default.
- Use `PluginContext` for logger, events, services, router, UI, assets, API, storage, diagnostics, permissions, config, tenant, and user information.
- Use lazy loaders for routes and extension point payloads.
- Add docs and tests before enabling a plugin in any environment.
