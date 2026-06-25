import { NextResponse, type NextRequest } from "next/server";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";
import type { KitchenOrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<KitchenOrderStatus>(["new", "preparing", "ready", "served", "completed", "cancelled"]);

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new KitchenRepository().list(scope);
  return NextResponse.json({ data: data.map(kitchenDocToTableOrder), count: data.length });
}

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "create");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new KitchenRepository().create(scope, body);
  return NextResponse.json({ data: kitchenDocToTableOrder(data) });
}

export async function PATCH(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { id?: string; status?: KitchenOrderStatus; restaurantId?: string };
  if (!body.id) return NextResponse.json({ error: "Kitchen order id is required." }, { status: 400 });
  if (body.status && !statuses.has(body.status)) return NextResponse.json({ error: "Invalid kitchen status." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new KitchenRepository().update(scope, body.id, body);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "kitchen_status", module: "kitchen", entityId: body.id, after: body });
  return NextResponse.json({ data: kitchenDocToTableOrder(data) });
}
