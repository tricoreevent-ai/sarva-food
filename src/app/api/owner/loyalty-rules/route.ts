import { NextResponse, type NextRequest } from "next/server";
import { LoyaltyRepository, type LoyaltyRules } from "@/repositories/loyalty-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const writableRoles = new Set(["owner", "manager"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  try {
    const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
    return NextResponse.json({ data: await new LoyaltyRepository().getRules(scope.tenantId) });
  } catch (error) {
    console.error("[owner/loyalty-rules] load failed", { requestId: crypto.randomUUID(), reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to load loyalty rules." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !writableRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  try {
    const body = await request.json() as { rules?: Partial<LoyaltyRules>; restaurantId?: string };
    const scope = tenantScope(session, body.restaurantId);
    return NextResponse.json({ data: await new LoyaltyRepository().saveRules(scope.tenantId, body.rules ?? {}, session.uid) });
  } catch (error) {
    console.error("[owner/loyalty-rules] save failed", { requestId: crypto.randomUUID(), reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to save loyalty rules." }, { status: 400 });
  }
}
