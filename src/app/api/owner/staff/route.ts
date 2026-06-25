import { NextResponse, type NextRequest } from "next/server";
import { StaffRepository } from "@/repositories/staff-repository";
import { tenantScope } from "@/repositories/shared";
import type { VerifiedSession } from "@/lib/server-auth";
import { staffDocToStaffMember } from "@/lib/operational-api-mappers";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "employees", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new StaffRepository().withSessions(scope);
  return NextResponse.json({ data: data.map(staffDocToStaffMember), raw: data, count: data.length });
}

export async function POST(request: NextRequest) {
  return upsert(request);
}

export async function PATCH(request: NextRequest) {
  return upsert(request);
}

export async function DELETE(request: NextRequest) {
  const access = await requireOwnerFeature(request, "employees", "delete");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Staff id is required." }, { status: 400 });
  const data = await new StaffRepository().delete(scope, id);
  await audit(access.session, "user_delete", id);
  return NextResponse.json({ data });
}

async function upsert(request: NextRequest) {
  const method = request.method === "POST" ? "create" : "update";
  const access = await requireOwnerFeature(request, "employees", method);
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(access.session, body.restaurantId);
  const repository = new StaffRepository();
  if (body.action === "disable" || body.action === "enable") {
    const data = await repository.setDisabled(scope, body.id, body.action === "disable");
    await audit(access.session, `user_${body.action}`, body.id);
    return NextResponse.json({ data: staffDocToStaffMember(data), raw: data });
  }
  if (body.action === "reset-password") {
    const data = await repository.resetPassword(scope, body.id);
    await audit(access.session, "password_reset", body.id);
    return NextResponse.json({ data });
  }
  const data = await repository.upsert(scope, body);
  await audit(access.session, body.id ? "user_update" : "user_create", String(data.id));
  return NextResponse.json({ data: staffDocToStaffMember(data), raw: data });
}

async function audit(session: VerifiedSession, action: string, entityId: string) {
  await new AuditRepository().record({
    tenantId: session.tenantId ?? session.tenantIds[0],
    restaurantId: session.tenantId,
    userId: session.uid,
    role: session.role,
    action,
    module: "staff",
    entityId,
  });
}
