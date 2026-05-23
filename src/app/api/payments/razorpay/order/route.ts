import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";
import { requireServerEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`razorpay-order:${ip}`, 20).ok) {
    return NextResponse.json({ error: "Too many payment attempts" }, { status: 429 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { orderId, amount, currency = "INR" } = (await request.json()) as {
    orderId?: string;
    amount?: number;
    currency?: "INR";
  };

  if (!orderId || !amount || amount <= 0) {
    return NextResponse.json({ error: "orderId and amount are required" }, { status: 400 });
  }

  const env = requireServerEnv(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]);
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt: orderId,
      notes: { orderId, uid: session.uid, ...(session.tenantId ? { tenantId: session.tenantId } : {}) },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Razorpay order creation failed" }, { status: 502 });
  }

  const providerOrder = (await response.json()) as { id: string; amount: number; currency: "INR" };
  await adminDb().collection("paymentIntents").doc(providerOrder.id).set({
    provider: "razorpay",
    providerOrderId: providerOrder.id,
    orderId,
    ...(session.tenantId ? { tenantId: session.tenantId } : {}),
    amount,
    currency,
    status: "created",
    uid: session.uid,
    createdAt: new Date(),
  });

  return NextResponse.json({
    provider: "razorpay",
    providerOrderId: providerOrder.id,
    amount: providerOrder.amount,
    currency: providerOrder.currency,
  });
}
