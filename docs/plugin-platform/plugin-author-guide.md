# Plugin Author Guide

Plugins live under `src/plugins/<plugin>`.

Required files:

- `metadata.ts`
- `plugin.ts`
- `config.schema.ts`
- `config.defaults.ts`
- `validator.ts`
- `docs/README.md`
- `tests/README.md`

Plugins must not import another plugin directly. Use the event bus and dependency metadata.
