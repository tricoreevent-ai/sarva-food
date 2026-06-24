import { NextResponse, type NextRequest } from "next/server";
import { StaffRepository } from "@/repositories/staff-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { staffDocToStaffMember } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new StaffRepository().list(scope);
  return NextResponse.json({ data: data.map(staffDocToStaffMember), raw: data, count: data.length });
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
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Staff id is required." }, { status: 400 });
  return NextResponse.json({ data: await new StaffRepository().delete(scope, id) });
}

async function upsert(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const scope = tenantScope(session, body.restaurantId);
  const data = await new StaffRepository().upsert(scope, body);
  return NextResponse.json({ data: staffDocToStaffMember(data), raw: data });
}
