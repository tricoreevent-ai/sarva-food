import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { MasterMenuTemplateRepository } from "@/repositories/master-menu-template-repository";
import { tenantScope } from "@/repositories/shared";
import type { MasterTemplateInput } from "@/lib/master-menu-template-normalizer";
import type { UserRole } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ownerReadRoles = new Set<UserRole>(["owner", "manager", "cashier", "chef", "kitchen-manager"]);

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const params = request.nextUrl.searchParams;
  const restaurantId = resolveTenantId(params.get("restaurantId") || session.tenantId || DEFAULT_RESTAURANT_ID);
  const result = await new MasterMenuTemplateRepository().list({
    q: params.get("q") ?? "",
    categoryId: params.get("categoryId") ?? "",
    cuisineId: params.get("cuisineId") ?? "",
    foodType: params.get("foodType") ?? "",
    tag: params.get("tag") ?? "",
    status: "active",
    tab: (params.get("tab") as "master" | "restaurant" | "favorites" | "recent" | "popular" | null) ?? "master",
    restaurantId,
    limit: Number(params.get("limit") ?? 24),
    offset: Number(params.get("offset") ?? 0),
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as {
    action?: "import" | "favorite" | "unfavorite" | "save-private";
    templateId?: string;
    template?: MasterTemplateInput;
    restaurantId?: string;
    mode?: string;
  };
  const restaurantId = resolveTenantId(body.restaurantId || session.tenantId || DEFAULT_RESTAURANT_ID);
  const scope = tenantScope(session, restaurantId);
  const repository = new MasterMenuTemplateRepository();
  try {
    if (body.action === "save-private") {
      if (!body.template) return NextResponse.json({ error: "Template data is required." }, { status: 400 });
      return NextResponse.json({ data: await repository.savePrivateTemplate(body.template, scope, session.uid) });
    }
    if (!body.templateId) return NextResponse.json({ error: "Template id is required." }, { status: 400 });
    if (body.action === "favorite") return NextResponse.json({ data: await repository.favorite(body.templateId, scope, session.uid, true) });
    if (body.action === "unfavorite") return NextResponse.json({ data: await repository.favorite(body.templateId, scope, session.uid, false) });
    return NextResponse.json({ data: await repository.markUsed(body.templateId, scope, session.uid, body.mode ?? "wizard") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Template action failed." }, { status: 400 });
  }
}
