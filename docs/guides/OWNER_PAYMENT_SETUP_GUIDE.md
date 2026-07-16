# Owner Payment Setup Guide

Open Owner, Settings, Payments.

1. Select Test Mode.
2. Enter the owner Razorpay Key ID, Key Secret, and Webhook Secret.
3. Set company name, logo, merchant id, currency, methods, limits, auto capture, webhook, and refund controls.
4. Save. Secrets are encrypted server-side and returned only as configured/masked state.
5. Use Payment Verification Center in this order: Configuration, Validate API Keys, Create Test Order, Open Checkout, Verify Signature, Verify Webhook, Capture, Refund.
6. Complete failed-payment, cancel, timeout, and dashboard webhook tests with Razorpay test credentials.
7. Rotate to live keys, select Live Mode, save, and repeat non-mutating checks before enabling online payments.

Provider-mutating verification actions are blocked in Live Mode. Customer checkout resolves the order restaurant and owner before loading the public key. Owner configuration has priority; matching legacy/global configuration is fallback only; otherwise Razorpay is disabled.

Keep `PAYMENT_SETTINGS_ENCRYPTION_KEY` stable and at least 32 characters. Changing it makes stored encrypted secrets unreadable.
