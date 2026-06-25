import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository } from "@/repositories/order-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";
import type { OrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<OrderStatus>(["new", "accepted", "rejected", "preparing", "ready", "served", "picked-up", "delivered", "completed", "cancelled"]);

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
  const body = await request.json().catch(() => ({})) as { orderId?: string; status?: OrderStatus; restaurantId?: string };
  if (!body.orderId || !body.status || !statuses.has(body.status)) return NextResponse.json({ error: "Valid orderId and status are required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new OrderRepository().updateStatus(scope, body.orderId, body.status);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "order_status", module: "orders", entityId: body.orderId, after: { status: body.status } });
  return NextResponse.json({ data });
}
