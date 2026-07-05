import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository, type OperationalEvent } from "@/repositories/order-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import type { OrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<OrderStatus>(["new", "accepted", "rejected", "preparing", "ready", "served", "picked-up", "delivered", "completed", "cancelled"]);
const paymentMethods = new Set(["cash", "upi", "card", "credit"]);
const printTypes = new Set(["bill", "kot", "receipt"]);
const timelineEvents = new Set(["order_created", "item_added", "item_removed", "discount", "coupon", "kitchen_sent", "kitchen_accepted", "kitchen_ready", "reminder", "payment", "completion", "split_bill", "transfer_table", "merge_tables"]);
type PaymentMethod = "cash" | "upi" | "card" | "credit";
type OrderPatchBody = {
  action?: string;
  orderId?: string;
  status?: OrderStatus;
  restaurantId?: string;
  kitchenOrderId?: string;
  amount?: number;
  method?: string;
  reference?: string;
  type?: "bill" | "kot" | "receipt";
  event?: string;
  note?: string;
  device?: string;
  tableNumber?: string;
  waiterName?: string;
  sourceOrderIds?: string[];
  sourceKitchenOrderIds?: string[];
  splits?: Array<{
    id?: string;
    customerName?: string;
    amount?: number;
    method?: string;
    basis?: "item" | "quantity" | "percentage" | "custom";
    itemId?: string;
    quantity?: number;
    percent?: number;
    receipt?: boolean;
    note?: string;
  }>;
};

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "orders", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 500);
  const orders = await new OrderRepository().list(scope, {
    from: startDate(request.nextUrl.searchParams.get("from")),
    to: endDate(request.nextUrl.searchParams.get("to")),
    limit: Number.isFinite(limit) ? limit : 500,
  });
  return NextResponse.json({ data: orders, count: orders.length });
}

export async function PATCH(request: NextRequest) {
  const requestId = requestIdFor();
  try {
    const access = await requireOwnerFeature(request, "orders", "update");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({})) as OrderPatchBody;
    if (!body.orderId) return NextResponse.json({ error: "Order id is required." }, { status: 400 });
    const scope = tenantScope(access.session, body.restaurantId);
    const orders = new OrderRepository();
    const actor = { userId: access.session.uid, role: access.session.role, device: cleanDevice(body.device ?? request.headers.get("user-agent") ?? "") };
    if (body.action === "payment") {
      const method = String(body.method ?? "");
      if (!paymentMethods.has(method) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return NextResponse.json({ error: "Valid payment method and amount are required." }, { status: 400 });
      const data = await orders.recordPayment(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number(body.amount), method: method as "cash" | "upi" | "card" | "credit", reference: body.reference, cashierId: access.session.uid });
      return NextResponse.json({ data });
    }
    if (body.action === "refund") {
      const method = String(body.method ?? "");
      if (!paymentMethods.has(method) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return NextResponse.json({ error: "Valid refund method and amount are required." }, { status: 400 });
      const data = await orders.recordRefund(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number(body.amount), method: method as "cash" | "upi" | "card" | "credit", reference: body.reference, cashierId: access.session.uid });
      return NextResponse.json({ data });
    }
    if (body.action === "print") {
      const type = printTypes.has(String(body.type)) ? body.type as "bill" | "kot" | "receipt" : "bill";
      const data = await orders.recordPrint(scope, { ...actor, orderId: body.orderId, type });
      return NextResponse.json({ data });
    }
    if (body.action === "event") {
      if (!body.event || !timelineEvents.has(body.event)) return NextResponse.json({ error: "Valid operational event is required." }, { status: 400 });
      const data = await orders.recordOperationalEvent(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, event: body.event as OperationalEvent, amount: body.amount, method: body.method, note: body.note });
      return NextResponse.json({ data });
    }
    if (body.action === "split_bill") {
      const splits = (body.splits ?? [])
        .map((split) => ({ ...split, amount: Number(split.amount), method: String(split.method ?? "") }))
        .filter((split) => Number.isFinite(split.amount) && split.amount > 0 && paymentMethods.has(split.method));
      if (!splits.length) return NextResponse.json({ error: "Valid split bill rows are required." }, { status: 400 });
      const data = await orders.recordSplitBill(scope, {
        ...actor,
        orderId: body.orderId,
        kitchenOrderId: body.kitchenOrderId,
        splits: splits.map((split) => ({ ...split, method: split.method as PaymentMethod })),
      });
      return NextResponse.json({ data });
    }
    if (body.action === "transfer_table") {
      const tableNumber = body.tableNumber?.trim();
      if (!tableNumber) return NextResponse.json({ error: "Target table is required." }, { status: 400 });
      const data = await orders.transferTable(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, tableNumber, waiterName: body.waiterName });
      return NextResponse.json({ data });
    }
    if (body.action === "merge_tables") {
      const sourceOrderIds = Array.isArray(body.sourceOrderIds) ? body.sourceOrderIds.filter(Boolean) : [];
      if (!sourceOrderIds.length) return NextResponse.json({ error: "At least one source order is required." }, { status: 400 });
      const data = await orders.mergeTables(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, sourceOrderIds, sourceKitchenOrderIds: body.sourceKitchenOrderIds, tableNumber: body.tableNumber });
      return NextResponse.json({ data });
    }
    if (!body.status || !statuses.has(body.status)) return NextResponse.json({ error: "Valid order status is required." }, { status: 400 });
    const data = await orders.updateStatus(scope, body.orderId, body.status, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return orderError(error, requestId);
  }
}

function cleanDevice(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 160);
}

function orderError(error: unknown, requestId: string) {
  console.error("[owner-orders-api] request failed", { requestId, message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  const message = error instanceof Error ? error.message : "";
  if (/Order not found|no longer active/i.test(message)) return NextResponse.json({ error: "This order is no longer active. Please refresh.", requestId }, { status: 404 });
  if (/Kitchen ticket not found/i.test(message)) return NextResponse.json({ error: "Kitchen ticket not found.", requestId }, { status: 404 });
  if (/already been collected|already paid/i.test(message)) return NextResponse.json({ error: "Payment has already been collected.", requestId }, { status: 409 });
  if (/split bill|balance due|source order|target table|required/i.test(message)) return NextResponse.json({ error: message, requestId }, { status: 400 });
  if (/deadline|timeout|unavailable|network|fetch/i.test(message)) return NextResponse.json({ error: "Unable to contact server. Please retry.", requestId }, { status: 503 });
  return NextResponse.json({ error: `Unexpected error. Reference ID ${requestId}`, requestId }, { status: 500 });
}

function requestIdFor() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function startDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function endDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
