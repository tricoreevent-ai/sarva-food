import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import {
  getRazorpayRuntimeForProviderOrder,
  paymentMethod,
  scopeFromRazorpayOrder,
  subunitsToAmount,
  verifyRazorpaySignature,
  type RazorpayPaymentEntity,
  type RazorpayRefundEntity,
} from "@/lib/server/owner-payment-settings";
import { OrderRepository } from "@/repositories/order-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
    order?: { entity?: { id?: string; amount_paid?: number; status?: string } };
  };
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id") || createHash("sha256").update(body).digest("hex");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const event = parseWebhook(body);
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const orderEntity = event.payload?.order?.entity;
  const providerOrderId = payment?.order_id || orderEntity?.id || await providerOrderIdForPayment(refund?.payment_id);
  if (!providerOrderId) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });

  const { settings } = await getRazorpayRuntimeForProviderOrder(providerOrderId);
  if (!settings.webhookEnabled || !settings.webhookSecret) {
    return NextResponse.json({ error: "Webhook is not enabled for this restaurant." }, { status: 403 });
  }
  if (!verifyRazorpaySignature(body, signature, settings.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const webhookRef = adminDb().collection("paymentWebhooks").doc(`razorpay-${eventId}`);
  try {
    await webhookRef.create({
      provider: "razorpay",
      eventId,
      event: event.event,
      providerPaymentId: payment?.id || refund?.payment_id,
      providerOrderId,
      providerRefundId: refund?.id,
      restaurantId: settings.restaurantId,
      tenantId: settings.tenantId,
      status: "received",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handleWebhookEvent(event, providerOrderId);
    await webhookRef.set({ status: "processed", processedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await webhookRef.set({
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 200) : "Webhook processing failed.",
      processedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ ok: true, deferred: true });
  }
}

async function handleWebhookEvent(event: RazorpayWebhookEvent, providerOrderId: string) {
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const { order, settings } = await getRazorpayRuntimeForProviderOrder(providerOrderId);
  const repository = new OrderRepository();
  const scope = scopeFromRazorpayOrder(order, settings);

  if (event.event === "payment.authorized" && payment && order?.paymentStatus !== "paid") {
    await adminDb().collection("paymentIntents").doc(providerOrderId).set({
      status: "authorized",
      providerPaymentId: payment.id,
      gatewayStatus: payment.status,
      webhookUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await repository.recordGatewayPaymentEvent(scope, {
      orderId: order?.id ?? "",
      amount: subunitsToAmount(payment.amount),
      method: paymentMethod(payment.method),
      reference: payment.id,
      provider: "razorpay",
      providerPaymentId: payment.id,
      providerOrderId,
      gatewayStatus: payment.status,
      status: "authorized",
    });
    return;
  }

  if ((event.event === "payment.captured" || event.event === "order.paid") && order && order.paymentStatus !== "paid") {
    await adminDb().collection("paymentIntents").doc(providerOrderId).set({
      status: "paid",
      providerPaymentId: payment?.id,
      gatewayStatus: payment?.status ?? "paid",
      webhookUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await repository.recordPayment(scope, {
      orderId: order.id,
      amount: subunitsToAmount(payment?.amount) || Number(order.total ?? 0),
      method: paymentMethod(payment?.method),
      reference: payment?.id,
      provider: "razorpay",
      providerPaymentId: payment?.id,
      providerOrderId,
      gatewayStatus: payment?.status ?? "paid",
      capturedAt: payment?.created_at ? new Date(payment.created_at * 1000) : new Date(),
    });
    return;
  }

  if (event.event === "payment.failed" && payment && order?.paymentStatus !== "paid") {
    await adminDb().collection("paymentIntents").doc(providerOrderId).set({
      status: "failed",
      providerPaymentId: payment.id,
      gatewayStatus: payment.status,
      failureReason: payment.error_description,
      webhookUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await repository.recordGatewayPaymentEvent(scope, {
      orderId: order?.id ?? "",
      amount: subunitsToAmount(payment.amount),
      method: paymentMethod(payment.method),
      reference: payment.id,
      provider: "razorpay",
      providerPaymentId: payment.id,
      providerOrderId,
      gatewayStatus: payment.status,
      failureReason: payment.error_description,
      status: "failed",
    });
    return;
  }

  if (event.event === "refund.created" && refund) {
    await adminDb().collection("paymentIntents").doc(providerOrderId).set({
      refundStatus: "created",
      providerRefundId: refund.id,
      webhookUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return;
  }

  if (event.event === "refund.processed" && refund && order) {
    await adminDb().collection("paymentIntents").doc(providerOrderId).set({
      refundStatus: "processed",
      providerRefundId: refund.id,
      webhookUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await repository.recordRefund(scope, {
      orderId: order.id,
      amount: subunitsToAmount(refund.amount),
      method: "card",
      reference: refund.id,
      provider: "razorpay",
      providerPaymentId: refund.payment_id,
      providerOrderId,
      providerRefundId: refund.id,
      gatewayStatus: refund.status,
      reason: refund.notes?.reason,
    });
  }
}

async function providerOrderIdForPayment(providerPaymentId?: string) {
  if (!providerPaymentId) return "";
  const intent = await adminDb().collection("paymentIntents").where("providerPaymentId", "==", providerPaymentId).limit(1).get();
  return intent.docs[0]?.id ?? "";
}

function parseWebhook(body: string) {
  try {
    return JSON.parse(body) as RazorpayWebhookEvent;
  } catch {
    return {};
  }
}
