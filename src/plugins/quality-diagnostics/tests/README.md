# Quality Diagnostics Tests

Run:

```bat
npm run test:enhancements
```

Coverage:

- Feature flag defaults stay disabled in committed env examples.
- Plugin registry exposes `PH1-QD-001`.
- Lifecycle, feature flag, event bus, logger, profiler, permissions, config, dashboard, and error-isolation core files stay present.
- Registry, metadata, discovery, dependency, compatibility, validator, loader, marketplace, installer, and diagnostics platform files stay present.
- Runtime, hook, service, UI, config, plugin definition, docs, and tracker files stay present.
