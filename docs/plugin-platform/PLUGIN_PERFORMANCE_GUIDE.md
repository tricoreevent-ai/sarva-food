# Plugin Performance Guide

Performance rules:

- Lazy load routes and extension payloads.
- Keep startup work bounded.
- Store small snapshots only.
- Use storage quotas and cleanup.
- Avoid polling, listeners, and business data scans.
- Use diagnostics heartbeat and health scores for runtime visibility.

Phase 2D measures cold synthetic registration, registry lookup, validation, dependency resolution, runtime creation, context injection, SDK injection, UI/route/navigation registration, storage latency, event publish, reload, disable, and destroy paths.
