import { NextResponse, type NextRequest } from "next/server";
import { LoyaltyRepository, type LoyaltyRules } from "@/repositories/loyalty-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { productionLogger, safeErrorName } from "@/lib/server/production-logger";

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
    productionLogger.owner("owner.loyalty-rules.load_failed", { errorName: safeErrorName(error) });
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
    productionLogger.owner("owner.loyalty-rules.save_failed", { errorName: safeErrorName(error) });
    return NextResponse.json({ error: "Unable to save loyalty rules." }, { status: 400 });
  }
}
