import { NextResponse } from "next/server";
import { CMS_COLLECTIONS } from "@/config/environment/cms.config";
import { adminDb } from "@/firebase/admin";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { notifyPublicDatabaseFailure, rememberPublicOutageAlertConfig } from "@/lib/server/public-outage-alert";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import type { CmsSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await adminDb().collection(CMS_COLLECTIONS.systemSettings).doc(CMS_COLLECTIONS.cmsDocumentId).get();
    const settings = snapshot.exists
      ? resolveCmsSettings({ ...defaultCmsSettings, ...(snapshot.data() as Partial<CmsSettings>) })
      : defaultCmsSettings;
    rememberPublicOutageAlertConfig(settings);

    return NextResponse.json(
      { data: settings },
      { headers: { "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch (error) {
    void notifyPublicDatabaseFailure("cms", error);
    return NextResponse.json(
      { data: defaultCmsSettings },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120" } },
    );
  }
}
