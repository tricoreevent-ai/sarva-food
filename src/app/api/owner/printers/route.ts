import { NextResponse, type NextRequest } from "next/server";
import { PrinterRepository } from "@/repositories/printer-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import type { PrinterSettings, PrintLog } from "@/lib/types";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const repository = new PrinterRepository();
  const [data, context] = await Promise.all([repository.get(scope), repository.context(scope)]);
  return NextResponse.json({ data, context: { ...context, latestOrder: context.latestOrder ? kitchenDocToTableOrder(context.latestOrder) : null } });
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { settings?: PrinterSettings; restaurantId?: string };
  if (!body.settings) return NextResponse.json({ error: "Printer settings are required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new PrinterRepository().save(scope, body.settings);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "printer_settings", module: "printers" });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { log?: Omit<PrintLog, "id" | "timestamp">; restaurantId?: string };
  if (!body.log) return NextResponse.json({ error: "Print log is required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new PrinterRepository().log(scope, body.log);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "print", module: "printers", entityId: data.referenceId, after: data });
  return NextResponse.json({ data });
}
