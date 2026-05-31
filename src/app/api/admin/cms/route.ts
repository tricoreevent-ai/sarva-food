import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { CMS_COLLECTIONS, CMS_VERSION } from "@/config/environment/cms.config";
import { adminDb } from "@/firebase/admin";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { getSessionFromRequest } from "@/lib/server-auth";
import { rememberPublicOutageAlertConfig } from "@/lib/server/public-outage-alert";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import type { CmsSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snapshot = await adminDb().collection(CMS_COLLECTIONS.systemSettings).doc(CMS_COLLECTIONS.cmsDocumentId).get();
  const settings = snapshot.exists
    ? resolveCmsSettings({ ...defaultCmsSettings, ...(snapshot.data() as Partial<CmsSettings>) })
    : defaultCmsSettings;
  rememberPublicOutageAlertConfig(settings);
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
  const session = sessionOrResponse;

  const body = (await request.json().catch(() => ({}))) as { settings?: Partial<CmsSettings> };
  const settings = resolveCmsSettings({
    ...body.settings,
    cmsVersion: CMS_VERSION,
    lastPublishedBy: session.uid,
    lastPublishedAt: new Date().toISOString(),
  });
  const docRef = adminDb().collection(CMS_COLLECTIONS.systemSettings).doc(CMS_COLLECTIONS.cmsDocumentId);
  await docRef.collection("versions").add({
    ...settings,
    modifiedBy: session.uid,
    modifiedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await docRef.set({
    ...settings,
    modifiedBy: session.uid,
    modifiedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  rememberPublicOutageAlertConfig(settings);

  return NextResponse.json({ ok: true, data: settings });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }
  return session;
}
