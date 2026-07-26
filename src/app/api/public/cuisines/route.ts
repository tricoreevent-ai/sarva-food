import { NextResponse } from "next/server";
import { getPublicCuisineDocs, logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { getCachedPublicApiData, PUBLIC_CATALOG_CACHE_HEADERS, publicDataFailurePayload } from "@/lib/server/public-api-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getCachedPublicApiData("public:cuisines", getPublicCuisineDocs, 30 * 60 * 1000);
    return NextResponse.json(
      { data: result.data, meta: { cacheStatus: result.status } },
      { headers: PUBLIC_CATALOG_CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("cuisines", error);
    void notifyPublicDatabaseFailure("cuisines", error);
    const failure = publicDataFailurePayload(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
