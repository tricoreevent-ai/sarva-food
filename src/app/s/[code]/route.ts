import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const ref = adminDb().collection("smartLinks").doc(code); const snapshot = await ref.get(); const data = snapshot.data();
  if (!snapshot.exists || data?.active !== true || typeof data.targetPath !== "string") return NextResponse.redirect(new URL("/restaurants?notice=link-unavailable", request.url), 307);
  const qr = request.nextUrl.searchParams.get("source") === "qr";
  await ref.set({ clicks: FieldValue.increment(1), ...(qr ? { qrScans: FieldValue.increment(1) } : {}), lastClickedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  const campaignMatch = data.targetPath.match(/^\/restaurant\/([^/]+)\/campaign\/([^/]+)/);
  if (campaignMatch) {
    const campaign = await adminDb().collection("publicMarketingCampaigns").doc(`${campaignMatch[1]}:${campaignMatch[2]}`).get().catch(() => null);
    const campaignId = campaign?.data()?.campaignId;
    if (campaignId) { const hour = new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }); await adminDb().collection("marketingCampaigns").doc(String(campaignId)).set({ "metrics.clicks": FieldValue.increment(1), [`clickHours.${hour}`]: FieldValue.increment(1), lastClickedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined); }
  }
  const target = new URL(data.targetPath, request.url); target.searchParams.set("source", qr ? "qr-campaign" : "whatsapp-campaign"); target.searchParams.set("ref", code);
  return NextResponse.redirect(target, 307);
}
