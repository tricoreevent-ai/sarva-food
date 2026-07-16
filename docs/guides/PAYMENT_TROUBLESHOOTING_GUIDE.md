# Payment Troubleshooting Guide

| Symptom | Check | Resolution |
| --- | --- | --- |
| Gateway not configured | Configuration test | Enable owner Razorpay and save key id/secret. |
| Key rejected | Validate API Keys | Match test/live mode to key prefix and account mode. |
| Checkout does not open | Browser console/network | Allow Razorpay checkout script and confirm public key response. |
| Signature fails | Verify Signature | Confirm checkout used the same owner key that created the provider order. |
| Webhook fails | Verify Webhook, Razorpay dashboard | Match endpoint and owner webhook secret; inspect sanitized status only. |
| Capture blocked | Payment status | Capture only an authorized test payment. |
| Refund blocked | Refund setting and payment status | Enable refunds and use a captured test payment. |
| Wrong tenant concern | Payment intent identifiers | Confirm owner, restaurant, tenant, app order, and provider order mapping. |
| Timeout/cancel | Test Center log | Preserve unpaid state and retry through normal checkout. |
| Stored secrets unreadable | Encryption key | Restore the stable `PAYMENT_SETTINGS_ENCRYPTION_KEY`, then rotate credentials if needed. |

Do not send provider secrets, checkout signatures, service-account files, or raw payment payloads through client logs or support channels.
