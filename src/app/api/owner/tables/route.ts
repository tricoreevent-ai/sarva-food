import { NextResponse, type NextRequest } from "next/server";
import { TableRepository } from "@/repositories/table-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";
import { tableDocToPosTable } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "tables", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new TableRepository().list(scope);
  return NextResponse.json({ data: data.map(tableDocToPosTable), raw: data, count: data.length });
}

export async function POST(request: NextRequest) {
  return upsert(request);
}

export async function PATCH(request: NextRequest) {
  return upsert(request);
}

export async function DELETE(request: NextRequest) {
  const access = await requireOwnerFeature(request, "tables", "delete");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const id = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("table");
  if (!id) return NextResponse.json({ error: "Table id is required." }, { status: 400 });
  const data = await new TableRepository().delete(scope, id);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "table_delete", module: "tables", entityId: id });
  return NextResponse.json({ data });
}

async function upsert(request: NextRequest) {
  const access = await requireOwnerFeature(request, "tables", request.method === "POST" ? "create" : "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new TableRepository().upsert(scope, body);
  return NextResponse.json({ data: tableDocToPosTable(data), raw: data });
}
