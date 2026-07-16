# Razorpay Guide

## Tenant Model

Each checkout resolves:

`Order -> Restaurant/Tenant -> Owner -> Encrypted Razorpay Settings -> Provider Order`

Payment intents retain owner, restaurant, tenant, app order, and provider order identifiers. Verification, webhook, capture, and refund resolve the same owner-scoped runtime. Cross-tenant order access is rejected by session and tenant checks.

## Modes

- Test Mode: connection, test order, checkout, signature, capture, refund, failure, cancel, and timeout verification.
- Live Mode: non-mutating connection/configuration checks only in Owner Settings. Complete dashboard signoff before enabling.

## Key Rotation

1. Disable Razorpay for the owner.
2. Save the new key id, secret, and webhook secret together.
3. Run configuration, key, signature, and webhook checks.
4. Re-enable and complete one controlled payment.
5. Retain provider reconciliation evidence; never log old or new secrets.

## Recovery

Disable owner Razorpay and keep COD/manual payment available. Existing payment intents and audit records remain unchanged. Re-enable only after provider reconciliation.

Settlement remains a Razorpay dashboard responsibility and requires manual verification.
