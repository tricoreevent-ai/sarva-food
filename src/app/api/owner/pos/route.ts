import { NextResponse, type NextRequest } from "next/server";
import { CustomerRepository } from "@/repositories/customer-repository";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { MenuRepository } from "@/repositories/menu-repository";
import { OrderRepository } from "@/repositories/order-repository";
import { StaffRepository } from "@/repositories/staff-repository";
import { TableRepository } from "@/repositories/table-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { customerDocToLoyaltyCustomer, kitchenDocToTableOrder, menuDocToMenuItem, orderDocToDemoOrder, staffDocToStaffMember, tableDocToPosTable } from "@/lib/operational-api-mappers";
import { logOperationalEvent, logOperationalFailure } from "@/lib/server/operational-logging";
import { createTraceContext, extendTrace, publicTraceMeta, traceDurationMs, traceLogFields, type TraceContext } from "@/lib/server/request-trace";
import type { OrderDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "pos", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const ordersRepo = new OrderRepository();
  const [orders, kitchen, menu, customers, tables, staff] = await Promise.all([
    ordersRepo.list(scope, { limit: 500 }),
    new KitchenRepository().list(scope),
    new MenuRepository().list(scope),
    new CustomerRepository().list(scope),
    new TableRepository().list(scope),
    new StaffRepository().list(scope),
  ]);
  const draft = await ordersRepo.getPosDraft(scope);
  return NextResponse.json({
    data: {
      orders: orders.map(orderDocToOperationalDemoOrder),
      kitchen: kitchen.map(kitchenDocToTableOrder),
      menu: menu.map(menuDocToMenuItem),
      customers: customers.map(customerDocToLoyaltyCustomer),
      tables: tables.map(tableDocToPosTable),
      staff: staff.map(staffDocToStaffMember),
      draft: draft ? orderDocToPosDraft(draft) : null,
    },
    counts: { orders: orders.length, kitchen: kitchen.length, menu: menu.length, customers: customers.length, tables: tables.length, staff: staff.length },
  });
}

export async function PATCH(request: NextRequest) {
  let trace = createTraceContext(request);
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
    const access = await requireOwnerFeature(request, "pos", "create");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({}));
    if (!body.bill || !Array.isArray(body.bill.lines)) return fail("Valid POS draft is required.");
    const scope = tenantScope(access.session, body.restaurantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const draft = await new OrderRepository().savePosDraft(scope, body);
    logOperationalEvent("owner.pos.patch", { ...traceLogFields(trace), action: "draft", outcome: "ok", durationMs: traceDurationMs(trace), role: access.session.role });
    return NextResponse.json({ data: draft ? orderDocToPosDraft(draft) : null });
  } catch (error) {
    return posError("draft", error, trace);
  }
}

export async function POST(request: NextRequest) {
  let trace = createTraceContext(request);
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
    const access = await requireOwnerFeature(request, "pos", "create");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({}));
    if (!body.kitchenOrderId) return fail("Kitchen ticket not found.");
    const scope = tenantScope(access.session, body.restaurantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const order = await new OrderRepository().placePosDraft(scope, { kitchenOrderId: String(body.kitchenOrderId) });
    logOperationalEvent("owner.pos.post", { ...traceLogFields(trace), action: "place", outcome: "ok", durationMs: traceDurationMs(trace), role: access.session.role, orderId: order.id, kitchenOrderId: body.kitchenOrderId });
    return NextResponse.json({ data: orderDocToOperationalDemoOrder(order), raw: order });
  } catch (error) {
    return posError("place", error, trace);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireOwnerFeature(request, "pos", "create");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  await new OrderRepository().deletePosDraft(scope);
  return NextResponse.json({ ok: true });
}

function posError(action: string, error: unknown, trace: TraceContext) {
  const requestId = trace.requestId;
  const meta = publicTraceMeta(trace);
  const response = (message: string, status: number) => NextResponse.json({ error: message, requestId, meta }, { status });
  logOperationalFailure("owner.pos.request", error, { ...traceLogFields(trace), action, durationMs: traceDurationMs(trace) });
  const message = error instanceof Error ? error.message : "";
  if (/POS draft not found|draft/i.test(message)) return response("This order is no longer active. Please refresh.", 409);
  if (/Kitchen ticket not found|Kitchen order/i.test(message)) return response("Kitchen ticket not found.", 404);
  if (/deadline|timeout|unavailable|network|fetch/i.test(message)) return response("Unable to contact server. Please retry.", 503);
  return response(`Unexpected error. Reference ID ${requestId}`, 500);
}

function orderDocToOperationalDemoOrder(order: OrderDoc) {
  return {
    ...orderDocToDemoOrder(order),
    paymentTimeline: (order as OrderDoc & { paymentTimeline?: unknown[] }).paymentTimeline ?? [],
    auditTimeline: (order as OrderDoc & { auditTimeline?: unknown[] }).auditTimeline ?? [],
    statusHistory: order.statusHistory ?? [],
    splitBills: (order as OrderDoc & { splitBills?: unknown[] }).splitBills ?? [],
    corrections: (order as OrderDoc & { corrections?: unknown[] }).corrections ?? [],
    paymentLock: (order as OrderDoc & { paymentLock?: unknown }).paymentLock,
    paidAmount: (order as OrderDoc & { paidAmount?: number }).paidAmount,
    mergedOrderIds: (order as OrderDoc & { mergedOrderIds?: string[] }).mergedOrderIds ?? [],
    mergedIntoOrderId: (order as OrderDoc & { mergedIntoOrderId?: string }).mergedIntoOrderId,
    tableNumber: order.tableNumber,
    waiterName: order.waiterName,
  };
}

function orderDocToPosDraft(order: OrderDoc) {
  return {
    table: order.tableNumber || "DIRECT",
    orderType: order.orderType || "dine-in",
    lines: (order.lines ?? []).map((line) => ({ itemId: line.menuItemId, name: line.name, price: Number(line.price ?? 0), quantity: Number(line.quantity ?? 0) })),
    payment: order.paymentStatus === "paid" ? "upi" : "cash",
    paid: order.paymentStatus === "paid",
    customerId: order.customerId.startsWith("pos-draft:") ? undefined : order.customerId,
    customerName: order.customerName === "Walk-in customer" ? "" : order.customerName,
    customerPhone: order.customerPhone,
    waiterName: order.waiterName,
    discount: Number(order.discount ?? 0),
    invoiceNumber: order.invoiceNumber,
  };
}
