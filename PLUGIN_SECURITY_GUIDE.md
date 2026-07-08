# Plugin Security Guide

Security rules:

- Use SDK services only.
- Do not import business modules.
- Do not access Firestore or repositories directly.
- Do not mutate globals.
- Do not bypass plugin storage namespaces.
- Do not expose secrets, cookies, tokens, payment ids, private keys, or provider responses.
- Gate all UI and routes with feature flags and permissions.
- Keep production flags disabled until controlled validation passes.

Phase 2D validation checks forbidden imports, storage namespace escape, permission coverage, feature-flag defaults, sandbox mutation protection, cleanup, and regression boundaries.
