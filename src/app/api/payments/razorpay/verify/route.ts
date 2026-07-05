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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
    (await request.json().catch(() => ({}))) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      orderId?: string;
    };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return NextResponse.json({ error: "Missing Razorpay verification fields" }, { status: 400 });
  }

  const intentSnapshot = await adminDb().collection("paymentIntents").doc(razorpay_order_id).get();
  const intent = intentSnapshot.data() as { orderId?: string; uid?: string; status?: string; amountSubunits?: number } | undefined;
  if (!intent || intent.orderId !== orderId || intent.uid !== session.uid) {
    return NextResponse.json({ error: "Payment session is invalid." }, { status: 403 });
  }
  if (intent.status === "paid") return NextResponse.json({ ok: true, status: "paid", duplicate: true });

  const { order, settings } = await getRazorpayRuntimeForOrder(orderId);
  if (order.customerId !== session.uid) {
    return NextResponse.json({ error: "Payment is not available for this order." }, { status: 403 });
  }
  try {
    assertRazorpayUsable(settings);
  } catch {
    return NextResponse.json({ error: restaurantPaymentGatewayNotConfigured }, { status: 422 });
  }
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, settings.keySecret)) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const payment = await createRazorpayClient(settings).payments.fetch(razorpay_payment_id).catch(() => null);
  if (!payment) {
    return NextResponse.json({ error: "Payment gateway is unavailable. Please try again." }, { status: 502 });
  }
  if (payment.order_id !== razorpay_order_id) {
    return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 });
  }
  if (intent.amountSubunits && Number(payment.amount ?? 0) !== Number(intent.amountSubunits)) {
    return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
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

  return NextResponse.json({ ok: true, status });
}

function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}
