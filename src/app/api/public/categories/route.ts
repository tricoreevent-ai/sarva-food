import { NextResponse } from "next/server";
import { getPublicCategoryDocs, logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { getCachedPublicApiData, PUBLIC_CATALOG_CACHE_HEADERS, publicDataFailurePayload } from "@/lib/server/public-api-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getCachedPublicApiData("public:categories", getPublicCategoryDocs, 30 * 60 * 1000);
    return NextResponse.json(
      { data: result.data, meta: { cacheStatus: result.status } },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("categories", error);
    void notifyPublicDatabaseFailure("categories", error);
    const failure = publicDataFailurePayload(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
