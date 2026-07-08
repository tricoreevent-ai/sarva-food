import { NextResponse, type NextRequest } from "next/server";
import { buildHealthSnapshot, healthHeaders, healthStatusCode } from "@/lib/server/production-health";
import { createTraceContext, publicTraceMeta } from "@/lib/server/request-trace";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const trace = createTraceContext(request);
  const snapshot = await buildHealthSnapshot("startup");
  return NextResponse.json({ ...snapshot, meta: publicTraceMeta(trace) }, { status: healthStatusCode(snapshot), headers: healthHeaders });
}
