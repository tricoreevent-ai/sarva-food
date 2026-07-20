import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository, type OperationalEvent } from "@/repositories/order-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { canAccessOperationalFeature } from "@/lib/operational-access";
import type { VerifiedSession } from "@/lib/server-auth";
import { operationKey as makeOperationKey } from "@/lib/server/operation-idempotency";
import { logOperationalEvent, logOperationalFailure } from "@/lib/server/operational-logging";
import { createTraceContext, extendTrace, publicTraceMeta, traceDurationMs, traceLogFields, type TraceContext } from "@/lib/server/request-trace";
import type { OrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<OrderStatus>(["new", "accepted", "rejected", "preparing", "ready", "served", "picked-up", "delivered", "completed", "cancelled"]);
const paymentMethods = new Set(["cash", "upi", "card", "credit"]);
const printTypes = new Set(["bill", "kot", "receipt"]);
const timelineEvents = new Set(["order_created", "item_added", "item_removed", "discount", "coupon", "kitchen_sent", "kitchen_accepted", "kitchen_ready", "reminder", "kitchen_recall", "payment", "completion", "split_bill", "transfer_table", "assign_waiter", "merge_tables", "payment_started", "payment_unlock", "bill_correction"]);
type PaymentMethod = "cash" | "upi" | "card" | "credit";
type OrderPatchBody = {
  action?: string;
  operationKey?: string;
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
  reason?: string;
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
  correction?: {
    lines?: Array<{ itemId?: string; menuItemId?: string; name?: string; price?: number; quantity?: number; notes?: string }>;
    discount?: number;
    tax?: number;
    packingCharge?: number;
    deliveryFee?: number;
    total?: number;
  };
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
  let trace = createTraceContext(request);
  let context: Record<string, unknown> = traceLogFields(trace);
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
    const access = await requireOwnerFeature(request, "orders", "read");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({})) as OrderPatchBody;
    if (!body.orderId) return fail("Order id is required.");
    const permissionError = orderMutationPermissionError(access.session, body);
    if (permissionError) return fail(permissionError, 403);
    const scope = tenantScope(access.session, body.restaurantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const orders = new OrderRepository();
    const action = body.action ?? body.status ?? "status";
    const opKey = cleanOperationKey(body.operationKey) ?? makeOperationKey([scope.tenantId, body.orderId, action, body.status, body.amount, body.method, body.type, body.event, body.reason, body.tableNumber, body.sourceOrderIds, body.splits, body.correction]);
    context = { ...traceLogFields(trace), action, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, role: access.session.role };
    const send = (data: unknown) => {
      logOperationalEvent("owner.orders.patch", { ...context, outcome: "ok", durationMs: traceDurationMs(trace) });
      return NextResponse.json({ data });
    };
    const actor = { userId: access.session.uid, role: access.session.role, device: cleanDevice(body.device ?? request.headers.get("user-agent") ?? ""), ip: clientIp(request), note: cleanNote(body.note), operationKey: opKey };
    if (body.action === "payment_started") {
      const method = String(body.method ?? "");
      if (method && !paymentMethods.has(method)) return fail("Valid payment method is required.");
      const data = await orders.startPaymentLock(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number.isFinite(Number(body.amount)) ? Number(body.amount) : undefined, method: paymentMethods.has(method) ? method as PaymentMethod : undefined });
      return send(data);
    }
    if (body.action === "payment_unlock") {
      if (!canUnlockPayment(access.session.role)) return fail("Only owner can unlock payment changes.", 403);
      const reason = cleanNote(body.reason ?? body.note);
      if (!reason) return fail("Unlock reason is required.");
      const data = await orders.unlockPayment(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, reason });
      return send(data);
    }
    if (body.action === "bill_correction") {
      if (!canCorrectBill(access.session.role, access.session.permissions)) return fail("Only owner or manager can correct completed bills.", 403);
      const reason = cleanNote(body.reason ?? body.note);
      const lines = (body.correction?.lines ?? [])
        .map((line) => ({ ...line, name: String(line.name ?? "").trim(), price: Number(line.price), quantity: Number(line.quantity) }))
        .filter((line) => line.name && Number.isFinite(line.price) && Number.isFinite(line.quantity) && line.quantity > 0);
      if (!reason || !lines.length) return fail("Correction reason and valid bill lines are required.");
      const data = await orders.recordBillCorrection(scope, {
        ...actor,
        orderId: body.orderId,
        reason,
        lines,
        discount: numberOrUndefined(body.correction?.discount),
        tax: numberOrUndefined(body.correction?.tax),
        deliveryFee: numberOrUndefined(body.correction?.deliveryFee ?? body.correction?.packingCharge),
        total: numberOrUndefined(body.correction?.total),
      });
      return send(data);
    }
    if (body.action === "payment") {
      const method = String(body.method ?? "");
      if (!paymentMethods.has(method) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return fail("Valid payment method and amount are required.");
      const data = await orders.recordPayment(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number(body.amount), method: method as "cash" | "upi" | "card" | "credit", reference: body.reference, cashierId: access.session.uid });
      return send(data);
    }
    if (body.action === "refund") {
      const method = String(body.method ?? "");
      if (!paymentMethods.has(method) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return fail("Valid refund method and amount are required.");
      const data = await orders.recordRefund(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number(body.amount), method: method as "cash" | "upi" | "card" | "credit", reference: body.reference, cashierId: access.session.uid });
      return send(data);
    }
    if (body.action === "print") {
      const type = printTypes.has(String(body.type)) ? body.type as "bill" | "kot" | "receipt" : "bill";
      const data = await orders.recordPrint(scope, { ...actor, orderId: body.orderId, type });
      return send(data);
    }
    if (body.action === "event") {
      if (!body.event || !timelineEvents.has(body.event)) return fail("Valid operational event is required.");
      const data = await orders.recordOperationalEvent(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, event: body.event as OperationalEvent, amount: body.amount, method: body.method, note: body.note });
      return send(data);
    }
    if (body.action === "split_bill") {
      const splits = (body.splits ?? [])
        .map((split) => ({ ...split, amount: Number(split.amount), method: String(split.method ?? "") }))
        .filter((split) => Number.isFinite(split.amount) && split.amount > 0 && paymentMethods.has(split.method));
      if (!splits.length) return fail("Valid split bill rows are required.");
      const data = await orders.recordSplitBill(scope, {
        ...actor,
        orderId: body.orderId,
        kitchenOrderId: body.kitchenOrderId,
        splits: splits.map((split) => ({ ...split, method: split.method as PaymentMethod })),
      });
      return send(data);
    }
    if (body.action === "transfer_table" || body.action === "assign_waiter") {
      const tableNumber = body.tableNumber?.trim();
      const waiterName = body.waiterName?.trim();
      if (body.action === "transfer_table" && !tableNumber) return fail("Target table is required.");
      if (body.action === "assign_waiter" && !waiterName) return fail("An active waiter is required.");
      const data = await orders.transferTable(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, tableNumber, waiterName, mode: body.action === "assign_waiter" ? "waiter" : "table" });
      return send(data);
    }
    if (body.action === "merge_tables") {
      const sourceOrderIds = Array.isArray(body.sourceOrderIds) ? body.sourceOrderIds.filter(Boolean) : [];
      if (!sourceOrderIds.length) return fail("At least one source order is required.");
      const data = await orders.mergeTables(scope, { ...actor, orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, sourceOrderIds, sourceKitchenOrderIds: body.sourceKitchenOrderIds, tableNumber: body.tableNumber });
      return send(data);
    }
    if (!body.status || !statuses.has(body.status)) return fail("Valid order status is required.");
    const data = await orders.updateStatus(scope, body.orderId, body.status, actor);
    return send(data);
  } catch (error) {
    return orderError(error, trace, context);
  }
}

