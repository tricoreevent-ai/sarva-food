# Application File Structure

This document records the current structure of the Nammude repository.

```
.
├── .codex/
├── .env
├── .env.example
├── .env.hostinger.example
├── .env.local
├── .env.production.example
├── .env.staging.example
├── .firebaserc.example
├── .git/
├── .gitignore
├── .next/
├── .sixth/
├── .superdesign/
├── .vscode/
├── README.md
├── certs/
├── components.json
├── docs/
│   ├── AI_HANDOFF.md
│   ├── README.md
│   ├── architecture/
│   ├── deployment/
│   ├── guides/
│   ├── performance/
│   ├── plugin-platform/
│   ├── plugin-sdk/
│   ├── release/
│   ├── trackers/
│   └── validation/
├── eslint.config.mjs
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   └── lib/
│       └── src/
├── locales/
│   ├── en.json
│   ├── hi.json
│   └── ml.json
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── node_modules/
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json
├── run.bat
├── scripts/
│   ├── firestore-production-cleanup.mjs
│   ├── generate-dev-cert.mjs
│   ├── https-dev-server.mjs
│   ├── run-dev-preflight.ps1
│   ├── seed-firebase-owner-client.mjs
│   ├── seed-firebase-production.mjs
│   ├── show-lan-ip.mjs
│   ├── validate-production-data.mjs
│   ├── validate-production-env.mjs
│   └── (other scripts)
├── service-account-key.json
├── storage.rules
├── templates/
│   └── feature/
├── tmp/
├── tools/
│   └── generators/
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vercel.json
└── src/
    ├── app/
    ├── components/
    ├── context/
    ├── features/
    ├── firebase/
    ├── hooks/
    ├── lib/
    ├── modules/
    │   ├── owner/
    │   │   └── pos/
    │   │       ├── components/
    │   │       ├── index.ts
    │   │       ├── pos-store.ts
    │   │       └── pos.config.ts
    │   └── shared/
    │       ├── auth/
    │       │   ├── admin-auth.ts
    │       │   ├── customer-auth.ts
    │       │   └── owner-auth.ts
    │       └── config/
    │           ├── admin.config.ts
    │           ├── customer.config.ts
    │           ├── owner.config.ts
    │           └── environment/
    │               ├── cms.config.ts
    │               ├── env.client.ts
    │               ├── env.server.ts
    │               └── firebase.config.ts
    ├── proxy.ts
    ├── services/
    ├── stores/
    ├── themes/
    └── types/
```

## Notes
- This is the current repository layout as of June 1, 2026.
- The `docs/` folder contains architecture and operational documentation.
- `functions/` holds Firebase Cloud Functions code and build settings.
- `src/` contains the application source, including UI, Firebase integration, core modules, and services.
- The `modules/` folder currently keeps owner POS files under `owner/pos` and shared auth/config files under `shared`.
