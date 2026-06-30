import { NextResponse, type NextRequest } from "next/server";
import { AuditRepository } from "@/repositories/audit-repository";
import { CommunicationRepository, type CommunicationSettings } from "@/repositories/communication-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined;
  const access = await requireOwnerFeature(request, orderId ? "orders" : "settings", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const data = await new CommunicationRepository().get(scope, orderId);
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { settings?: CommunicationSettings; restaurantId?: string };
  if (!body.settings) return NextResponse.json({ error: "Communication settings are required." }, { status: 400 });
  const scope = tenantScope(access.session, body.restaurantId);
  const data = await new CommunicationRepository().save(scope, body.settings);
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "communication_settings", module: "settings" });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    action?: "contact" | "not-reachable" | "test";
    channel?: "call" | "whatsapp" | "sms" | "smtp" | "maps" | "system";
    restaurantId?: string;
    orderId?: string;
    target?: string;
    customerName?: string;
    customerPhone?: string;
    message?: string;
  };
  const access = await requireOwnerFeature(request, body.orderId ? "orders" : "settings", "update");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, body.restaurantId);
  if (!body.action || !body.channel) return NextResponse.json({ error: "Communication action and channel are required." }, { status: 400 });
  const data = await new CommunicationRepository().log(scope, {
    action: body.action,
    channel: body.channel,
    status: body.action === "contact" ? "opened" : "queued",
    orderId: body.orderId,
    target: body.target,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    message: body.message ?? communicationMessage(body.action, body.channel),
  });
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: `communication_${body.action}`, module: body.orderId ? "orders" : "settings", entityId: body.orderId, after: data });
  return NextResponse.json({ data });
}

function communicationMessage(action: string, channel: string) {
  if (action === "not-reachable") return "Customer marked not reachable.";
  if (action === "test") return `${channel.toUpperCase()} test queued.`;
  return `${channel.toUpperCase()} contact opened.`;
}
