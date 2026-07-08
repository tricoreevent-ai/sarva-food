import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  amountToSubunits,
  assertRazorpayUsable,
  createRazorpayClient,
  getRazorpayRuntimeForOrder,
  restaurantPaymentGatewayNotConfigured,
} from "@/lib/server/owner-payment-settings";
import { apiError } from "@/lib/server/api-response";
import { productionLogger } from "@/lib/server/production-logger";
import { createTraceContext, extendTrace, publicTraceMeta, traceLogFields, type TraceContext } from "@/lib/server/request-trace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let trace = createTraceContext(request);
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`razorpay-order:${ip}`, 20).ok) {
    return fail("Too many payment attempts", 429);
  }

  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return fail("Authentication required", 401);
  }
  trace = extendTrace(trace, { userId: session.uid });

  const { orderId, amount } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    amount?: number;
  };
  if (!orderId) return fail("Order id is required");

  const { order, settings } = await getRazorpayRuntimeForOrder(orderId);
  trace = extendTrace(trace, { tenantId: settings.tenantId, restaurantId: settings.restaurantId });
  if (order.customerId !== session.uid) {
    return fail("Payment is not available for this order.", 403);
  }
  if (order.paymentStatus === "paid") {
    return fail("This order is already paid.", 409);
  }
  try {
    assertRazorpayUsable(settings);
  } catch {
    return fail(restaurantPaymentGatewayNotConfigured, 422);
  }

  const orderTotal = Number(order.total ?? 0);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return fail("Order amount is invalid.");
  }
  if (Number.isFinite(amount) && amount && Math.abs(Number(amount) - orderTotal) > 0.01) {
    return fail("Order amount changed. Please refresh checkout.", 409);
  }
  if (orderTotal < settings.minimumAmount || orderTotal > settings.maximumAmount) {
    return fail("This order amount is outside the configured payment range.", 422);
  }

  const receipt = `${settings.receiptPrefix}-${order.id}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  let providerOrder: Awaited<ReturnType<ReturnType<typeof createRazorpayClient>["orders"]["create"]>>;
  try {
    providerOrder = await createRazorpayClient(settings).orders.create({
      amount: amountToSubunits(orderTotal),
      currency: settings.currency,
      receipt,
      partial_payment: settings.partialPayments,
      ...(settings.partialPayments ? { first_payment_min_amount: amountToSubunits(settings.minimumAmount) } : {}),
      notes: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        tenantId: order.tenantId,
        customerId: session.uid,
      },
    });
  } catch {
    return fail("Payment gateway is unavailable. Please try again.", 502);
  }

  await adminDb().collection("paymentIntents").doc(providerOrder.id).set({
    provider: "razorpay",
    providerOrderId: providerOrder.id,
    ownerId: settings.ownerId,
    orderId: order.id,
    restaurantId: settings.restaurantId,
    tenantId: settings.tenantId,
    amount: orderTotal,
    amountSubunits: providerOrder.amount,
    currency: providerOrder.currency,
    mode: settings.mode,
    status: "created",
    uid: session.uid,
    receipt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  productionLogger.payment("razorpay.order.created", { ...traceLogFields(trace), orderId: order.id, tenantId: settings.tenantId, restaurantId: settings.restaurantId, amount: orderTotal, status: "created" });
  return NextResponse.json({
    provider: "razorpay",
    keyId: settings.keyId,
    providerOrderId: providerOrder.id,
    orderId: order.id,
    amount: providerOrder.amount,
    currency: providerOrder.currency,
    name: settings.companyName,
    image: settings.companyLogo,
    methods: settings.methods,
    prefill: {
      name: order.customerName,
      contact: order.customerPhone,
    },
  });
  } catch (error) {
    return paymentRouteError(error, trace, "Payment order could not be created.");
  }
}

function paymentRouteError(error: unknown, trace: TraceContext, fallback: string) {
  return apiError(error, trace, fallback, 502);
}
