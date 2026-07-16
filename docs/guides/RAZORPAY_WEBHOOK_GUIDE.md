# Razorpay Webhook Guide

Endpoint: `https://<production-domain>/api/payments/razorpay/webhook`

## Setup

1. Generate a strong owner webhook secret in Razorpay.
2. Save it in Owner, Settings, Payments; enable Webhook.
3. Subscribe to payment authorized/captured/failed, order paid, refund created/processed, dispute, and downtime events.
4. Run Verify Webhook in Payment Verification Center.
5. Send a real Razorpay test webhook and confirm the event is processed once.

## Security

- The raw request body is validated with the owner-scoped webhook secret.
- Provider order/payment intent mapping selects the tenant before processing.
- Event id creation provides replay/idempotency protection.
- Invalid signatures are rejected and sanitized.
- Duplicate events return success without repeating writes.
- The global `RAZORPAY_WEBHOOK_SECRET` is legacy fallback only when owner mapping cannot provide a secret.

Dashboard delivery, retry timing, settlement, and provider event history remain manual evidence.
