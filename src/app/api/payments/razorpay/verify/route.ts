import { createHmac, timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  assertRazorpayUsable,
  createRazorpayClient,
  getRazorpayRuntimeForOrder,
  paymentMethod,
  restaurantPaymentGatewayNotConfigured,
  scopeFromRazorpayOrder,
  subunitsToAmount,
} from "@/lib/server/owner-payment-settings";
import { OrderRepository } from "@/repositories/order-repository";
import { apiError } from "@/lib/server/api-response";
import { productionLogger } from "@/lib/server/production-logger";
import { createTraceContext, extendTrace, publicTraceMeta, traceLogFields, type TraceContext } from "@/lib/server/request-trace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let trace = createTraceContext(request);
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return fail("Authentication required", 401);
  }
  trace = extendTrace(trace, { userId: session.uid });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
    (await request.json().catch(() => ({}))) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      orderId?: string;
    };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return fail("Missing Razorpay verification fields");
  }

  const intentSnapshot = await adminDb().collection("paymentIntents").doc(razorpay_order_id).get();
  const intent = intentSnapshot.data() as { orderId?: string; uid?: string; status?: string; amountSubunits?: number } | undefined;
  if (!intent || intent.orderId !== orderId || intent.uid !== session.uid) {
    return fail("Payment session is invalid.", 403);
  }
  if (intent.status === "paid") return NextResponse.json({ ok: true, status: "paid", duplicate: true });

  const { order, settings } = await getRazorpayRuntimeForOrder(orderId);
  trace = extendTrace(trace, { tenantId: settings.tenantId, restaurantId: settings.restaurantId });
  if (order.customerId !== session.uid) {
    return fail("Payment is not available for this order.", 403);
  }
  try {
    assertRazorpayUsable(settings);
  } catch {
    return fail(restaurantPaymentGatewayNotConfigured, 422);
  }
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, settings.keySecret)) {
    productionLogger.security("razorpay.verify.invalid_signature", { ...traceLogFields(trace), orderId, status: "rejected" });
    return fail("Invalid payment signature");
  }

  const payment = await createRazorpayClient(settings).payments.fetch(razorpay_payment_id).catch(() => null);
  if (!payment) {
    return fail("Payment gateway is unavailable. Please try again.", 502);
  }
  if (payment.order_id !== razorpay_order_id) {
    return fail("Payment does not match this order.");
  }
  if (intent.amountSubunits && Number(payment.amount ?? 0) !== Number(intent.amountSubunits)) {
    return fail("Payment amount mismatch.");
  }

  const scope = scopeFromRazorpayOrder(order, settings);
  const method = paymentMethod(payment.method);
  const amount = subunitsToAmount(payment.amount);
  const status = payment.status === "captured" || payment.captured ? "paid" : payment.status === "authorized" ? "authorized" : "failed";

  await adminDb().collection("paymentIntents").doc(razorpay_order_id).set({
    status,
    providerPaymentId: razorpay_payment_id,
    gatewayStatus: payment.status,
    verifiedBy: session.uid,
    verifiedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const repository = new OrderRepository();
  if (status === "paid") {
    await repository.recordPayment(scope, {
      orderId,
      amount,
      method,
      reference: razorpay_payment_id,
      cashierId: session.uid,
      role: "customer",
      provider: "razorpay",
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      gatewayStatus: payment.status,
      capturedAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
    });
  } else {
    await repository.recordGatewayPaymentEvent(scope, {
      orderId,
      amount,
      method,
      reference: razorpay_payment_id,
      cashierId: session.uid,
      role: "customer",
      provider: "razorpay",
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      gatewayStatus: payment.status,
      failureReason: payment.error_description,
      status,
    });
  }

  productionLogger.payment("razorpay.verify.completed", { ...traceLogFields(trace), orderId, status });
  return NextResponse.json({ ok: true, status });
  } catch (error) {
    return paymentRouteError(error, trace, "Payment verification could not be completed.");
  }
}

function paymentRouteError(error: unknown, trace: TraceContext, fallback: string) {
  return apiError(error, trace, fallback, 502);
}

function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}
