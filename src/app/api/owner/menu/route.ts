import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import { MenuRepository } from "@/repositories/menu-repository";
import { tenantScope } from "@/repositories/shared";
import type { MenuDoc, UserRole } from "@/types/firebase";

const ownerReadRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to load menu items." }, { status: 403 });
  }

  const restaurantId = resolveTenantId(request.nextUrl.searchParams.get("restaurantId") || session.tenantId || DEFAULT_RESTAURANT_ID);
  if (!canAccessRestaurant(session, restaurantId)) {
    return NextResponse.json({ error: `Access setup required: this user is not linked to restaurant ${restaurantId}.` }, { status: 403 });
  }

  const docs = (await new MenuRepository().list(tenantScope(session, restaurantId)))
    .map((item) => item as MenuDoc)
    .filter((item) => !item.isDeleted)
    .map((item) => ({ ...item, tenantId: restaurantId, restaurantId }))
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0) || first.name.localeCompare(second.name));

  return NextResponse.json({ data: Array.from(new Map(docs.map((item) => [item.id, item])).values()) });
}

export async function POST(request: NextRequest) {
  return upsert(request);
}

export async function PATCH(request: NextRequest) {
  return upsert(request);
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Menu item id is required." }, { status: 400 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  return NextResponse.json({ data: await new MenuRepository().delete(scope, id) });
}

async function upsert(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { item?: Record<string, unknown>; restaurantId?: string };
  if (!body.item?.name) return NextResponse.json({ error: "Menu item name is required." }, { status: 400 });
  const scope = tenantScope(session, body.restaurantId);
  const data = await new MenuRepository().upsert(scope, { ...body.item, ownerId: session.uid });
  return NextResponse.json({ data });
}

function canAccessRestaurant(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  restaurantId: string,
) {
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  return !allowed.size || allowed.has(restaurantId);
}
