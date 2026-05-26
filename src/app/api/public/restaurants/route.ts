import { NextResponse, type NextRequest } from "next/server";
import { getPublicRestaurantDocs } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug") ?? undefined;
    const data = await getPublicRestaurantDocs(slug);
    return NextResponse.json(
      { data },
      { headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json({ data: [], error: "Unable to load public restaurants." }, { status: 500 });
  }
}
