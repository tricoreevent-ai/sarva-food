import { NextResponse, type NextRequest } from "next/server";
import { getPublicOfferDocs, logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { getCachedPublicApiData, PUBLIC_CATALOG_CACHE_HEADERS, publicDataFailurePayload } from "@/lib/server/public-api-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    const result = await getCachedPublicApiData(`public:offers:${restaurantId ?? "all"}`, () => getPublicOfferDocs(restaurantId ?? undefined), 2 * 60 * 1000);
    return NextResponse.json(
      { data: result.data, meta: { cacheStatus: result.status } },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("offers", error);
    void notifyPublicDatabaseFailure("offers", error);
    const failure = publicDataFailurePayload(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
