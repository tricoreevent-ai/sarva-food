import { NextResponse, type NextRequest } from "next/server";
import { getCachedPublicData } from "@/lib/server/public-cache";
import { getPublicRestaurantDocs } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug") ?? undefined;
    const result = await getCachedPublicData(
      `public:restaurants:${slug ?? "all"}`,
      () => getPublicRestaurantDocs(slug),
      { ttlMs: 30_000, staleMs: 120_000 },
    );
    return NextResponse.json(
      { data: result.data },
      { headers: { ...CACHE_HEADERS, "X-Sarva-Cache": result.status } },
    );
  } catch {
    return NextResponse.json({ data: [], error: "Unable to load public restaurants." }, { status: 500 });
  }
}
