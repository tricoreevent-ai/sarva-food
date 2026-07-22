import { NextResponse, type NextRequest } from "next/server";
import { PrinterRepository } from "@/repositories/printer-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import type { PrinterSettings, PrintLog } from "@/lib/types";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";
import type { AccessOperation } from "@/lib/access-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const kitchenSurface = request.nextUrl.searchParams.get("surface") === "kitchen";
  const access = kitchenSurface ? await requirePrinterAccess(request, "read") : await requireOwnerFeature(request, "settings", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const repository = new PrinterRepository();
  const data = await repository.get(scope);
  if (kitchenSurface) return NextResponse.json({ data: kitchenPrinterSettings(data), context: null });
  const context = await repository.context(scope);
  return NextResponse.json({ data, context: { ...context, latestOrder: context.latestOrder ? kitchenDocToTableOrder(context.latestOrder) : null } });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { settings?: PrinterSettings; restaurantId?: string; surface?: "kitchen" };
  const kitchenSurface = body.surface === "kitchen";
  const access = kitchenSurface ? await requirePrinterAccess(request, "update") : await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  if (!body.settings) return NextResponse.json({ error: "Printer settings are required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const repository = new PrinterRepository();
  const current = kitchenSurface ? await repository.get(scope) : null;
  const data = await repository.save(scope, kitchenSurface ? mergeKitchenPrinterSettings(current!, body.settings) : body.settings);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "printer_settings", module: "printers" });
  return NextResponse.json({ data: kitchenSurface ? kitchenPrinterSettings(data) : data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { log?: Omit<PrintLog, "id" | "timestamp">; restaurantId?: string; surface?: "kitchen" };
  const access = body.log?.type === "kot" || body.surface === "kitchen" ? await requirePrinterAccess(request, "create") : await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  if (!body.log) return NextResponse.json({ error: "Print log is required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new PrinterRepository().log(scope, body.log);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "print", module: "printers", entityId: data.referenceId, after: data });
  return NextResponse.json({ data });
}

async function requirePrinterAccess(request: NextRequest, operation: AccessOperation) {
  const access = await requireOwnerFeature(request, "kitchen", operation === "delete" ? "update" : operation);
  if (!access.error) return access;
  const fallback = await requireOwnerFeature(request, "pos", operation === "delete" ? "update" : operation);
  return fallback.error ? access : fallback;
}

function kitchenPrinterSettings(settings: PrinterSettings): PrinterSettings {
  return {
    ...settings,
    billingPrinterName: "",
    profiles: (settings.profiles ?? []).filter((profile) => profile.type === "kitchen"),
    templates: (settings.templates ?? []).filter((template) => template.type === "kot"),
    printLogs: (settings.printLogs ?? []).filter((log) => log.type === "kot"),
  };
}

function mergeKitchenPrinterSettings(current: PrinterSettings, next: PrinterSettings): PrinterSettings {
  const kitchenProfiles = (next.profiles ?? current.profiles ?? []).filter((profile) => profile.type === "kitchen");
  const kotTemplates = (next.templates ?? current.templates ?? []).filter((template) => template.type === "kot");
  return {
    ...current,
    kitchenPrinterName: next.kitchenPrinterName || current.kitchenPrinterName,
    autoPrintOrders: Boolean(next.autoPrintOrders),
    compactTickets: Boolean(next.compactTickets),
    connectionStatus: next.connectionStatus ?? current.connectionStatus,
    profiles: [...(current.profiles ?? []).filter((profile) => profile.type !== "kitchen"), ...kitchenProfiles],
    templates: [...(current.templates ?? []).filter((template) => template.type !== "kot"), ...kotTemplates],
  };
}
