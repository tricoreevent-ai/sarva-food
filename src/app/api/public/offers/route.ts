import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicData } from "@/lib/server/public-cache";
import { getPublicOfferDocs } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    const result = await getCachedPublicData(
      `public:offers:${restaurantId ?? "all"}`,
      () => getPublicOfferDocs(restaurantId ?? undefined),
      { ttlMs: 30_000, staleMs: 120_000 },
    );
    return NextResponse.json(
      { data: result.data },
      { headers: { ...CACHE_HEADERS, "X-Sarva-Cache": result.status } },
    );
  } catch {
    return NextResponse.json({ data: [], error: "Unable to load public offers." }, { status: 500 });
  }
}
