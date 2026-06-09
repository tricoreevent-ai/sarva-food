import { NextResponse, type NextRequest } from "next/server";
import { getPublicMenuDocs, logPublicDataError, logPublicDataInfo } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=20, s-maxage=20, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ data: [], meta: { requestId, count: 0 } }, { headers: CACHE_HEADERS });
    }

    const data = await getPublicMenuDocs(restaurantId);
    logPublicDataInfo("menu", "Public menu request completed.", {
      requestId,
      restaurantId,
      count: data.length,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { data, meta: { requestId, count: data.length } },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError(`menu:${requestId}`, error);
    void notifyPublicDatabaseFailure("menu", error);
    return NextResponse.json({ data: [], error: "Unable to load public menu.", meta: { requestId, count: 0 } }, { status: 500 });
  }
}
