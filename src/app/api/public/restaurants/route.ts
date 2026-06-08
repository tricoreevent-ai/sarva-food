import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getPublicRestaurantDocs, logPublicDataError, logPublicDataInfo } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const slug = request.nextUrl.searchParams.get("slug") ?? undefined;
  try {
    const data = await getPublicRestaurantDocs(slug);
    logPublicDataInfo("restaurants-api", "Request completed.", {
      requestId,
      slug: slug ?? null,
      count: data.length,
      durationMs: Date.now() - startedAt,
      host: request.headers.get("host"),
    });
    return NextResponse.json(
      { data, meta: { requestId, count: data.length } },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("restaurants", error);
    void notifyPublicDatabaseFailure("restaurants", error);
    return NextResponse.json({ data: [], error: "Unable to load public restaurants.", meta: { requestId, count: 0 } }, { status: 500 });
  }
}
