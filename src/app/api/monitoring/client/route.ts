import { NextResponse, type NextRequest } from "next/server";
import { recordClientMonitoringSignal } from "@/lib/server/production-monitoring";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_768) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`client-monitoring:${clientId}`, 120).ok) {
    return NextResponse.json({ error: "Too many monitoring events." }, { status: 429 });
  }
  const payload = await request.json().catch(() => null) as {
    event?: string;
    path?: string;
    payload?: Record<string, unknown>;
  } | null;
  if (payload) {
    recordClientMonitoringSignal({
      event: payload.event?.slice(0, 120),
      path: (payload.path || request.headers.get("referer") || "").slice(0, 500),
      payload: payload.payload,
    });
  }
  return NextResponse.json({ ok: true });
}
