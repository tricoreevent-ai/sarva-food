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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`razorpay-order:${ip}`, 20).ok) {
    return NextResponse.json({ error: "Too many payment attempts" }, { status: 429 });
  }

  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { orderId, amount } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    amount?: number;
  };
  if (!orderId) return NextResponse.json({ error: "Order id is required" }, { status: 400 });

  const { order, settings } = await getRazorpayRuntimeForOrder(orderId);
  if (order.customerId !== session.uid) {
    return NextResponse.json({ error: "Payment is not available for this order." }, { status: 403 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }
  try {
    assertRazorpayUsable(settings);
  } catch {
    return NextResponse.json({ error: restaurantPaymentGatewayNotConfigured }, { status: 422 });
  }

  const orderTotal = Number(order.total ?? 0);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return NextResponse.json({ error: "Order amount is invalid." }, { status: 400 });
  }
  if (Number.isFinite(amount) && amount && Math.abs(Number(amount) - orderTotal) > 0.01) {
    return NextResponse.json({ error: "Order amount changed. Please refresh checkout." }, { status: 409 });
  }
  if (orderTotal < settings.minimumAmount || orderTotal > settings.maximumAmount) {
    return NextResponse.json({ error: "This order amount is outside the configured payment range." }, { status: 422 });
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
    return NextResponse.json({ error: "Payment gateway is unavailable. Please try again." }, { status: 502 });
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
}
