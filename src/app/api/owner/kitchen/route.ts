import { NextResponse, type NextRequest } from "next/server";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";
import type { KitchenOrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<KitchenOrderStatus>(["new", "preparing", "ready", "served", "completed", "cancelled"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new KitchenRepository().list(scope);
  return NextResponse.json({ data: data.map(kitchenDocToTableOrder), count: data.length });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(session, body.restaurantId);
  const data = await new KitchenRepository().create(scope, body);
  return NextResponse.json({ data: kitchenDocToTableOrder(data) });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: KitchenOrderStatus; restaurantId?: string };
  if (!body.id) return NextResponse.json({ error: "Kitchen order id is required." }, { status: 400 });
  if (body.status && !statuses.has(body.status)) return NextResponse.json({ error: "Invalid kitchen status." }, { status: 400 });
  const scope = tenantScope(session, body.restaurantId);
  const data = await new KitchenRepository().update(scope, body.id, body);
  return NextResponse.json({ data: kitchenDocToTableOrder(data) });
}
