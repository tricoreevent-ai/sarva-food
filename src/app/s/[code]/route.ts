import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { createHash } from "node:crypto";
import { rateLimit } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = rateLimit(request, "smart-link", 180); if (limited) return limited;
  const code = (await params).code.toUpperCase();
  const ref = adminDb().collection("smartLinks").doc(code); const snapshot = await ref.get(); const data = snapshot.data();
  const origin = publicOrigin(request);
  const path = targetPath(data?.targetPath);
  if (!snapshot.exists || data?.active !== true || !path) return NextResponse.redirect(new URL("/restaurants?notice=link-unavailable", origin), 307);
  const qr = request.nextUrl.searchParams.get("source") === "qr";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; const bucket = Math.floor(Date.now() / 1_800_000); const fingerprint = createHash("sha256").update(`${code}|${ip}|${request.headers.get("user-agent") || "unknown"}|${bucket}`).digest("hex").slice(0, 32); const visitRef = adminDb().collection("smartLinkVisits").doc(fingerprint);
  const unique = await adminDb().runTransaction(async (transaction) => { const visit = await transaction.get(visitRef); if (visit.exists) return false; transaction.create(visitRef, { code, bucket, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() }); transaction.set(ref, { clicks: FieldValue.increment(1), ...(qr ? { qrScans: FieldValue.increment(1) } : {}), lastClickedAt: new Date().toISOString() }, { merge: true }); return true; }).catch(() => false);
  const campaignMatch = path.match(/^\/restaurant\/([^/]+)\/campaign\/([^/]+)/);
  if (campaignMatch && unique) {
    const campaign = await adminDb().collection("publicMarketingCampaigns").doc(`${campaignMatch[1]}:${campaignMatch[2]}`).get().catch(() => null);
    const campaignId = campaign?.data()?.campaignId;
    if (campaignId) { const hour = new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }); await adminDb().collection("marketingCampaigns").doc(String(campaignId)).set({ "metrics.clicks": FieldValue.increment(1), [`clickHours.${hour}`]: FieldValue.increment(1), lastClickedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined); }
  }
  const target = new URL(path, origin); target.searchParams.set("source", qr ? "qr-campaign" : "whatsapp-campaign"); target.searchParams.set("ref", code);
  return NextResponse.redirect(target, 307);
}

function targetPath(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = value.startsWith("http") ? new URL(value) : null;
    if (url && !trustedTargetHost(url.hostname)) return "";
    const path = url ? url.pathname : value;
    return /^\/restaurant\/[^/]+(?:\/menu(?:\/[^/]+)?|\/item\/[^/]+|\/campaign\/[^/]+|\/category\/[^/]+|\/offers?)?\/?$/.test(path) ? path : "";
  } catch { return ""; }
}

function publicOrigin(request: NextRequest) {
  const configured = [process.env.NEXT_PUBLIC_SHORT_LINK_ORIGIN, process.env.NEXT_PUBLIC_APP_URL].map((value) => safeOrigin(value)).find(Boolean);
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const forwarded = safeOrigin(`${proto}://${host}`);
  if (forwarded) return forwarded;
  return "https://violet-squid-380447.hostingersite.com";
}

function safeOrigin(value?: string | null) {
  try {
    if (!value) return "";
    const url = new URL(value);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return "";
    if (["0.0.0.0", "127.0.0.1"].includes(url.hostname)) return "";
    return url.origin;
  } catch { return ""; }
}

function trustedTargetHost(hostname: string) {
  return ["0.0.0.0", "localhost", "127.0.0.1"].includes(hostname) || hostname.endsWith(".hostingersite.com") || hostname.endsWith(".foodgedi.com") || hostname.endsWith(".sarvafood.com");
}
