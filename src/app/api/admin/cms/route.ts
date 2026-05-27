import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { CmsBanner, CmsSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snapshot = await adminDb().collection("appSettings").doc("cms").get();
  const settings = snapshot.exists
    ? { ...defaultCmsSettings, ...(snapshot.data() as Partial<CmsSettings>) }
    : defaultCmsSettings;
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => ({}))) as { settings?: Partial<CmsSettings> };
  const settings = normalizeCmsSettings(body.settings);
  await adminDb().collection("appSettings").doc("cms").set({
    ...settings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return NextResponse.json({ ok: true, data: settings });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }
  return null;
}

function normalizeCmsSettings(input?: Partial<CmsSettings>): CmsSettings {
  const settings = { ...defaultCmsSettings, ...(input ?? {}) };
  return {
    ...settings,
    homepage: {
      title: settings.homepage?.title?.trim() || defaultCmsSettings.homepage.title,
      subtitle: settings.homepage?.subtitle?.trim() || defaultCmsSettings.homepage.subtitle,
      visible: settings.homepage?.visible !== false,
    },
    banners: normalizeBanners(settings.banners),
    announcements: normalizeBanners(settings.announcements),
    sponsoredAds: normalizeBanners(settings.sponsoredAds),
    footer: {
      visible: settings.footer?.visible !== false,
      note: settings.footer?.note?.trim() || settings.disclaimer || defaultCmsSettings.disclaimer,
    },
    legalPages: {
      terms: settings.legalPages?.terms?.trim() || settings.disclaimer || defaultCmsSettings.legalPages.terms,
      privacy: settings.legalPages?.privacy?.trim() || defaultCmsSettings.legalPages.privacy,
    },
  };
}

function normalizeBanners(items?: CmsBanner[]) {
  return (items ?? [])
    .filter((item) => item.title?.trim() && item.imageUrl?.trim())
    .map((item, index) => ({
      ...item,
      id: item.id || `cms-${Date.now()}-${index}`,
      title: item.title.trim(),
      subtitle: item.subtitle?.trim() ?? "",
      imageUrl: item.imageUrl.trim(),
      mobileImageUrl: item.mobileImageUrl?.trim() ?? "",
      ctaLabel: item.ctaLabel?.trim() ?? "",
      ctaHref: item.ctaHref?.trim() ?? "",
      visible: item.visible !== false,
      sortOrder: Number(item.sortOrder) || index + 1,
    }));
}
