import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { InventoryRepository } from "@/repositories/inventory-repository";
import { MenuRepository } from "@/repositories/menu-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";

const writeRoles = new Set(["owner", "manager", "inventory-manager"]);
type Resource = "item" | "recipe" | "supplier" | "purchase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const [inventory, menuItems] = await Promise.all([
    new InventoryRepository().list(scope),
    new MenuRepository().list(scope),
  ]);
  return NextResponse.json({
    data: {
      ...inventory,
      menuItems,
      branches: (scope.branchIds?.length ? scope.branchIds : ["main"]).map((id) => ({ id, name: id === "main" ? "Main branch" : id })),
    },
    counts: Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, value.length])),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !writeRoles.has(session.role)) return NextResponse.json({ error: "Inventory write access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { action?: string; resource?: Resource; data?: Record<string, unknown>; id?: string; delta?: number; reason?: string; restaurantId?: string };
  const scope = tenantScope(session, body.restaurantId);
  const repository = new InventoryRepository();
  if (body.action === "adjust" && body.id) return NextResponse.json({ data: await repository.adjust(scope, body.id, Number(body.delta || 0), body.reason || "Stock adjustment", session.uid) });
  if (body.action === "receive" && body.id) return NextResponse.json({ data: await repository.receivePurchase(scope, body.id, session.uid) });
  if (!body.resource || !body.data) return NextResponse.json({ error: "Inventory resource and data are required." }, { status: 400 });
  return NextResponse.json({ data: await repository.upsert(scope, body.resource, body.data, session.uid) });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !writeRoles.has(session.role)) return NextResponse.json({ error: "Inventory write access is required." }, { status: 403 });
  const resource = request.nextUrl.searchParams.get("resource") as Resource | null;
  const id = request.nextUrl.searchParams.get("id");
  if (!resource || !id) return NextResponse.json({ error: "Inventory resource and id are required." }, { status: 400 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  return NextResponse.json({ data: await new InventoryRepository().delete(scope, resource, id, session.uid) });
}
