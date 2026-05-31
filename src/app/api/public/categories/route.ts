import { NextResponse } from "next/server";
import { getPublicCategoryDocs, logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPublicCategoryDocs();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    logPublicDataError("categories", error);
    void notifyPublicDatabaseFailure("categories", error);
    return NextResponse.json({ data: [], error: "Unable to load public categories." }, { status: 500 });
  }
}
