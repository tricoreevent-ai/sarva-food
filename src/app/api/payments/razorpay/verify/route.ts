import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import { requireServerEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
    (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      orderId?: string;
    };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return NextResponse.json({ error: "Missing Razorpay verification fields" }, { status: 400 });
  }

  const { RAZORPAY_KEY_SECRET } = requireServerEnv(["RAZORPAY_KEY_SECRET"]);
  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(razorpay_signature);
  const valid =
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer);

  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const batch = adminDb().batch();
  batch.set(
    adminDb().collection("paymentIntents").doc(razorpay_order_id),
    {
      status: "paid",
      providerPaymentId: razorpay_payment_id,
      ...(session.tenantId ? { tenantId: session.tenantId } : {}),
      verifiedBy: session.uid,
      verifiedAt: new Date(),
    },
    { merge: true },
  );
  batch.update(adminDb().collection("orders").doc(orderId), {
    paymentStatus: "paid",
    updatedAt: new Date(),
  });
  await batch.commit();

  return NextResponse.json({ ok: true });
}
