# Application File Structure

This document records the current structure of the Sarva Food App repository.

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
├── ARCHITECTURE.md
├── certs/
├── components.json
├── docs/
│   ├── architecture/
│   ├── advanced-menu-system.md
│   ├── architecture-audit.md
│   ├── backend-architecture.md
│   ├── component-structure.md
│   ├── customer-ux-redesign.md
│   ├── deep-linking.md
│   ├── deployment.md
│   ├── design-system.md
│   ├── developer-guide.md
│   ├── final-operations-hardening-pass.md
│   ├── final-production-readiness-report.md
│   ├── firebase-cost-audit.md
│   ├── firebase-cost-optimization.md
│   ├── firebase-production-integration.md
│   ├── firebase-setup.md
│   ├── firebase-troubleshooting.md
│   ├── firestore-schema.md
│   ├── frontend-flows.md
│   ├── future-roadmap.md
│   ├── hostinger-deployment.md
│   ├── infra-ssl-firestore-stabilization.md
│   ├── location-based-commerce.md
│   ├── mobile-local-testing.md
│   ├── mock-api.md
│   ├── module-file-structure.md
│   ├── multi-tenant-auth-architecture.md
│   ├── nextjs-optimization.md
│   ├── owner-user-manual.md
│   ├── performance-audit.md
│   ├── production-stabilization-pass.md
│   ├── pwa-strategy.md
│   ├── realtime-flow.md
│   ├── restaurant-billing-printing-system.md
│   ├── restaurant-business-suite.md
│   ├── restaurant-enterprise-features.md
│   ├── restaurant-operations-system.md
│   ├── restaurant-printing-system.md
│   ├── routing.md
│   ├── security-rules.md
│   ├── social-commerce.md
│   ├── state-management.md
│   ├── TASK_TRACKER.md
│   ├── template-engine.md
│   └── ux-ui-architecture.md
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
│   ├── remove-non-launch-restaurants.mjs
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
