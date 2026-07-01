import { NextResponse, type NextRequest } from "next/server";
import { TableRepository } from "@/repositories/table-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { AuditRepository } from "@/repositories/audit-repository";
import { tableDocToPosTable } from "@/lib/operational-api-mappers";
import { requestOrigin } from "@/lib/server/table-qr";

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
  try {
    const data = await new TableRepository().delete(scope, id);
    await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "table_delete", module: "tables", entityId: id });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[owner/tables] delete failed", { requestId: crypto.randomUUID(), restaurantId: scope.tenantId, table: id, error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Table could not be deleted." }, { status: 409 });
  }
}

async function upsert(request: NextRequest) {
  const access = await requireOwnerFeature(request, "tables", request.method === "POST" ? "create" : "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { action?: "rotate-qr" | "enable-qr" | "disable-qr" | "extend-session" | "end-session" | "transfer-session"; id?: string; table?: string; restaurantId?: string; targetTable?: string; minutes?: number };
  const scope = tenantScope(access.session, body.restaurantId);
  const repository = new TableRepository();
  const key = body.id || body.table || "";
  const origin = requestOrigin(request.headers);
  try {
    const data = body.action === "rotate-qr"
      ? await repository.rotateQr(scope, key, origin)
      : body.action === "enable-qr"
        ? await repository.setQrStatus(scope, key, true)
        : body.action === "disable-qr"
          ? await repository.setQrStatus(scope, key, false)
          : body.action === "extend-session"
            ? await repository.extendSession(scope, key, Number(body.minutes ?? 15))
            : body.action === "end-session"
              ? await repository.endSession(scope, key)
              : body.action === "transfer-session"
                ? await repository.transferSession(scope, key, String(body.targetTable ?? ""))
          : await repository.upsert(scope, { ...body, origin });
    return isTransferResult(data)
      ? NextResponse.json({ data: tableDocToPosTable(data.target), source: tableDocToPosTable(data.source), raw: data })
      : NextResponse.json({ data: tableDocToPosTable(data), raw: data });
  } catch (error) {
    console.error("[owner/tables] save failed", { requestId: crypto.randomUUID(), restaurantId: scope.tenantId, table: key || body.table, action: body.action || "upsert", error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Table could not be saved." }, { status: 409 });
  }
}

function isTransferResult(value: unknown): value is { source: Record<string, unknown>; target: Record<string, unknown> } {
  return Boolean(value && typeof value === "object" && "source" in value && "target" in value);
}
