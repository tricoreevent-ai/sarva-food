import { NextResponse, type NextRequest } from "next/server";
import { getPublicOfferDocs, logPublicDataError } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=180",
};

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    const data = await getPublicOfferDocs(restaurantId ?? undefined);
    return NextResponse.json(
      { data },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("offers", error);
    return NextResponse.json({ data: [], error: "Unable to load public offers." }, { status: 500 });
  }
}
