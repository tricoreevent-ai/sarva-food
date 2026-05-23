# Firebase Setup

## Packages

The app package uses:

- `firebase` for client-side Auth, Firestore, and Storage.
- `firebase-admin` for server-side App Router patterns.

Cloud Functions live in `functions/` with their own package:

- `firebase-functions`
- `firebase-admin`

This keeps frontend bundles lean and lets functions deploy independently.

## Environment

Copy `.env.example` to `.env.local` and fill the public Firebase web config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false
NEXT_PUBLIC_USE_FIREBASE=false
```

For server-side Admin SDK access in Vercel or local server routes:

```bash
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

On Firebase Hosting/Functions, prefer application default credentials instead of service account JSON.

## Local Development

Install and login to Firebase CLI:

```bash
npx firebase-tools login
```

Copy `.firebaserc.example` to `.firebaserc` and set the project id.

Run emulators:

```bash
npm run firebase:emulators
```

Use emulator mode:

```bash
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
```

## Initialization Files

- `src/firebase/client.ts`: browser SDK setup and emulator connection.
- `src/firebase/admin.ts`: Admin SDK setup for server-only access.
- `src/firebase/collections.ts`: typed collection references and converters.

## Auth Providers

Enable in Firebase Console:

- Google
- Email/password
- Phone

The client service in `src/services/auth-service.ts` provides Google, email, and phone entry points.
