import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { MasterMenuTemplateRepository } from "@/repositories/master-menu-template-repository";
import type { MasterTemplateInput, TemplateImportFormat, TemplateImportMode } from "@/lib/master-menu-template-normalizer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TemplateAction = "delete" | "archive" | "restore" | "enable" | "disable" | "toggle" | "duplicate";

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const params = request.nextUrl.searchParams;
  const repository = new MasterMenuTemplateRepository();
  const format = params.get("format") as TemplateImportFormat | null;
  const options = {
    q: params.get("q") ?? "",
    categoryId: params.get("categoryId") ?? "",
    cuisineId: params.get("cuisineId") ?? "",
    foodType: params.get("foodType") ?? "",
    tag: params.get("tag") ?? "",
    status: params.get("status") ?? "all",
    includeArchived: params.get("includeArchived") === "1",
    limit: Number(params.get("limit") ?? 24),
    offset: Number(params.get("offset") ?? 0),
  };
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Template save failed." }, { status: 400 });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Template action failed." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Template id is required." }, { status: 400 });
  return NextResponse.json({ data: await new MasterMenuTemplateRepository().action(id, "delete", session.uid) });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request, "admin");
  if (!session || !["admin", "super_admin"].includes(session.role)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  return session;
}
