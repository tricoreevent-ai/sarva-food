import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository } from "@/repositories/order-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";
import type { OrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<OrderStatus>(["new", "accepted", "rejected", "preparing", "ready", "served", "picked-up", "delivered", "completed", "cancelled"]);
const paymentMethods = new Set(["cash", "upi", "card", "credit"]);

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "orders", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 500);
  const orders = await new OrderRepository().list(scope, { limit: Number.isFinite(limit) ? limit : 500 });
  return NextResponse.json({ data: orders, count: orders.length });
}

export async function PATCH(request: NextRequest) {
  const access = await requireOwnerFeature(request, "orders", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { action?: string; orderId?: string; status?: OrderStatus; restaurantId?: string; kitchenOrderId?: string; amount?: number; method?: string; reference?: string; type?: "bill" | "kot" };
  if (!body.orderId) return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const orders = new OrderRepository();
  if (body.action === "payment") {
    const method = String(body.method ?? "");
    if (!paymentMethods.has(method) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return NextResponse.json({ error: "Valid payment method and amount are required." }, { status: 400 });
    const data = await orders.recordPayment(scope, { orderId: body.orderId, kitchenOrderId: body.kitchenOrderId, amount: Number(body.amount), method: method as "cash" | "upi" | "card" | "credit", reference: body.reference, cashierId: access.session.uid });
    await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "order_payment", module: "orders", entityId: body.orderId, after: { amount: body.amount, method, paymentStatus: data.paymentStatus } });
    return NextResponse.json({ data });
  }
  if (body.action === "print") {
    const data = await orders.recordPrint(scope, body.orderId, body.type === "kot" ? "kot" : "bill", access.session.uid);
    await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: `order_${body.type === "kot" ? "kot" : "bill"}_print`, module: "orders", entityId: body.orderId });
    return NextResponse.json({ data });
  }
  if (!body.status || !statuses.has(body.status)) return NextResponse.json({ error: "Valid order status is required." }, { status: 400 });
  const data = await orders.updateStatus(scope, body.orderId, body.status);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "order_status", module: "orders", entityId: body.orderId, after: { status: body.status } });
  return NextResponse.json({ data });
}
