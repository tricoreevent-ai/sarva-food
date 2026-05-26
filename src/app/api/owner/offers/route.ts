import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { Offer } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

const ownerSaveRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "accountant",
]);

type OfferRequest = {
  offer?: Offer;
  restaurantId?: string;
};

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !ownerSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to save offers." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as OfferRequest;
  const offer = body.offer;
  const code = offer?.code?.trim().toUpperCase();
  if (!offer || !code) {
    return NextResponse.json({ error: "Offer code is required." }, { status: 400 });
  }

  const restaurantId = body.restaurantId || offer.restaurantSlug || session.tenantId || DEFAULT_RESTAURANT_ID;
  try {
    assertRestaurantAccess(session, restaurantId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restaurant access is not configured." },
      { status: 403 },
    );
  }

  await adminDb().collection("offers").doc(code).set(sanitize({
    ...offer,
    id: code,
    code,
    restaurantSlug: restaurantId,
    restaurantId,
    tenantId: resolveTenantId(restaurantId),
    branchId: session.branchIds[0] ?? DEFAULT_BRANCH_ID,
    active: (offer.status ?? "active") === "active",
    startsAt: offer.validFrom ? new Date(offer.validFrom) : undefined,
    endsAt: offer.validTo ? new Date(offer.validTo) : undefined,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
    createdBy: session.uid,
    isDeleted: false,
  }), { merge: true });

  return NextResponse.json({ ok: true, code });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !ownerSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to delete offers." }, { status: 403 });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Offer code is required." }, { status: 400 });
  }

  await adminDb().collection("offers").doc(code).delete();
  return NextResponse.json({ ok: true, code });
}

function assertRestaurantAccess(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  restaurantId: string,
) {
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean));
  if (allowed.size && !allowed.has(restaurantId) && !allowed.has(resolveTenantId(restaurantId))) {
    throw new Error(`Access setup required: this user is not linked to restaurant ${restaurantId}.`);
  }
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
