import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getPublicRestaurantDocs, logPublicDataError, logPublicDataInfo } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { getCachedPublicApiData, PUBLIC_CATALOG_CACHE_HEADERS, publicDataFailurePayload } from "@/lib/server/public-api-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const slug = request.nextUrl.searchParams.get("slug") ?? undefined;
  try {
    const result = await getCachedPublicApiData(`public:restaurants:${slug ?? "all"}`, () => getPublicRestaurantDocs(slug));
    const data = result.data;
    logPublicDataInfo("restaurants-api", "Request completed.", {
      requestId,
      slug: slug ?? null,
      count: data.length,
      durationMs: Date.now() - startedAt,
      host: request.headers.get("host"),
      cacheStatus: result.status,
    });
    return NextResponse.json(
      { data, meta: { requestId, count: data.length, cacheStatus: result.status } },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("restaurants", error);
    void notifyPublicDatabaseFailure("restaurants", error);
    const failure = publicDataFailurePayload(error);
    return NextResponse.json({ ...failure.body, meta: { ...failure.body.meta, requestId, count: 0 } }, { status: failure.status });
  }
}
