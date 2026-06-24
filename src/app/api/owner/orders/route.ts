import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository } from "@/repositories/order-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { OrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<OrderStatus>(["new", "accepted", "rejected", "preparing", "ready", "served", "picked-up", "delivered", "completed", "cancelled"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 500);
  const orders = await new OrderRepository().list(scope, { limit: Number.isFinite(limit) ? limit : 500 });
  return NextResponse.json({ data: orders, count: orders.length });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { orderId?: string; status?: OrderStatus; restaurantId?: string };
  if (!body.orderId || !body.status || !statuses.has(body.status)) return NextResponse.json({ error: "Valid orderId and status are required." }, { status: 400 });
  const scope = tenantScope(session, body.restaurantId);
  return NextResponse.json({ data: await new OrderRepository().updateStatus(scope, body.orderId, body.status) });
}
