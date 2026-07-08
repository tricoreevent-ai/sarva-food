# Plugin Lifecycle Guide

Validated lifecycle path:

```text
install -> register -> validate -> initialize -> enable -> run -> suspend -> resume -> disable -> destroy -> reload -> uninstall
```

Runtime ownership:

- Registry owns metadata and state.
- Lifecycle owns initialize, enable, disable, suspend, resume, destroy, health, and recover hooks.
- Runtime owns context injection, sandbox execution, lazy module loading, cleanup, reload, and uninstall.
- Installer owns transactional install and rollback.

Plugin cleanup must remove UI, routes, assets, event subscriptions, API handlers, and storage residue.
