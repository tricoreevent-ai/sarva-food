import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getSessionFromRequest } from "@/lib/server-auth";
import { MasterMenuTemplateRepository } from "@/repositories/master-menu-template-repository";
import { keralaStarterMenuTemplates, normalizeMasterTemplate, templatesToCsv, templatesToExcelRows, type MasterTemplateInput, type TemplateImportFormat, type TemplateImportMode } from "@/lib/master-menu-template-normalizer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TemplateAction = "delete" | "archive" | "restore" | "enable" | "disable" | "toggle" | "duplicate";

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  try {
    const params = request.nextUrl.searchParams;
    const repository = new MasterMenuTemplateRepository();
    const format = params.get("format") as TemplateImportFormat | null;
    const ids = (params.get("ids") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const options = {
      q: params.get("q") ?? "",
      categoryId: params.get("categoryId") ?? "",
      subcategoryId: params.get("subcategoryId") ?? "",
      cuisineId: params.get("cuisineId") ?? "",
      foodType: params.get("foodType") ?? "",
      tag: params.get("tag") ?? "",
      status: params.get("status") ?? "all",
      minRating: Number(params.get("minRating") || 0),
      maxPrice: Number(params.get("maxPrice") || 0),
      maxPrepTime: Number(params.get("maxPrepTime") || 0),
      sort: params.get("sort") ?? "",
      ids,
      includeArchived: params.get("includeArchived") === "1",
      limit: Number(params.get("limit") ?? 24),
      offset: Number(params.get("offset") ?? 0),
    };
    if (params.get("sample") === "1") return exportRows(keralaStarterMenuTemplates.map((item, index) => normalizeMasterTemplate(item, index)), format ?? "json", "sample-master-menu-templates");
    if (format === "xlsx") return exportRows(await repository.exportRows(options), format, "master-menu-templates");
    if (format === "json" || format === "csv") {
      const exported = await repository.export(options, format);
      return new NextResponse(exported.body, {
        headers: {
          "Content-Type": exported.contentType,
          "Content-Disposition": `attachment; filename="${exported.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(await repository.list(options));
  } catch (error) {
    logTemplateError("list", error);
    return NextResponse.json({ error: "Menu templates could not be loaded." }, { status: 500 });
  }
}

function exportRows(rows: MasterTemplateInput[], format: TemplateImportFormat, name: string) {
  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templatesToExcelRows(rows)), "Templates");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const body = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(body).set(buffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const body = format === "csv" ? templatesToCsv(rows) : JSON.stringify({ templates: rows }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({})) as {
    action?: "seed-kerala" | "import";
    template?: MasterTemplateInput;
    templates?: MasterTemplateInput[];
    payload?: unknown;
    format?: TemplateImportFormat;
    mode?: TemplateImportMode;
  };
  const repository = new MasterMenuTemplateRepository();
  try {
    if (body.action === "seed-kerala") return NextResponse.json({ summary: await repository.seedKerala(session.uid) });
    if (body.action === "import") return NextResponse.json({ summary: await repository.importPayload(body, session.uid) });
    if (!body.template) return NextResponse.json({ error: "Template data is required." }, { status: 400 });
    return NextResponse.json({ data: await repository.upsert(body.template, session.uid) });
  } catch (error) {
    logTemplateError("save", error);
    return NextResponse.json({ error: "Template import or save failed. Check the data and try again." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({})) as { id?: string; ids?: string[]; action?: TemplateAction };
  if (!body.action) return NextResponse.json({ error: "Template action is required." }, { status: 400 });
  try {
    const repository = new MasterMenuTemplateRepository();
    if (body.ids?.length && body.action !== "duplicate") return NextResponse.json({ data: await repository.bulkAction(body.ids, body.action, session.uid) });
    if (!body.id) return NextResponse.json({ error: "Template id is required." }, { status: 400 });
    return NextResponse.json({ data: await repository.action(body.id, body.action, session.uid) });
  } catch (error) {
    logTemplateError("action", error);
    return NextResponse.json({ error: "Template action failed. Try again." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Template id is required." }, { status: 400 });
  try {
    return NextResponse.json({ data: await new MasterMenuTemplateRepository().action(id, "delete", session.uid) });
  } catch (error) {
    logTemplateError("delete", error);
    return NextResponse.json({ error: "Template delete failed. Try again." }, { status: 400 });
  }
}

function logTemplateError(action: string, error: unknown) {
  console.error("[admin-master-menu-templates] request failed", { action, reason: error instanceof Error ? error.name : typeof error });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request, "admin");
  if (!session || !["admin", "super_admin"].includes(session.role)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  return session;
}
