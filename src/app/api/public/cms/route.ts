import { NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import type { CmsSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await adminDb().collection("appSettings").doc("cms").get();
    const settings = snapshot.exists
      ? { ...defaultCmsSettings, ...(snapshot.data() as Partial<CmsSettings>) }
      : defaultCmsSettings;

    return NextResponse.json(
      { data: settings },
      { headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json(
      { data: defaultCmsSettings },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120" } },
    );
  }
}
