# Deployment

## Firebase Hosting

Firebase config:

- `firebase.json`
- `.firebaserc`

This project is prepared for Firebase Hosting with web framework support:

```bash
npm run firebase:deploy
```

Rules-only deploy:

```bash
npm run firebase:deploy:rules
```

## Cloud Functions

Install function dependencies:

```bash
cd functions
npm install
npm run build
```

Deploy functions:

```bash
cd functions
npm run deploy
```

## Vercel-Compatible Next.js

The app can also deploy on Vercel.

Use:

- Public Firebase web env vars for client SDK.
- Admin SDK env vars for server-side route handlers or server actions.
- Firebase Hosting only for Firestore/Storage rules and functions if desired.

## Local Emulators

Run:

```bash
npm run firebase:emulators
```

Set:

```bash
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
```

## Production Checklist

- Enable Auth providers.
- Deploy Firestore rules.
- Deploy Storage rules.
- Deploy indexes.
- Seed users with correct roles.
- Seed restaurants and menus.
- Verify restaurant isolation with test users.
- Move payment provider secrets to Functions config or Secret Manager.
- Add WhatsApp provider credentials to Functions config or Secret Manager.
