import { NextResponse, type NextRequest } from "next/server";
import {
  amountToSubunits,
  assertRazorpayUsable,
  createRazorpayClient,
  getRazorpayRuntimeForOrder,
  paymentMethod,
  subunitsToAmount,
} from "@/lib/server/owner-payment-settings";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { tenantScope } from "@/repositories/shared";
import { OrderRepository } from "@/repositories/order-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "orders", "update");
  if (access.error) return access.error;

  const body = await request.json().catch(() => ({})) as {
    orderId?: string;
    paymentId?: string;
    amount?: number;
    reason?: string;
  };
  if (!body.orderId || !body.paymentId) {
    return NextResponse.json({ error: "Order id and Razorpay payment id are required." }, { status: 400 });
  }

  const { order, settings } = await getRazorpayRuntimeForOrder(body.orderId);
  const scope = tenantScope(access.session, order.restaurantId || order.tenantId);
  assertRazorpayUsable(settings);
  if (!settings.refundEnabled) {
    return NextResponse.json({ error: "Razorpay refunds are disabled for this restaurant." }, { status: 403 });
  }

  const client = createRazorpayClient(settings);
  const payment = await client.payments.fetch(body.paymentId);
  if (payment.status !== "captured" && !payment.captured) {
    return NextResponse.json({ error: "Only captured Razorpay payments can be refunded." }, { status: 409 });
  }

  const amount = Number(body.amount ?? 0);
  const refund = await client.payments.refund(body.paymentId, {
    ...(amount > 0 ? { amount: amountToSubunits(amount) } : {}),
    notes: {
      orderId: body.orderId,
      reason: body.reason?.trim() || "Owner refund",
    },
  });

  const refundAmount = subunitsToAmount(refund.amount) || amount || subunitsToAmount(payment.amount);
  const data = await new OrderRepository().recordRefund(scope, {
    orderId: body.orderId,
    amount: refundAmount,
    method: paymentMethod(payment.method),
    reference: refund.id,
    cashierId: access.session.uid,
    role: access.session.role,
    provider: "razorpay",
    providerPaymentId: body.paymentId,
    providerOrderId: payment.order_id,
    providerRefundId: refund.id,
    gatewayStatus: refund.status,
    reason: body.reason?.trim() || "Owner refund",
  });

  return NextResponse.json({ data, refund });
}
