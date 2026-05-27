import { NextResponse, type NextRequest } from "next/server";
import { getPublicMenuDocs, logPublicDataError } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=20, s-maxage=20, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ data: [] }, { headers: CACHE_HEADERS });
    }

    const data = await getPublicMenuDocs(restaurantId);
    return NextResponse.json(
      { data },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("menu", error);
    return NextResponse.json({ data: [], error: "Unable to load public menu." }, { status: 500 });
  }
}
