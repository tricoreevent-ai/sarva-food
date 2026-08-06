import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import { rateLimit } from "@/lib/server/rate-limit";

const channels = new Set(["whatsapp", "whatsapp-web", "copy-message", "copy-link", "download"]);

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "owner-marketing-shares-read", 120); if (limited) return limited;
  const session = await getSessionFromRequest(request, "owner");
  if (!session) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const tenantId = resolveTenantId(request.nextUrl.searchParams.get("restaurantId") || session.tenantId || "");
  const menuItemId = String(request.nextUrl.searchParams.get("menuItemId") || "").slice(0, 160);
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  if (!tenantId || !menuItemId || (allowed.size && !allowed.has(tenantId))) return NextResponse.json({ error: "Invalid analytics request." }, { status: 400 });
  const snapshot = await adminDb().collection("marketingShareMetrics").doc(`${tenantId}:${menuItemId}`).get();
  const data = snapshot.data() ?? {};
  const shares = Number(data.shares || 0); const clicks = Number(data.clicks || 0); const orders = Number(data.orders || 0);
  return NextResponse.json({ data: { shares, lastShared: data.lastShared, clicks, orders, conversion: clicks ? Math.round((orders / clicks) * 1000) / 10 : 0 } });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "owner-marketing-shares-write", 120); if (limited) return limited;
  const session = await getSessionFromRequest(request, "owner");
  if (!session) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenantId = resolveTenantId(String(body.restaurantId || session.tenantId || ""));
  const menuItemId = String(body.menuItemId || "").slice(0, 160);
  const channel = String(body.channel || "");
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  if (!tenantId || !menuItemId || !channels.has(channel) || (allowed.size && !allowed.has(tenantId))) return NextResponse.json({ error: "Invalid share event." }, { status: 400 });

  const now = new Date().toISOString();
  const db = adminDb();
  const event = db.collection("marketingShares").doc();
  const metric = db.collection("marketingShareMetrics").doc(`${tenantId}:${menuItemId}`);
  await db.runTransaction(async (tx) => {
    tx.set(event, { tenantId, restaurantId: tenantId, menuItemId, menuItemName: String(body.menuItemName || "").slice(0, 160), channel, sharedBy: session.uid, createdAt: now });
    tx.set(metric, { tenantId, restaurantId: tenantId, menuItemId, shares: FieldValue.increment(1), lastShared: now, clicks: FieldValue.increment(0), orders: FieldValue.increment(0), updatedAt: now }, { merge: true });
  });
  return NextResponse.json({ data: { recorded: true } });
}
