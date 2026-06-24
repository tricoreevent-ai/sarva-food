import { NextResponse, type NextRequest } from "next/server";
import { TableRepository } from "@/repositories/table-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { tableDocToPosTable } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
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
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const id = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("table");
  if (!id) return NextResponse.json({ error: "Table id is required." }, { status: 400 });
  return NextResponse.json({ data: await new TableRepository().delete(scope, id) });
}

async function upsert(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(session, body.restaurantId);
  const data = await new TableRepository().upsert(scope, body);
  return NextResponse.json({ data: tableDocToPosTable(data), raw: data });
}
