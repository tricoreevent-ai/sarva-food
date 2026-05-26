import { NextResponse } from "next/server";
import { getPublicCategoryDocs } from "@/lib/server/public-firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPublicCategoryDocs();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ data: [], error: "Unable to load public categories." }, { status: 500 });
  }
}
