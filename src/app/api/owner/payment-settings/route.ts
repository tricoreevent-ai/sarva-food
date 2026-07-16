import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  amountToSubunits,
  assertRazorpayUsable,
  createRazorpayClient,
  getOwnerRazorpayRuntimeSettings,
  getOwnerRazorpaySettings,
  restaurantPaymentGatewayNotConfigured,
  resetOwnerRazorpaySettings,
  saveOwnerRazorpaySettings,
  verifyRazorpaySignature,
} from "@/lib/server/owner-payment-settings";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "read");
  if (access.error) return access.error;
  const data = await getOwnerRazorpaySettings(access.session, request.nextUrl.searchParams.get("restaurantId"));
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const data = await saveOwnerRazorpaySettings(access.session, body);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as {
    action?: string;
    restaurantId?: string;
    providerOrderId?: string;
    paymentId?: string;
    signature?: string;
  };

  if (body.action === "reset") {
    const data = await resetOwnerRazorpaySettings(access.session, body.restaurantId);
    return NextResponse.json({ data });
  }

  try {
    const settings = await getOwnerRazorpayRuntimeSettings(access.session, body.restaurantId);

    if (body.action === "diagnostics") {
      const expectedPrefix = settings.mode === "live" ? "rzp_live_" : "rzp_test_";
      const checks = [
        { name: "Owner scope", pass: Boolean(settings.ownerId && settings.restaurantId && settings.tenantId) },
        { name: "Gateway enabled", pass: settings.enabled },
        { name: "Key mode", pass: settings.keyId.startsWith(expectedPrefix) },
        { name: "Secret configured", pass: settings.secretConfigured },
        { name: "Webhook configured", pass: !settings.webhookEnabled || settings.webhookSecretConfigured },
        { name: "Currency", pass: settings.currency === "INR" },
      ];
      const pass = checks.every((item) => item.pass);
      return verified(body.action, startedAt, {
        mode: settings.mode,
        keyId: settings.keyId,
        restaurantId: settings.restaurantId,
        checks,
      }, pass ? "Owner payment configuration passed local diagnostics." : "Resolve failed checks before enabling Razorpay.", pass);
    }

    assertRazorpayUsable(settings);
    const client = createRazorpayClient(settings);

    if (body.action === "test" || body.action === "validateKeys") {
      await client.orders.all({ count: 1 });
      return verified(body.action, startedAt, {
        mode: settings.mode,
        keyId: settings.keyId,
        restaurantId: settings.restaurantId,
      }, body.action === "test" ? "Payment gateway is configured successfully." : "Razorpay accepted the owner-scoped API keys.");
    }

    if (body.action === "createTestOrder") {
      requireTestMode(settings.mode);
      const order = await client.orders.create({
        amount: 100,
        currency: "INR",
        receipt: `VERIFY-${Date.now()}`.slice(0, 40),
        notes: {
          purpose: "owner-payment-verification",
          ownerId: settings.ownerId,
          restaurantId: settings.restaurantId,
          tenantId: settings.tenantId,
        },
      });
      return verified(body.action, startedAt, {
        providerOrderId: order.id,
        keyId: settings.keyId,
        amount: order.amount,
        currency: order.currency,
        name: settings.companyName,
        image: settings.companyLogo,
      }, "Test-mode order created. Open checkout to continue.");
    }

    if (body.action === "verifySignature") {
      const orderId = "order_phase4c_signature";
      const paymentId = "pay_phase4c_signature";
      const signature = createHmac("sha256", settings.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
      const valid = checkoutSignature(`${orderId}|${paymentId}`, signature, settings.keySecret);
      return verified(body.action, startedAt, { valid }, valid ? "Checkout signature self-test passed." : "Checkout signature self-test failed.", valid);
    }

    if (body.action === "verifyTestPayment") {
      if (!body.providerOrderId || !body.paymentId || !body.signature) return NextResponse.json({ error: "Test order, payment, and signature are required." }, { status: 400 });
      const valid = checkoutSignature(`${body.providerOrderId}|${body.paymentId}`, body.signature, settings.keySecret);
      const payment = valid ? await client.payments.fetch(body.paymentId) : null;
      const matched = Boolean(payment && payment.order_id === body.providerOrderId);
      return verified(body.action, startedAt, {
        valid,
        matched,
        paymentId: body.paymentId,
        status: payment?.status,
      }, valid && matched ? "Test checkout signature and provider payment match." : "Test payment verification failed.", valid && matched);
    }

    if (body.action === "verifyWebhook") {
      if (!settings.webhookEnabled || !settings.webhookSecret) {
        return verified(body.action, startedAt, {
          configured: false,
          endpoint: "/api/payments/razorpay/webhook",
        }, "Enable webhooks and save the webhook secret before dashboard verification.", false);
      }
      const payload = JSON.stringify({ event: "phase4c.test", restaurantId: settings.restaurantId });
      const signature = createHmac("sha256", settings.webhookSecret).update(payload).digest("hex");
      const valid = verifyRazorpaySignature(payload, signature, settings.webhookSecret);
      return verified(body.action, startedAt, {
        configured: true,
        signatureValid: valid,
        endpoint: "/api/payments/razorpay/webhook",
      }, valid ? "Webhook signature self-test passed; dashboard delivery remains manual." : "Webhook signature self-test failed.", valid);
    }

    if (body.action === "captureTestPayment") {
      requireTestMode(settings.mode);
      if (!body.paymentId) return NextResponse.json({ error: "Test payment id is required." }, { status: 400 });
      const payment = await client.payments.fetch(body.paymentId);
      const captured = payment.captured || payment.status === "captured"
        ? payment
        : await client.payments.capture(body.paymentId, Number(payment.amount || 100), "INR");
      return verified(body.action, startedAt, {
        paymentId: captured.id,
        status: captured.status,
        captured: captured.captured,
      }, "Test payment capture completed.");
    }

    if (body.action === "refundTestPayment") {
      requireTestMode(settings.mode);
      if (!settings.refundEnabled) return verified(body.action, startedAt, { refundEnabled: false }, "Enable refunds before running a sandbox refund.", false);
      if (!body.paymentId) return NextResponse.json({ error: "Captured test payment id is required." }, { status: 400 });
      const payment = await client.payments.fetch(body.paymentId);
      if (!payment.captured && payment.status !== "captured") return verified(body.action, startedAt, { paymentId: body.paymentId, status: payment.status }, "Capture the test payment before refunding it.", false);
      const refund = await client.payments.refund(body.paymentId, {
        amount: amountToSubunits(1),
        notes: { purpose: "owner-payment-verification" },
      });
      return verified(body.action, startedAt, {
        paymentId: body.paymentId,
        refundId: refund.id,
        status: refund.status,
      }, "Sandbox refund request completed.");
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const configurationError = reason === restaurantPaymentGatewayNotConfigured;
    const message = configurationError
      ? restaurantPaymentGatewayNotConfigured
      : reason === "Provider-mutating verification actions are disabled in live mode."
        ? reason
        : "Payment verification failed. Check the owner-scoped credentials and provider dashboard.";
    return NextResponse.json({
      ok: false,
      action: body.action,
      status: "FAIL",
      durationMs: Date.now() - startedAt,
      error: message,
      recommendation: "Review owner-scoped keys, mode, permissions, and Razorpay dashboard status.",
    }, { status: 422 });
  }

  return NextResponse.json({ error: "Unsupported payment settings action." }, { status: 400 });
}

function verified(action: string, startedAt: number, response: Record<string, unknown>, recommendation: string, pass = true) {
  return NextResponse.json({
    ok: pass,
    action,
    status: pass ? "PASS" : "FAIL",
    request: { action },
    response,
    durationMs: Date.now() - startedAt,
    recommendation,
    message: recommendation,
  }, { status: pass ? 200 : 422 });
}

function requireTestMode(mode: "test" | "live") {
  if (mode !== "test") throw new Error("Provider-mutating verification actions are disabled in live mode.");
}

function checkoutSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}
