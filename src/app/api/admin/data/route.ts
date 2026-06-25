import { NextResponse, type NextRequest } from "next/server";
import { AdminRepository, type AdminResource } from "@/repositories/admin-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resources = new Set<AdminResource>(["restaurants", "staffMembers", "orders", "offers", "menuItems", "businessApplications", "branches", "socialPosts", "cateringInquiries", "plans", "campaignSettings"]);

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ data: await new AdminRepository().snapshot() });
}

export async function POST(request: NextRequest) {
  return mutate(request, "create");
}

export async function PATCH(request: NextRequest) {
  return mutate(request, "set");
}

export async function DELETE(request: NextRequest) {
  return mutate(request, "delete");
}

async function mutate(request: NextRequest, operation: "create" | "set" | "delete") {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({})) as { resource?: AdminResource; id?: string; data?: Record<string, unknown> };
  if (!body.resource || !resources.has(body.resource)) return NextResponse.json({ error: "Valid admin resource is required." }, { status: 400 });
  const id = body.id || String(body.data?.id || body.data?.slug || "");
  if (operation !== "create" && !id) return NextResponse.json({ error: "Resource id is required." }, { status: 400 });
  const repository = new AdminRepository();
  const action = String(body.data?.action || "");
  const data = body.resource === "staffMembers" && operation === "set" && action === "reset-password"
    ? await repository.resetAdminPassword(id)
    : body.resource === "staffMembers" && operation === "set" && (action === "disable" || action === "enable")
      ? await repository.setAdminDisabled(id, action === "disable")
      : operation === "create"
    ? await repository.create(body.resource, body.data ?? {})
    : operation === "set"
      ? await repository.set(body.resource, id, body.data ?? {})
      : await repository.delete(body.resource, id);
  await new AuditRepository().record({
    tenantId: "platform",
    userId: session.uid,
    role: session.role,
    action: `${body.resource}_${operation}`,
    module: "admin",
    entityId: body.id || String((data as { id?: string }).id || ""),
    after: operation === "delete" ? undefined : body.data,
  });
  return NextResponse.json({ data });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request, "admin");
  if (!session || !["admin", "super_admin"].includes(session.role)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  return session;
}