function cleanDevice(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 160);
}

function clientIp(request: NextRequest) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim().slice(0, 80);
}

function cleanNote(value: unknown) {
  const note = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
  return note || undefined;
}

function cleanOperationKey(value: unknown) {
  const key = String(value ?? "").replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 120);
  return key || undefined;
}

function numberOrUndefined(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function canCorrectBill(role: string, permissions: string[]) {
  if (role === "waiter") return false;
  return ["owner", "manager", "admin", "super_admin"].includes(role) || permissions.includes("orders:bill-correction");
}

function canUnlockPayment(role: string) {
  return ["owner", "admin", "super_admin"].includes(role);
}

function orderMutationPermissionError(session: VerifiedSession, body: OrderPatchBody) {
  const role = session.role;
  if (["owner", "admin", "super_admin"].includes(role)) return null;
  const action = body.action ?? (body.status ? "status" : "");
  if (role === "manager") return canAccessOperationalFeature(session, "orders", "update") ? null : "Permission denied for orders:update.";
  if (role === "cashier") return cashierOrderActionAllowed(action, body) ? null : "Cashier can update billing, payment, print, split, and merge workflows only.";
  if (role === "waiter") return waiterOrderActionAllowed(action, body) ? null : "Waiter can serve, complete, add service events, split, merge, and update floor workflow only.";
  if (role === "chef" || role === "kitchen-manager") return kitchenOrderActionAllowed(action, body) ? null : "Kitchen can accept, prepare, and ready tickets from Kitchen Operations only.";
  return canAccessOperationalFeature(session, "orders", "update") ? null : "Permission denied for orders:update.";
}

function waiterOrderActionAllowed(action: string, body: OrderPatchBody) {
  if (action === "status") return body.status === "served" || body.status === "completed";
  if (action === "event") return ["kitchen_sent", "reminder", "kitchen_recall"].includes(String(body.event ?? ""));
  return ["print", "split_bill", "merge_tables", "transfer_table", "assign_waiter"].includes(action);
}

function cashierOrderActionAllowed(action: string, body: OrderPatchBody) {
  if (action === "status") return body.status === "completed";
  return ["payment_started", "payment", "refund", "print", "split_bill", "merge_tables"].includes(action);
}

function kitchenOrderActionAllowed(action: string, body: OrderPatchBody) {
  if (action === "status") return ["accepted", "preparing", "ready"].includes(String(body.status ?? ""));
  if (action === "event") return ["kitchen_sent", "kitchen_accepted", "kitchen_ready", "reminder", "kitchen_recall"].includes(String(body.event ?? ""));
  return body.type === "kot" && action === "print";
}

function orderError(error: unknown, trace: TraceContext, context: Record<string, unknown>) {
  const requestId = trace.requestId;
  const meta = publicTraceMeta(trace);
  const response = (message: string, status: number) => NextResponse.json({ error: message, requestId, meta }, { status });
  const durationMs = traceDurationMs(trace);
  logOperationalFailure("owner.orders.patch", error, { ...context, durationMs });
  const message = error instanceof Error ? error.message : "";
  if (/Order not found|no longer active/i.test(message)) return response("This order is no longer active. Please refresh.", 404);
  if (/Kitchen ticket not found/i.test(message)) return response("Kitchen ticket not found.", 404);
  if (/Full payment is required before completing/i.test(message)) return response("Cannot complete order while payment is pending.", 409);
  if (/currently being modified/i.test(message)) return response("Order currently being modified. Refresh and retry.", 409);
  if (/cannot be modified after payment has started/i.test(message)) return response("Cannot modify this order after payment has started.", 409);
  if (/already been collected|already paid/i.test(message)) return response("Payment has already been collected.", 409);
  if (/invalid .*transition|cannot move back|cancelled orders|refunded orders|without refund/i.test(message)) return response("That order state change is no longer valid. Refresh and retry.", 409);
  if (/split bill|balance due|source order|target table|active waiter|required|completed bills|correction|unlock reason/i.test(message)) return response(safeBusinessMessage(message), 400);
  if (/deadline|timeout|unavailable|network|fetch/i.test(message)) return response("Unable to contact server. Please retry.", 503);
  return response(`Unexpected error. Reference ID ${requestId}`, 500);
}

function safeBusinessMessage(message: string) {
  if (/(secret|token|private|credential|password|stack|firebase|firestore)/i.test(message)) return "Request could not be completed.";
  return message.replace(/\s+/g, " ").slice(0, 180);
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
