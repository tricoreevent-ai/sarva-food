import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicData } from "@/lib/server/public-cache";
import { getPublicMenuDocs } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ data: [] }, { headers: CACHE_HEADERS });
    }

    const result = await getCachedPublicData(
      `public:menu:${restaurantId}`,
      () => getPublicMenuDocs(restaurantId),
      { ttlMs: 30_000, staleMs: 120_000 },
    );
    return NextResponse.json(
      { data: result.data },
      { headers: { ...CACHE_HEADERS, "X-Sarva-Cache": result.status } },
    );
  } catch {
    return NextResponse.json({ data: [], error: "Unable to load public menu." }, { status: 500 });
  }
}
