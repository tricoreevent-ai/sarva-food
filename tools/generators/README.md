# Generators

This project keeps generator tooling intentionally lightweight. For a new module:

1. Copy files from `templates/feature`.
2. Add route entry points under `src/app`.
3. Add UI composition under `src/components/flows`.
4. Add service functions under `src/services` only when the API contract is clear.
5. Export stable shared pieces through the relevant barrel file.

Avoid introducing a code generation dependency until feature volume justifies it.
