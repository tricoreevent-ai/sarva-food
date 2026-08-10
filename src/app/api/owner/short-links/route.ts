import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import { rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "owner-short-links", 40); if (limited) return limited;
  const session = await getSessionFromRequest(request, "owner");
  if (!session) return NextResponse.json({ error: "Sign in as an owner to create a smart link." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenantId = resolveTenantId(String(body.restaurantId || session.tenantId || ""));
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean).map(resolveTenantId));
  if (!tenantId || (allowed.size && !allowed.has(tenantId))) return NextResponse.json({ error: "This restaurant is not available to your account." }, { status: 403 });
  const targetPath = safeTarget(String(body.targetPath || ""));
  if (!targetPath) return NextResponse.json({ error: "Choose a valid public restaurant, menu, item, or campaign page." }, { status: 400 });
  const kind = ["item", "campaign", "menu", "category", "offer", "restaurant"].includes(String(body.kind)) ? String(body.kind) : "campaign";
  const digest = createHash("sha256").update(`${tenantId}|${targetPath}`).digest("base64url").toUpperCase();
  let code = digest.slice(0, 7); let existing: FirebaseFirestore.DocumentSnapshot | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    code = attempt < 5 ? digest.slice(0, 7 + attempt) : randomBytes(6).toString("base64url").replace(/[-_]/g, "").toUpperCase().slice(0, 8);
    existing = await adminDb().collection("smartLinks").doc(code).get();
    if (!existing.exists || existing.data()?.targetPath === targetPath) break;
  }
  if (existing?.exists && existing.data()?.targetPath !== targetPath) return NextResponse.json({ error: "A stable smart link could not be allocated. Retry in a moment." }, { status: 503 });
  const now = new Date().toISOString();
  await adminDb().collection("smartLinks").doc(code).set({ code, tenantId, restaurantId: tenantId, ownerId: session.uid, targetPath, targetType: kind, kind, active: true, status: "active", ...targetMetadata(targetPath), ...(!existing?.exists ? { clicks: 0, clickCount: 0, uniqueClickCount: 0, qrScans: 0, createdBy: session.uid, createdAt: now } : {}), updatedAt: now }, { merge: true });
  const origin = trustedOrigin(request);
  return NextResponse.json({ data: { code, shortUrl: `${origin}/s/${code}`, targetPath, kind } });
}

function safeTarget(value: string) {
  try {
    const path = value.startsWith("http") ? new URL(value).pathname : value;
    if (!/^\/restaurant\/[^/]+(?:\/menu(?:\/[^/]+)?|\/item\/[^/]+|\/campaign\/[^/]+|\/category\/[^/]+|\/offers?)?\/?$/.test(path)) return "";
    return path;
  } catch { return ""; }
}

function trustedOrigin(request: NextRequest) {
  const configured = [process.env.NEXT_PUBLIC_SHORT_LINK_ORIGIN, process.env.NEXT_PUBLIC_APP_URL].map((value) => safeHttpsOrigin(value)).find(Boolean);
  if (configured) return configured;
  const requestOrigin = safeHttpsOrigin(request.nextUrl.origin);
  if (requestOrigin && trustedHost(new URL(requestOrigin).hostname)) return requestOrigin;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const forwarded = safeHttpsOrigin(`${protocol}://${host}`);
  if (forwarded && trustedHost(new URL(forwarded).hostname)) return forwarded;
  return request.nextUrl.origin.replace(/\/$/, "");
}

function safeHttpsOrigin(value?: string | null) {
  try {
    if (!value) return "";
    const url = new URL(value);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return "";
    return url.origin;
  } catch { return ""; }
}

function trustedHost(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".hostingersite.com") || hostname.endsWith(".foodgedi.com") || hostname.endsWith(".sarvafood.com");
}

function targetMetadata(path: string) {
  const item = path.match(/^\/restaurant\/([^/]+)\/item\/([^/]+)/);
  const campaign = path.match(/^\/restaurant\/([^/]+)\/campaign\/([^/]+)/);
  return item ? { targetId: item[2], itemId: item[2], restaurantSlug: item[1] } : campaign ? { targetId: campaign[2], campaignId: campaign[2], restaurantSlug: campaign[1] } : {};
}
