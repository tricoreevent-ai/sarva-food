# Phase 4C Pre-Implementation Audit

Date: 2026-07-16

## Scope

This audit was completed before Phase 4C code changes. It covers Firebase Web Push, owner-scoped Razorpay, tenant isolation, security controls, production configuration, and owner self-test surfaces. No service-account or provider secret was read, copied, or committed.

## Push Notification Audit

| Area | Existing Status | Evidence | Confirmed Gap |
| --- | --- | --- | --- |
| Firebase client initialization | Implemented | `src/firebase/config.ts`, `src/firebase/client.ts` | Production VAPID env remains externally configured. |
| Firebase Messaging | Implemented | Dynamic `firebase/messaging` imports in `src/services/fcm-client.ts` | No automated contract matrix for all requested scenarios. |
| Service worker | Implemented | `public/sw.js`, `src/components/pwa/pwa-registrar.tsx` | No local background/action-button diagnostic command. |
| Permission flow | Implemented | `PushPermissionPanel`, `requestPushPermission` | Owner screen exposes enable/disable only. |
| Token registration | Implemented | Authenticated `/api/user/preferences` PATCH and hashed server record | No owner-facing registration diagnostics. |
| Token refresh | Implemented | Twelve-hour refresh in `refreshPushTokenIfNeeded` | No force-refresh control in Owner Settings. |
| Token cleanup | Implemented | Client deletion plus invalid-token cleanup after FCM response | No owner-facing delete/copy diagnostics. |
| Notification queue | Implemented | Transactional `pending` to `dispatching` claim | A thrown FCM send can leave an item in `dispatching`; bounded retry is required. |
| Foreground notifications | Implemented | `PushNotificationProvider` toast, sound, badge, deep link | No owner test event/history surface. |
| Background notifications | Implemented | Service-worker `push`, badge, display, click focus/open | No local diagnostic trigger or delivery event reporting. |
| Deep links and click actions | Implemented | Same-origin validation in client, server, and service worker | Action-button diagnostics are absent. |
| Offline behavior | Implemented | Network-only navigation fallback and sync notification | Provider delivery still requires real browser/device smoke. |

## Notification Scenario Audit

The repository emits operational order, kitchen-ready, completion, refund, payment-dispute, and payment-downtime notifications. It does not maintain a single machine-verifiable catalog covering the 34 requested Customer, Owner, Waiter, Kitchen, and Admin scenarios. Phase 4C will add a contract catalog and automated validation without adding business-event writes or changing order lifecycle behavior.

Customer Order Confirmation and Customer Order Rejection remain explicitly manual. Live delivery for every scenario remains provider/device evidence and cannot be represented as an automated pass without a registered browser token.

## Razorpay Audit

| Area | Existing Status | Evidence | Confirmed Gap |
| --- | --- | --- | --- |
| Owner settings | Implemented | Owner Settings Payments panel and `/api/owner/payment-settings` | Verification center is limited to one connection test. |
| Secret storage | Implemented | AES-256-GCM server-side encryption through `secret-box.ts` | Stable `PAYMENT_SETTINGS_ENCRYPTION_KEY` remains a deployment requirement. |
| Browser exposure | Protected | Public settings return only masked/configured state; checkout returns public key id | No secret is needed in client storage or API responses. |
| Runtime priority | Implemented | Owner profile config, legacy restaurant config, matching global secret fallback, otherwise disabled | Legacy/global fallback must remain documented and regression-tested. |
| Checkout isolation | Implemented | Order resolves restaurant, owner, tenant, and payment intent before creating provider order | Ten-owner simulated isolation test is absent. |
| Signature verification | Implemented | Constant-time checkout HMAC and Razorpay webhook validation | No owner self-test result surface. |
| Webhook replay protection | Implemented | Event-id document creation rejects duplicates | Real dashboard webhook delivery remains manual. |
| CSRF and permissions | Implemented | Same-origin owner mutations, owner feature permissions, rate limits | Test-center actions must reuse these controls. |
| Refund | Implemented | Tenant-scoped order lookup and owner permission check | Real sandbox refund remains provider-gated. |

## Planned Low-Risk Closure

- Add bounded retry recovery for failed queued push dispatches.
- Add a machine-verifiable notification scenario catalog with exactly two reserved manual customer scenarios.
- Add an Owner Notification Test Center using the existing FCM client, service worker, and owner authorization paths.
- Extend the existing owner payment settings endpoint with non-secret diagnostics and test-mode-only verification actions.
- Add an Owner Payment Verification Center with redacted local result history.
- Add ten-tenant static/simulated isolation validation and security assertions.
- Configure the supplied public VAPID key in commit-safe environment templates and production documentation.
- Keep live provider sends, webhook receipt, browser background delivery, and physical-device behavior as explicit manual gates.

## Constraints

- No Firestore collection, rule, index, or order data model change.
- No order, kitchen, POS, customer, owner, authentication, repository, or plugin workflow change.
- No provider private key or Razorpay secret in client code, HTML, logs, browser storage, or public API responses.
- No claim of live delivery success without external provider and device evidence.
