import { NextResponse, type NextRequest } from "next/server";
import { AuditRepository } from "@/repositories/audit-repository";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { OrderRepository } from "@/repositories/order-repository";
import { TableRepository } from "@/repositories/table-repository";
import type { OrderDoc, OrderLineDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    token?: string;
    sessionId?: string;
    customerName?: string;
    customerPhone?: string;
    fulfillmentType?: "dine-in" | "parcel";
    lines?: OrderLineDoc[];
    note?: string;
    idempotencyKey?: string;
  };
  if (!body.token || !body.sessionId || !body.customerName?.trim() || !body.customerPhone?.trim() || !body.lines?.length) {
    return NextResponse.json({ error: "Session, customer, and order items are required." }, { status: 400 });
  }
  const tableRepo = new TableRepository();
  const table = await tableRepo.touchSession(body.token, body.sessionId, { type: "order_reviewed", message: "QR order submitted" }).catch((error) => error);
  if (table instanceof Error) return NextResponse.json({ error: table.message }, { status: 409 });
  const fulfillmentType = body.fulfillmentType === "parcel" ? "parcel" : "dine-in";
  const orderRepo = new OrderRepository();
  const lines = await orderRepo.resolveOrderLines(table.restaurantId, fulfillmentType, body.lines);
  if (!lines) return NextResponse.json({ error: "One or more items are unavailable." }, { status: 422 });
  const restaurant = await orderRepo.restaurant(table.restaurantId);
  if (!restaurant?.active) return NextResponse.json({ error: "Restaurant is not accepting orders." }, { status: 409 });
  const now = new Date();
  const subtotal = money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
  const tax = money(subtotal * 0.05);
  const orderId = orderRepo.newOrderId();
  const order = {
    id: orderId,
    tenantId: table.tenantId,
    restaurantId: table.restaurantId,
    branchId: table.branchId,
    customerId: `qr:${body.sessionId}`,
    customerName: body.customerName.trim(),
    customerPhone: body.customerPhone.trim(),
    channel: "qr",
    orderSource: "QR",
    status: "new",
    foodStatus: "new",
    lines,
    subtotal,
    discount: 0,
    tax,
    deliveryFee: 0,
    total: money(subtotal + tax),
    paymentStatus: "pending",
    statusHistory: [{ status: "new", foodStatus: "new", paymentStatus: "pending", at: now, by: `qr:${body.sessionId}` }],
    preparedBy: "",
    servedBy: "",
    completedBy: "",
    printedCount: 0,
    lastPrintedAt: null,
    deliveryOtp: orderId.slice(-4),
    fulfillmentType,
    orderType: fulfillmentType,
    tableNumber: table.tableNumber,
    acceptedTermsAt: now,
    createdAt: now,
    updatedAt: now,
  } satisfies OrderDoc;
  await orderRepo.create(order);
  await new KitchenRepository().create({ tenantId: table.tenantId, branchIds: [table.branchId], uid: `qr:${body.sessionId}` }, {
    id: order.id,
    tableNumber: table.tableNumber,
    source: "QR",
    orderType: fulfillmentType,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    lines,
    subtotal,
    tax,
    total: order.total,
    paymentStatus: "pending",
    status: "new",
    foodStatus: "new",
    etaMinutes: restaurant.scheduling?.minPrepMinutes ?? 12,
  });
  await new AuditRepository().record({ tenantId: table.tenantId, restaurantId: table.restaurantId, branchId: table.branchId, userId: order.customerId, role: "customer", action: "qr_order_create", module: "orders", entityId: order.id, after: { tableNumber: table.tableNumber, total: order.total } });
  await tableRepo.touchSession(body.token, body.sessionId, { type: "order_created", message: `Order ${order.id} created` });
  return NextResponse.json({ ok: true, orderId: order.id, status: order.status }, { status: 201 });
}

function money(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}
