# Module File Structure

Last updated: 2026-06-01

This document captures the current file structure under `src/modules` after the POS, auth, and configuration cleanup.

```
src/modules/
├── owner/
│   └── pos/
│       ├── components/
│       │   ├── cart-item.tsx
│       │   ├── cart-panel.tsx
│       │   ├── category-list.tsx
│       │   ├── customer-selector.tsx
│       │   ├── order-summary.tsx
│       │   ├── pos-header.tsx
│       │   ├── pos-sidebar.tsx
│       │   ├── product-card.tsx
│       │   ├── product-grid.tsx
│       │   └── table-selector.tsx
│       ├── index.ts
│       ├── pos-store.ts
│       └── pos.config.ts
└── shared/
    ├── auth/
    │   ├── admin-auth.ts
    │   ├── customer-auth.ts
    │   └── owner-auth.ts
    └── config/
        ├── admin.config.ts
        ├── customer.config.ts
        ├── owner.config.ts
        └── environment/
            ├── cms.config.ts
            ├── env.client.ts
            ├── env.server.ts
            └── firebase.config.ts
```

## Notes
- Owner POS is the source of truth for POS UI, configuration, and store selectors.
- Shared authentication role helpers live in `src/modules/shared/auth`.
- Shared application and environment configuration lives in `src/modules/shared/config`.
- Legacy source folders `src/components/pos` and `src/config` were removed after imports were migrated.
