import { NextResponse, type NextRequest } from "next/server";
import {
  amountToSubunits,
  assertRazorpayUsable,
  createRazorpayClient,
  getRazorpayRuntimeForOrder,
  paymentMethod,
  restaurantPaymentGatewayNotConfigured,
  subunitsToAmount,
  withPaymentProviderTimeout,
} from "@/lib/server/owner-payment-settings";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { tenantScope } from "@/repositories/shared";
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
    const access = await requireOwnerFeature(request, "orders", "update");
    if (access.error) return access.error;
    trace = extendTrace(trace, { userId: access.session.uid });

    const body = await request.json().catch(() => ({})) as {
      orderId?: string;
      paymentId?: string;
      amount?: number;
      reason?: string;
    };
    if (!body.orderId || !body.paymentId) {
      return fail("Order id and Razorpay payment id are required.");
    }

    const { order, settings } = await getRazorpayRuntimeForOrder(body.orderId);
    const scope = tenantScope(access.session, order.restaurantId || order.tenantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
    try {
      assertRazorpayUsable(settings);
    } catch {
      return fail(restaurantPaymentGatewayNotConfigured, 422);
    }
    if (!settings.refundEnabled) {
      return fail("Razorpay refunds are disabled for this restaurant.", 403);
    }

    const client = createRazorpayClient(settings);
    const payment = await withPaymentProviderTimeout(client.payments.fetch(body.paymentId)).catch(() => null);
    if (!payment) {
      return fail("Payment gateway is unavailable. Please try again.", 502);
    }
    if (payment.status !== "captured" && !payment.captured) {
      return fail("Only captured Razorpay payments can be refunded.", 409);
    }

    const amount = Number(body.amount ?? 0);
    const refund = await withPaymentProviderTimeout(client.payments.refund(body.paymentId, {
      ...(amount > 0 ? { amount: amountToSubunits(amount) } : {}),
      notes: {
        orderId: body.orderId,
        reason: body.reason?.trim() || "Owner refund",
      },
    })).catch(() => null);
    if (!refund) {
      return fail("Refund was rejected by the payment gateway.", 502);
    }

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

    productionLogger.payment("razorpay.refund.completed", { ...traceLogFields(trace), orderId: body.orderId, amount: refundAmount, status: refund.status, role: access.session.role });
    return NextResponse.json({ data, refund });
  } catch (error) {
    return paymentRouteError(error, trace, "Refund could not be completed.");
  }
}

function paymentRouteError(error: unknown, trace: TraceContext, fallback: string) {
  return apiError(error, trace, fallback, 502);
}
