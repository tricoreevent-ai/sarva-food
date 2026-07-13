# Developer Guide

## Quick Start

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Firebase local development:

```bash
npm run firebase:emulators
```

## Environment

Start from `.env.example`.

Public client keys:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL`

Server/Admin keys:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Use application default credentials on Firebase Hosting/Functions when possible.

## Project Conventions

Use these locations:

- Route entry: `src/app`.
- Reusable UI: `src/components`.
- Flow UI: `src/components/flows`.
- Firebase calls: `src/services`.
- Shared schema: `src/lib/schemas`.
- Shared constants: `src/lib/constants.ts`.
- Firebase types: `src/types/firebase.ts`.

## Imports

Path alias:

```ts
import { Button } from "@/components/ui/button";
```

Barrels are available for stable shared modules:

- `src/components/index.ts`
- `src/services/index.ts`
- `src/hooks/index.ts`
- `src/firebase/index.ts`
- `src/lib/index.ts`
- `src/types/index.ts`

Do not export Firebase Admin SDK through client-facing barrels.

## Feature Template

Use `templates/feature` for new bounded modules.

Recommended workflow:

1. Copy the template.
2. Add the route under `src/app`.
3. Add the interactive flow under `src/components/flows`.
4. Add a service only when the API shape is known.
5. Add docs for route, state, and Firebase cost behavior.

## Firebase Service Rules

Before adding a service function:

- Add or reuse a TypeScript type.
- Add pagination for lists.
- Use `listenShared` for realtime listeners.
- Use `getCachedQuery` only for data that can be stale briefly.
- Keep Storage uploads compressed.
- Invalidate cache after writes.

## Forms

Use:

- React Hook Form for complex forms.
- Zod schemas in `src/lib/schemas`.
- shadcn-style input components.

Avoid embedding validation schemas inside route files.

## PWA

PWA registration is production-only and optional. Do not make checkout, Instagram, or WhatsApp flows depend on install state.

Files:

- `public/manifest.json`
- `public/sw.js`
- `src/components/pwa/pwa-registrar.tsx`
- `src/components/pwa/install-prompt.tsx`

## Adding Dependencies

Before adding a package:

- Check if React, Next.js, browser APIs, Firebase SDK, or existing UI primitives already solve it.
- Avoid SDKs on customer routes unless they are lazy-loaded.
- Add provider SDKs only behind the relevant payment or messaging flow.

## Release Checklist

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Firebase rules review.
- Firestore indexes deployed.
- Manifest/icon check.
- Mobile checkout smoke test.
- Instagram deep-link smoke test.
- WhatsApp prefilled message smoke test.
