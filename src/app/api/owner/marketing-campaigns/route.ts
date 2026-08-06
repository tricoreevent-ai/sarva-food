import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { campaignSlug, emptyMetrics } from "@/features/marketing/campaign-engine";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import { rateLimit } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "owner-marketing-campaigns-read", 90); if (limited) return limited;
  const access = await ownerAccess(request, request.nextUrl.searchParams.get("restaurantId"));
  if (access.error) return access.error;
  const snapshot = await adminDb().collection("marketingCampaigns").where("tenantId", "==", access.tenantId).limit(200).get();
  const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown> & { id: string })).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "owner-marketing-campaigns-write", 40); if (limited) return limited;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const access = await ownerAccess(request, String(body.restaurantId || ""));
  if (access.error) return access.error;
  const parsed = campaignPayload(body);
  if (!parsed.name || !parsed.menuItemIds.length) return NextResponse.json({ error: "Campaign name and at least one menu item are required." }, { status: 400 });
  const now = new Date().toISOString();
  const ref = adminDb().collection("marketingCampaigns").doc();
  const data = { ...parsed, tenantId: access.tenantId, restaurantId: access.tenantId, createdBy: access.uid, createdAt: now, updatedAt: now, metrics: emptyMetrics() };
  await ref.set(data);
  await syncPublicCampaign(ref.id, data);
  return NextResponse.json({ data: { id: ref.id, ...data } });
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request, "owner-marketing-campaigns-write", 80); if (limited) return limited;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const access = await ownerAccess(request, String(body.restaurantId || ""));
  if (access.error) return access.error;
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
  const ref = adminDb().collection("marketingCampaigns").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.tenantId !== access.tenantId) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (body.track) {
    const metric = String(body.track);
    const allowed = new Set(["whatsappShares", "posterDownloads", "copiedLinks", "copiedMessages", "qrDownloads", "clicks", "orders"]);
    if (!allowed.has(metric)) return NextResponse.json({ error: "Invalid metric." }, { status: 400 });
    await ref.update({ [`metrics.${metric}`]: FieldValue.increment(1), updatedAt: new Date().toISOString() });
  } else {
    const data = { ...campaignPayload(body), tenantId: access.tenantId, restaurantId: access.tenantId, updatedAt: new Date().toISOString() };
    await ref.set(data, { merge: true });
    await syncPublicCampaign(id, { ...snapshot.data(), ...data });
  }
  const updated = await ref.get();
  return NextResponse.json({ data: { id, ...updated.data() } });
}

async function ownerAccess(request: NextRequest, requested: string | null) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session) return { error: NextResponse.json({ error: "Owner access is required." }, { status: 403 }), tenantId: "", uid: "" };
  const tenantId = resolveTenantId(requested || session.tenantId || "");
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  if (!tenantId || (allowed.size && !allowed.has(tenantId))) return { error: NextResponse.json({ error: "Restaurant access is required." }, { status: 403 }), tenantId, uid: session.uid };
  return { error: null, tenantId, uid: session.uid };
}

function campaignPayload(body: Record<string, unknown>) {
  const status = ["draft", "published", "archived", "scheduled"].includes(String(body.status)) ? String(body.status) : "draft";
  return {
    publicSlug: campaignSlug(String(body.publicSlug || body.name || "campaign")), name: String(body.name || "").slice(0, 120), type: String(body.type || "Custom").slice(0, 60), status,
    menuItemIds: Array.isArray(body.menuItemIds) ? body.menuItemIds.map(String).slice(0, 30) : [], template: String(body.template || "todays-special"), tone: String(body.tone || "professional"),
    layout: String(body.layout || "Classic"), socialFormat: String(body.socialFormat || "WhatsApp"), cta: String(body.cta || "Order Now").slice(0, 40), message: String(body.message || "").slice(0, 8000),
    scheduleAt: iso(body.scheduleAt), scheduleKind: String(body.scheduleKind || "").slice(0, 40), orderingOpensAt: iso(body.orderingOpensAt), orderingClosesAt: iso(body.orderingClosesAt), cookingStartsAt: iso(body.cookingStartsAt), deliveryStartsAt: iso(body.deliveryStartsAt), pickupStartsAt: iso(body.pickupStartsAt), expiresAt: iso(body.expiresAt), autoDisableAt: iso(body.autoDisableAt), maximumOrders: positiveInt(body.maximumOrders), maximumQuantity: positiveInt(body.maximumQuantity), orderCount: Number(body.orderCount || 0), quantityOrdered: Number(body.quantityOrdered || 0), shortUrl: String(body.shortUrl || "").slice(0, 500), itemSnapshots: sanitizeItems(body.itemSnapshots), restaurantName: String(body.restaurantName || "").slice(0, 160), restaurantSlug: String(body.restaurantSlug || "").slice(0, 160),
  };
}

function sanitizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((raw) => { const item = raw as Record<string, unknown>; return { name: String(item.name || "").slice(0, 160), publicSlug: campaignSlug(String(item.name || "item")), image: String(item.image || "").slice(0, 2000), category: String(item.category || "").slice(0, 100), price: Number(item.price || 0), offerPrice: Number(item.offerPrice || 0), isVeg: Boolean(item.isVeg), badges: Array.isArray(item.badges) ? item.badges.map(String).slice(0, 3) : [] }; });
}

async function syncPublicCampaign(id: string, data: Record<string, unknown>) {
  const tenantId = String(data.tenantId || ""); const slug = campaignSlug(String(data.publicSlug || data.name || id));
  const ref = adminDb().collection("publicMarketingCampaigns").doc(`${tenantId}:${slug}`);
  if (data.status !== "published" && data.status !== "scheduled") { await ref.delete().catch(() => undefined); return; }
  await ref.set({ campaignId: id, campaignSlug: slug, restaurantSlug: String(data.restaurantSlug || tenantId), restaurantName: String(data.restaurantName || ""), name: String(data.name || ""), type: String(data.type || ""), cta: String(data.cta || "Order Now"), layout: String(data.layout || "Classic"), items: data.itemSnapshots ?? [], scheduleAt: data.scheduleAt || "", orderingOpensAt: data.orderingOpensAt || "", orderingClosesAt: data.orderingClosesAt || "", cookingStartsAt: data.cookingStartsAt || "", deliveryStartsAt: data.deliveryStartsAt || "", pickupStartsAt: data.pickupStartsAt || "", expiresAt: data.expiresAt || "", autoDisableAt: data.autoDisableAt || "", maximumOrders: data.maximumOrders || 0, maximumQuantity: data.maximumQuantity || 0, orderCount: data.orderCount || 0, quantityOrdered: data.quantityOrdered || 0, status: data.status, publishedAt: new Date().toISOString() });
}

function iso(value: unknown) { const text = String(value || "").slice(0, 40); return text && Number.isFinite(new Date(text).getTime()) ? new Date(text).toISOString() : ""; }
function positiveInt(value: unknown) { const number = Math.floor(Number(value || 0)); return Number.isFinite(number) && number > 0 ? Math.min(number, 100000) : 0; }
