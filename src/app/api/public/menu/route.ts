import { NextResponse, type NextRequest } from "next/server";
import { getPublicMenuDocs, logPublicDataError, logPublicDataInfo } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { getCachedPublicApiData, PUBLIC_CATALOG_CACHE_HEADERS, publicDataFailurePayload } from "@/lib/server/public-api-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ data: [], meta: { requestId, count: 0 } }, { headers: PUBLIC_CATALOG_CACHE_HEADERS });
    }

    const result = await getCachedPublicApiData(`public:menu:${restaurantId}`, () => getPublicMenuDocs(restaurantId));
    const data = result.data;
    logPublicDataInfo("menu", "Public menu request completed.", {
      requestId,
      restaurantId,
      count: data.length,
      durationMs: Date.now() - startedAt,
      cacheStatus: result.status,
    });
    return NextResponse.json(
      {
        data,
        meta: {
          requestId,
          count: data.length,
          cacheStatus: result.status,
          ...(data.length === 0 ? { emptyReason: "no-customer-visible-menu-items" } : {}),
        },
      },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError(`menu:${requestId}`, error);
    void notifyPublicDatabaseFailure("menu", error);
    const failure = publicDataFailurePayload(error);
    return NextResponse.json({ ...failure.body, meta: { ...failure.body.meta, requestId, count: 0 } }, { status: failure.status });
  }
}
