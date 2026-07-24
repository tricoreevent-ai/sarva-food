import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { resolveTenantId } from "@/lib/tenant";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CallbackBody = {
  restaurantId?: string;
  name?: string;
  phone?: string;
  reason?: "order" | "catering" | "support" | "callback";
  notes?: string;
};

export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`callback-request:${clientId}`, 10, 15 * 60_000).ok) {
      return NextResponse.json({ ok: false, error: "Too many callback requests." }, { status: 429 });
    }
    const body = (await request.json().catch(() => ({}))) as CallbackBody;
    const restaurantId = body.restaurantId ? resolveTenantId(body.restaurantId) : "";
    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";

    if (!restaurantId || name.length < 2 || phone.length < 10) {
      return NextResponse.json({ ok: false, error: "Restaurant, name, and phone are required." }, { status: 400 });
    }

    const restaurant = await adminDb().collection("restaurants").doc(restaurantId).get();
    if (!restaurant.exists) {
      return NextResponse.json({ ok: false, error: "Restaurant is not available." }, { status: 404 });
    }

    const data = restaurant.data() ?? {};
    const now = new Date();
    const ref = adminDb().collection("callbackRequests").doc();
    await ref.set({
      id: ref.id,
      tenantId: data.tenantId ?? restaurantId,
      restaurantId,
      branchId: data.branchId ?? data.primaryBranchId,
      ownerId: data.ownerId ?? data.ownerIds?.[0],
      name,
      phone,
      reason: body.reason ?? "callback",
      notes: body.notes?.trim().slice(0, 1000) || "",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, callbackId: ref.id }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to request callback right now." }, { status: 500 });
  }
}
