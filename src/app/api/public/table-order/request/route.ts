import { NextResponse, type NextRequest } from "next/server";
import { TableRepository } from "@/repositories/table-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowed = new Set(["call-waiter", "water", "tissue", "bill", "assistance", "cleaning", "extra-plate", "cancel-request"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { token?: string; sessionId?: string; deviceId?: string; type?: string; message?: string };
  if (!body.token || !body.sessionId || !body.type || !allowed.has(body.type)) return NextResponse.json({ error: "Valid service request is required." }, { status: 400 });
  const result = await new TableRepository().serviceRequest(body.token, body.sessionId, body.deviceId || request.headers.get("user-agent") || "browser", { type: body.type, message: body.message }).catch((error) => error);
  if (result instanceof Error) return NextResponse.json({ error: result.message }, { status: 409 });
  return NextResponse.json({ ok: true, data: result.request });
}
