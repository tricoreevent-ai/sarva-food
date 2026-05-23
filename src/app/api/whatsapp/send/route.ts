import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { requireServerEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";
import { toWhatsappCloudTemplate, type WhatsappMessageDraft } from "@/services/whatsapp-service";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!rateLimit(`whatsapp-send:${session.uid}`, 30).ok) {
    return NextResponse.json({ error: "Too many WhatsApp requests" }, { status: 429 });
  }

  const draft = (await request.json()) as WhatsappMessageDraft;
  const eventRef = await adminDb().collection("whatsappEvents").add({
    ...draft,
    requestedBy: session.uid,
    ...(session.tenantId ? { tenantId: session.tenantId } : {}),
    status: "queued",
    attempts: 0,
    createdAt: new Date(),
  });

  const env = requireServerEnv(["WHATSAPP_CLOUD_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]);
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_CLOUD_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(toWhatsappCloudTemplate(draft)),
    },
  );

  await eventRef.set(
    {
      status: response.ok ? "sent" : "retry",
      providerStatus: response.status,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, eventId: eventRef.id });
}
