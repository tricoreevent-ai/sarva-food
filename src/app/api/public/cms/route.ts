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
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { data: defaultCmsSettings },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
