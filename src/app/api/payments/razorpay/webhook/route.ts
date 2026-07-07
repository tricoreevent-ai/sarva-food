import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { dispatchPendingTenantPushNotifications } from "@/lib/server/push-notifications";
import {
  getRazorpayRuntimeForProviderOrder,
  paymentMethod,
  restaurantPaymentGatewayNotConfigured,
  scopeFromRazorpayOrder,
  subunitsToAmount,
  verifyRazorpaySignature,
  type RazorpayPaymentEntity,
  type RazorpayRefundEntity,
} from "@/lib/server/owner-payment-settings";
import { OrderRepository } from "@/repositories/order-repository";
import type { TenantScope } from "@/repositories/shared";
import type { OrderDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
    dispute?: { entity?: { id?: string; payment_id?: string; status?: string; amount?: number; reason_code?: string; phase?: string } };
    payment_downtime?: { entity?: { id?: string; status?: string; method?: string; bank?: string; started_at?: number; ended_at?: number } };
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
  const dispute = event.payload?.dispute?.entity;
  const orderEntity = event.payload?.order?.entity;
  const providerOrderId = payment?.order_id || orderEntity?.id || await providerOrderIdForPayment(refund?.payment_id || dispute?.payment_id) || "";
  const runtime = providerOrderId ? await getRazorpayRuntimeForProviderOrder(providerOrderId).catch(() => null) : null;
  const webhookSecret = runtime?.settings.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (runtime?.settings && !runtime.settings.webhookEnabled) {
    return NextResponse.json({ error: restaurantPaymentGatewayNotConfigured }, { status: 422 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ error: restaurantPaymentGatewayNotConfigured }, { status: 422 });
  }
  if (!verifyRazorpaySignature(body, signature, webhookSecret)) {
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
      providerDisputeId: dispute?.id,
      restaurantId: runtime?.settings.restaurantId ?? "",
      tenantId: runtime?.settings.tenantId ?? "",
      matchStatus: providerOrderId && runtime ? "matched" : "unmatched",
      status: "received",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handleWebhookEvent(event, providerOrderId, runtime);
    await webhookRef.set({ status: "processed", processedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await webhookRef.set({
      status: "failed",
      error: error instanceof Error ? error.name : "WebhookProcessingFailed",
      processedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ ok: true, deferred: true });
  }
}

type RazorpayRuntimeContext = Awaited<ReturnType<typeof getRazorpayRuntimeForProviderOrder>> | null;

async function handleWebhookEvent(event: RazorpayWebhookEvent, providerOrderId: string, runtime: RazorpayRuntimeContext) {
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const dispute = event.payload?.dispute?.entity;
  const downtime = event.payload?.payment_downtime?.entity;
  if (!runtime) {
    await recordUnmatchedWebhookEvent(event, providerOrderId, dispute?.id || downtime?.id || payment?.id || refund?.id);
    return;
  }
  const { order, settings } = runtime;
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

  if (event.event?.startsWith("payment.dispute.")) {
    await recordRazorpayWebhookOperationalEvent(scope, order, {
      event: event.event,
      providerOrderId,
      providerPaymentId: dispute?.payment_id || payment?.id,
      providerDisputeId: dispute?.id,
      amount: subunitsToAmount(dispute?.amount),
      gatewayStatus: dispute?.status || event.event.replace("payment.dispute.", ""),
      reason: dispute?.reason_code || dispute?.phase || "Razorpay dispute update",
      priority: event.event === "payment.dispute.won" || event.event === "payment.dispute.closed" ? "normal" : "high",
    });
    return;
  }

  if (event.event?.startsWith("payment.downtime.")) {
    await recordRazorpayWebhookOperationalEvent(scope, order, {
      event: event.event,
      providerOrderId,
      providerPaymentId: payment?.id,
      providerDowntimeId: downtime?.id,
      gatewayStatus: downtime?.status || event.event.replace("payment.downtime.", ""),
      reason: [downtime?.method, downtime?.bank].filter(Boolean).join(" ") || "Razorpay downtime update",
      priority: event.event === "payment.downtime.resolved" ? "normal" : "high",
    });
  }
}

async function recordRazorpayWebhookOperationalEvent(scope: TenantScope, order: OrderDoc | null, input: {
  event: string;
  providerOrderId: string;
  providerPaymentId?: string;
  providerDisputeId?: string;
  providerDowntimeId?: string;
  amount?: number;
  gatewayStatus?: string;
  reason?: string;
  priority: "normal" | "high";
}) {
  const now = new Date();
  const title = input.event.startsWith("payment.dispute.") ? "Razorpay dispute update" : "Razorpay downtime update";
  const message = webhookMessage(input.event, input.reason);
  const timeline = cleanRecord({
    type: input.event,
    timestamp: now,
    provider: "razorpay",
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    providerDisputeId: input.providerDisputeId,
    providerDowntimeId: input.providerDowntimeId,
    amount: input.amount,
    gatewayStatus: input.gatewayStatus,
    reason: input.reason,
  });
  const auditRef = adminDb().collection("auditLogs").doc();
  const notificationRef = adminDb().collection("notifications").doc();
  const writes: Promise<unknown>[] = [
    auditRef.set(cleanRecord({
      id: auditRef.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      action: input.event,
      module: "payments",
      entityId: order?.id || input.providerOrderId,
      after: timeline,
      createdAt: FieldValue.serverTimestamp(),
    })),
    notificationRef.set(cleanRecord({
      id: notificationRef.id,
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      type: "payment",
      title,
      message,
      priority: input.priority,
      orderId: order?.id,
      link: order?.id ? `/owner/pos?orderId=${encodeURIComponent(order.id)}` : "/owner/pos",
      sound: "pos-alert",
      pushStatus: "pending",
      pushAttempts: 0,
      audience: ["owner", "manager", "cashier"],
      readBy: [],
      createdAt: FieldValue.serverTimestamp(),
    })),
  ];
  if (order?.id) {
    writes.push(
      adminDb().collection("orders").doc(order.id).set({ paymentTimeline: FieldValue.arrayUnion(timeline), auditTimeline: FieldValue.arrayUnion(timeline), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      adminDb().collection("customerOrders").doc(order.id).set({ paymentTimeline: FieldValue.arrayUnion(timeline), auditTimeline: FieldValue.arrayUnion(timeline), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    );
  }
  await Promise.all(writes);
  await dispatchPendingTenantPushNotifications(scope).catch((error) => {
    console.error("[razorpay-webhook] push dispatch failed", { reason: error instanceof Error ? error.name : typeof error });
  });
}

async function recordUnmatchedWebhookEvent(event: RazorpayWebhookEvent, providerOrderId: string, providerEntityId?: string) {
  const ref = adminDb().collection("auditLogs").doc();
  await ref.set(cleanRecord({
    id: ref.id,
    tenantId: "",
    restaurantId: "",
    action: event.event || "razorpay_webhook_unmatched",
    module: "payments",
    entityId: providerOrderId || providerEntityId,
    after: { provider: "razorpay", event: event.event, providerOrderId, providerEntityId, matchStatus: "unmatched" },
    createdAt: FieldValue.serverTimestamp(),
  }));
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

function webhookMessage(event: string, reason?: string) {
  const readable = event.replace(/^payment\./, "").replace(/[._]/g, " ");
  return reason ? `${readable}: ${reason}` : readable;
}

function cleanRecord<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== "")) as T;
}
