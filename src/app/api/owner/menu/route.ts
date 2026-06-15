import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { DEFAULT_RESTAURANT_ID, resolveTenantId, tenantAliases } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
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

  const ids = tenantAliases(restaurantId);
  const snapshots = await Promise.all((["menus", "menuItems"] as const).flatMap((collectionName) =>
    ids.flatMap((id) =>
      (["tenantId", "restaurantId"] as const).map((field) =>
        adminDb().collection(collectionName).where(field, "==", id).limit(250).get(),
      ),
    ),
  ));
  const docs = snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => {
      const data = serializeFirestoreValue(doc.data()) as Record<string, unknown>;
      return { id: doc.id, ...data } as MenuDoc;
    })
    .filter((item) => !item.isDeleted)
    .map((item) => ({ ...item, tenantId: restaurantId, restaurantId }))
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0) || first.name.localeCompare(second.name));

  return NextResponse.json({ data: Array.from(new Map(docs.map((item) => [item.id, item])).values()) });
}

function canAccessRestaurant(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  restaurantId: string,
) {
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  return !allowed.size || allowed.has(restaurantId);
}

function serializeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if ("toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, serializeFirestoreValue(entry)] as const)
      .filter(([, entry]) => typeof entry !== "undefined"),
  );
}
