import { NextResponse, type NextRequest } from "next/server";
import { getPublicRestaurantDocs, logPublicDataError } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=180",
};

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug") ?? undefined;
    const data = await getPublicRestaurantDocs(slug);
    return NextResponse.json(
      { data },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("restaurants", error);
    return NextResponse.json({ data: [], error: "Unable to load public restaurants." }, { status: 500 });
  }
}
