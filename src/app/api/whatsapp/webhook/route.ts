import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  await adminDb().collection("whatsappWebhooks").add({
    payload,
    status: "received",
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
