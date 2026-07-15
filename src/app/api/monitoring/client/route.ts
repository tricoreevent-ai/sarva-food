import { NextResponse, type NextRequest } from "next/server";
import { recordClientMonitoringSignal } from "@/lib/server/production-monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as {
    event?: string;
    path?: string;
    payload?: Record<string, unknown>;
  } | null;
  if (payload) {
    recordClientMonitoringSignal({
      event: payload.event,
      path: payload.path || request.headers.get("referer") || "",
      payload: payload.payload,
    });
  }
  return NextResponse.json({ ok: true });
}
