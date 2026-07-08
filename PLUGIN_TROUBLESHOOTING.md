# Plugin Troubleshooting

Common checks:

- Confirm the plugin feature flag is explicitly enabled only in a controlled environment.
- Run `npm run test:enhancements`.
- Run `npm run typecheck`.
- Inspect `PLUGIN_PLATFORM_VALIDATION_REPORT.md`.
- Check `reports/plugin-platform/PH2D_PRODUCTION_VALIDATION_REPORT.md`.
- Disable the flag to roll back runtime exposure.

If a plugin fails:

- Check config validation errors.
- Confirm permissions match the target role.
- Confirm routes and UI contributions are detached after unload.
- Confirm storage cleanup leaves no plugin keys behind.
- Confirm no forbidden imports were introduced.
