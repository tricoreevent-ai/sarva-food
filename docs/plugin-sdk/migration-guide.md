# Plugin Migration Guide

Phase 1 plugins may continue using lifecycle directly.

New plugins should migrate to:

```text
metadata.ts -> plugin.ts -> definePlugin -> runtime context -> SDK services
```

Keep plugin config additive and versioned.
