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
  const requestId = requestIdFor();
  try {
    const access = await requireOwnerFeature(request, "pos", "update");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({}));
    if (!body.bill || !Array.isArray(body.bill.lines)) return NextResponse.json({ error: "Valid POS draft is required." }, { status: 400 });
    const scope = tenantScope(access.session, body.restaurantId);
    const draft = await new OrderRepository().savePosDraft(scope, body);
    return NextResponse.json({ data: draft ? orderDocToPosDraft(draft) : null });
  } catch (error) {
    return posError("draft", error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFor();
  try {
    const access = await requireOwnerFeature(request, "pos", "create");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({}));
    if (!body.kitchenOrderId) return NextResponse.json({ error: "Kitchen ticket not found." }, { status: 400 });
    const scope = tenantScope(access.session, body.restaurantId);
    const order = await new OrderRepository().placePosDraft(scope, { kitchenOrderId: String(body.kitchenOrderId) });
    return NextResponse.json({ data: orderDocToOperationalDemoOrder(order), raw: order });
  } catch (error) {
    return posError("place", error, requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireOwnerFeature(request, "pos", "update");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  await new OrderRepository().deletePosDraft(scope);
  return NextResponse.json({ ok: true });
}

function posError(action: string, error: unknown, requestId: string) {
  console.error("[owner-pos-api] request failed", { action, requestId, message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  const message = error instanceof Error ? error.message : "";
  if (/POS draft not found|draft/i.test(message)) return NextResponse.json({ error: "This order is no longer active. Please refresh.", requestId }, { status: 409 });
  if (/Kitchen ticket not found|Kitchen order/i.test(message)) return NextResponse.json({ error: "Kitchen ticket not found.", requestId }, { status: 404 });
  if (/deadline|timeout|unavailable|network|fetch/i.test(message)) return NextResponse.json({ error: "Unable to contact server. Please retry.", requestId }, { status: 503 });
  return NextResponse.json({ error: `Unexpected error. Reference ID ${requestId}`, requestId }, { status: 500 });
}

function requestIdFor() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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
