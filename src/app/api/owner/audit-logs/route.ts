import { NextResponse, type NextRequest } from "next/server";
import { AuditRepository } from "@/repositories/audit-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "auditLogs", request.nextUrl.searchParams.get("format") === "csv" ? "export" : "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new AuditRepository().list(scope, {
    action: request.nextUrl.searchParams.get("action") ?? undefined,
    module: request.nextUrl.searchParams.get("module") ?? undefined,
    userId: request.nextUrl.searchParams.get("userId") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const rows = [["Date", "User", "Role", "Module", "Action", "Entity", "Note"], ...data.map((row) => [
      String(row.createdAt ?? ""),
      String(row.userName ?? row.userId ?? ""),
      String(row.role ?? ""),
      String(row.module ?? ""),
      String(row.action ?? ""),
      String(row.entityId ?? ""),
      String(row.note ?? ""),
    ])];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=audit-logs.csv" } });
  }
  return NextResponse.json({ data, count: data.length });
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
