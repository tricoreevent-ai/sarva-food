import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { requireServerEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const { RAZORPAY_WEBHOOK_SECRET } = requireServerEnv(["RAZORPAY_WEBHOOK_SECRET"]);

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
  if (!safeEqual(expected, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  const payment = event.payload?.payment?.entity;

  await adminDb().collection("paymentWebhooks").add({
    provider: "razorpay",
    event: event.event,
    providerPaymentId: payment?.id,
    providerOrderId: payment?.order_id,
    status: "received",
    createdAt: new Date(),
  });

  if (event.event === "payment.captured" && payment?.order_id) {
    await adminDb().collection("paymentIntents").doc(payment.order_id).set(
      {
        status: "paid",
        providerPaymentId: payment.id,
        webhookUpdatedAt: new Date(),
      },
      { merge: true },
    );
  }

  return NextResponse.json({ ok: true });
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
