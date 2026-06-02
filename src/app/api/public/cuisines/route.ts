import { NextResponse } from "next/server";
import { getPublicCuisineDocs, logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPublicCuisineDocs();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    logPublicDataError("cuisines", error);
    void notifyPublicDatabaseFailure("cuisines", error);
    return NextResponse.json({ data: [], error: "Unable to load public cuisine types." }, { status: 500 });
  }
}
