# Push Notification Guide

## Kitchen Ready workflow

Kitchen `Notify Waiter` creates one tenant-scoped waiter notification, pushes to registered waiter surfaces, sends a silent owner copy, and retains unread in-app state. POS opening acknowledges it. Unacknowledged notifications escalate to owner after the configured timeout. Provider-unavailable delivery retains browser/in-app, toast, notification-center, and badge fallback state.

## Production Setup

1. In Firebase Console, open Project Settings, Cloud Messaging, Web configuration.
2. Confirm the Web Push certificate public key is `BPYzGKh8p1tju6Zd4pN1hC9xvHLQMwBYYVKG3mVbSrjWtF39cRaPF1CwJJYqf8IcFpiSzBFchUSamu8fH-DTENs`.
3. Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` to that public key in Development, Preview, and Production.
4. Keep the corresponding private key in Firebase/provider-managed server configuration. Never use a `NEXT_PUBLIC_` variable for a private key.
5. Confirm the Firebase web app sender id matches `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`.
6. Add the Hostinger and custom domains to Firebase authorized domains.
7. Redeploy, clear cache, and confirm `/health/ready` reports `vapidConfigured=true`.

## Owner Verification

Open Owner, Settings, Notifications, Notification Test Center.

- Register Device requests an FCM token through the active service worker.
- Refresh Token renews the current registration and server timestamp.
- Send Test Notification performs authenticated owner-scoped FCM delivery.
- Browser, Foreground, Background, Badge, Sound, Action Buttons, and Deep Link isolate browser behavior.
- Remove Device removes the server registration; Delete Token also deletes the Firebase browser token.
- Current token is masked on screen and copied only on explicit owner action.

Chrome, Edge, Firefox, Android Chrome, and supported Safari/iOS PWA versions require separate real-device checks. Denied permission must be reset in browser settings.

## Delivery Lifecycle

`pending -> dispatching -> sent | no_tokens | partial_failed | failed`

FCM transport errors return an item to `pending` for a bounded retry. Invalid or unregistered device tokens are removed. Same-origin links are enforced by server, client, and service worker.

## Scenario Verification

`npm run verify:phase4c` verifies all 34 notification contracts. Customer Order Confirmation and Customer Order Rejection are reserved for manual workflow verification. Contract verification does not replace provider/device delivery evidence.
