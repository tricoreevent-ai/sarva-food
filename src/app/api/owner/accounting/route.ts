import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { AccountingRepository } from "@/repositories/accounting-repository";
import { StaffRepository } from "@/repositories/staff-repository";
import { tenantScope } from "@/repositories/shared";

const readRoles = new Set(["owner", "manager", "accountant"]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !readRoles.has(session.role)) return NextResponse.json({ error: "Accounting access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const [entries, staff] = await Promise.all([
    new AccountingRepository().list(scope),
    new StaffRepository().list(scope),
  ]);
  return NextResponse.json({
    data: {
      entries,
      staff,
      branches: (scope.branchIds?.length ? scope.branchIds : ["main"]).map((id) => ({ id, name: id === "main" ? "Main branch" : id })),
    },
    count: entries.length,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !readRoles.has(session.role)) return NextResponse.json({ error: "Accounting access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { entry?: Record<string, unknown>; restaurantId?: string };
  if (!body.entry) return NextResponse.json({ error: "Accounting entry is required." }, { status: 400 });
  const scope = tenantScope(session, body.restaurantId);
  return NextResponse.json({ data: await new AccountingRepository().upsert(scope, body.entry, session.uid) });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !readRoles.has(session.role)) return NextResponse.json({ error: "Accounting access is required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Accounting entry id is required." }, { status: 400 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  return NextResponse.json({ data: await new AccountingRepository().delete(scope, id, session.uid) });
}
