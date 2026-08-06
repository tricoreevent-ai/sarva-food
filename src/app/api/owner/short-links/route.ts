import { createHash } from "node:crypto";
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
  const kind = ["item", "campaign", "menu", "category", "offer"].includes(String(body.kind)) ? String(body.kind) : "campaign";
  const digest = createHash("sha256").update(`${tenantId}|${targetPath}`).digest("base64url").toUpperCase();
  let code = digest.slice(0, 7); let existing: FirebaseFirestore.DocumentSnapshot | null = null;
  for (let length = 7; length <= 12; length += 1) { code = digest.slice(0, length); existing = await adminDb().collection("smartLinks").doc(code).get(); if (!existing.exists || existing.data()?.targetPath === targetPath) break; }
  if (existing?.exists && existing.data()?.targetPath !== targetPath) return NextResponse.json({ error: "A stable smart link could not be allocated. Retry in a moment." }, { status: 503 });
  const now = new Date().toISOString();
  await adminDb().collection("smartLinks").doc(code).set({ code, tenantId, restaurantId: tenantId, targetPath, kind, active: true, ...(!existing?.exists ? { clicks: 0, qrScans: 0, createdBy: session.uid, createdAt: now } : {}), updatedAt: now }, { merge: true });
  const origin = (process.env.NEXT_PUBLIC_SHORT_LINK_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  return NextResponse.json({ data: { code, shortUrl: `${origin}/s/${code}`, targetPath, kind } });
}

function safeTarget(value: string) {
  try {
    const path = value.startsWith("http") ? new URL(value).pathname : value;
    if (!/^\/restaurant\/[^/]+(?:\/menu(?:\/[^/]+)?|\/campaign\/[^/]+|\/category\/[^/]+|\/offers?)?\/?$/.test(path)) return "";
    return path;
  } catch { return ""; }
}
