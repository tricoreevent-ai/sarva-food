import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

initializeApp();

const db = getFirestore();

async function requireUserRole(uid: string, roles: string[]) {
  const snapshot = await db.collection("users").doc(uid).get();
  const user = snapshot.data();

  if (!user?.active || !roles.includes(user.role)) {
    throw new HttpsError("permission-denied", "Insufficient role for this operation.");
  }

  return user as { role: string; tenantId?: string; tenantIds?: string[]; restaurantIds?: string[] };
}

function assertTenantAccess(
  user: { role: string; tenantId?: string; tenantIds?: string[]; restaurantIds?: string[] },
  tenantId: string,
) {
  if (user.role === "admin") return;
  const tenantIds = user.tenantIds ?? (user.tenantId ? [user.tenantId] : user.restaurantIds ?? []);
  if (!tenantIds.includes(tenantId)) {
    throw new HttpsError("permission-denied", "Tenant access denied.");
  }
}

export const onOrderCreated = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },
  async (event) => {
    const order = event.data?.data();
    if (!order) return;

    // Low-cost hook: no external API call yet. This document can be consumed by
    // a future WhatsApp worker or extension without blocking checkout.
    await db.collection("whatsappEvents").add({
      type: "order-confirmation",
      orderId: event.params.orderId,
      tenantId: order.tenantId ?? order.restaurantId,
      restaurantId: order.restaurantId,
      customerPhone: order.customerPhone,
      status: "queued",
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Queued order confirmation placeholder", {
      orderId: event.params.orderId,
    });
  },
);

export const onOrderStatusUpdated = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;

    await db.collection("whatsappEvents").add({
      type: "status-update",
      orderId: event.params.orderId,
      tenantId: after.tenantId ?? after.restaurantId,
      restaurantId: after.restaurantId,
      customerPhone: after.customerPhone,
      status: "queued",
      orderStatus: after.status,
      createdAt: FieldValue.serverTimestamp(),
    });
  },
);

export const assignDelivery = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { deliveryId, partnerId } = request.data as {
    deliveryId?: string;
    partnerId?: string;
  };
  if (!deliveryId || !partnerId) {
    throw new HttpsError("invalid-argument", "deliveryId and partnerId are required.");
  }

  const deliveryRef = db.collection("deliveries").doc(deliveryId);
  const delivery = await deliveryRef.get();
  if (!delivery.exists) {
    throw new HttpsError("not-found", "Delivery not found.");
  }

  const deliveryData = delivery.data() as { tenantId?: string; restaurantId: string };
  const user = await requireUserRole(request.auth.uid, ["admin", "owner"]);
  assertTenantAccess(user, deliveryData.tenantId ?? deliveryData.restaurantId);

  await deliveryRef.update({
    partnerId,
    status: "assigned",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

export const verifyDeliveryOtp = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { deliveryId, otp } = request.data as { deliveryId?: string; otp?: string };
  if (!deliveryId || !otp) {
    throw new HttpsError("invalid-argument", "deliveryId and otp are required.");
  }

  await requireUserRole(request.auth.uid, ["admin", "delivery"]);
  const deliveryRef = db.collection("deliveries").doc(deliveryId);
  const delivery = await deliveryRef.get();
  const deliveryData = delivery.data() as
    | { otpHash: string; orderId: string; partnerId?: string }
    | undefined;

  if (!deliveryData) {
    throw new HttpsError("not-found", "Delivery not found.");
  }
  if (deliveryData.partnerId && deliveryData.partnerId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "This delivery is assigned to another partner.");
  }

  // Placeholder comparison. Production should store a salted hash and compare
  // with a constant-time hash verification helper.
  if (deliveryData.otpHash !== otp) {
    throw new HttpsError("permission-denied", "Invalid OTP.");
  }

  const batch = db.batch();
  batch.update(deliveryRef, {
    status: "picked-up",
    partnerId: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(db.collection("orders").doc(deliveryData.orderId), {
    status: "picked-up",
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { ok: true };
});

export const createPaymentIntentDraft = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { provider, orderId, amount, currency } = request.data as {
    provider?: "razorpay" | "stripe" | "upi";
    orderId?: string;
    amount?: number;
    currency?: string;
  };

  if (!provider || !orderId || !amount || !currency) {
    throw new HttpsError("invalid-argument", "provider, orderId, amount, and currency are required.");
  }

  // Architecture placeholder only. Real gateway secret calls belong here, never
  // in the browser. The returned shape matches what the UI can consume later.
  return {
    provider,
    orderId,
    amount,
    currency,
    providerIntentId: `${provider}_${orderId}_draft`,
    status: "draft",
  };
});

export const razorpayWebhook = onRequest({ region: "asia-south1" }, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed");
    return;
  }

  await db.collection("paymentWebhooks").add({
    provider: "razorpay",
    status: "received",
    event: request.body?.event ?? "unknown",
    createdAt: FieldValue.serverTimestamp(),
  });

  response.json({ ok: true });
});

export const whatsappWebhook = onRequest({ region: "asia-south1" }, async (request, response) => {
  if (request.method === "GET") {
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      response.status(200).send(challenge);
      return;
    }

    response.status(403).send("Invalid token");
    return;
  }

  await db.collection("whatsappWebhooks").add({
    payload: request.body,
    status: "received",
    createdAt: FieldValue.serverTimestamp(),
  });

  response.json({ ok: true });
});
