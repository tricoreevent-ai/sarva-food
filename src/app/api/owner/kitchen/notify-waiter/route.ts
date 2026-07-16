import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { sendTenantPushNotification } from "@/lib/server/push-notifications";
import { tenantScope } from "@/repositories/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const clean = (value: unknown, max = 120) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const snapshot = await adminDb().collection("notifications")
    .where("tenantId", "==", scope.tenantId)
    .where("type", "==", "kitchen_ready_waiter")
    .limit(100)
    .get();
  return NextResponse.json({ data: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
}

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const scope = tenantScope(access.session, clean(body.restaurantId));
  const kitchenOrderId = clean(body.kitchenOrderId);
  if (!kitchenOrderId) return NextResponse.json({ error: "Kitchen order id is required." }, { status: 400 });
  const ref = adminDb().collection("notifications").doc(`${scope.tenantId}:kitchen-ready:${kitchenOrderId}`);

  if (body.action === "acknowledge") {
    await ref.set({ acknowledgedAt: FieldValue.serverTimestamp(), acknowledgedBy: access.session.uid, read: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true, status: "acknowledged" });
  }

  if (body.action === "escalate") {
    const snapshot = await ref.get();
    if (snapshot.data()?.escalatedAt || snapshot.data()?.acknowledgedAt) return NextResponse.json({ ok: true, deduplicated: true });
    const data = snapshot.data() ?? {};
    await ref.set({ escalatedAt: FieldValue.serverTimestamp(), priority: "high", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const owner = await sendTenantPushNotification(scope, { type: "kitchen_waiter_escalation", title: "Kitchen waiter escalation", message: `${clean(data.orderNumber || data.message)} is still waiting for pickup.`, priority: "high", orderId: clean(data.orderId), kitchenOrderId, link: "/owner/pos?panel=active", audience: ["owner"], sound: "silent" }).catch(() => ({ successCount: 0, failureCount: 0 }));
    return NextResponse.json({ ok: true, owner });
  }

  const orderNumber = clean(body.orderNumber, 40);
  const tableNumber = clean(body.tableNumber, 40) || "Counter";
  const waiterName = clean(body.waiterName, 80);
  const title = "🍽 Order Ready";
  const message = [`Order ${orderNumber}`, `Table ${tableNumber}`, "Food is ready for serving.", "Please collect immediately."].join(" · ");
  const existing = await ref.get();
  if (existing.exists && body.repeat !== true) return NextResponse.json({ ok: true, notificationId: ref.id, deduplicated: true });
  if (!existing.exists) {
    await ref.set({
      tenantId: scope.tenantId,
      restaurantId: scope.tenantId,
      branchId: clean(body.branchId, 60) || "main",
      type: "kitchen_ready_waiter",
      title,
      message,
      orderId: clean(body.orderId),
      orderNumber,
      kitchenOrderId,
      tableNumber,
      waiterName,
      audience: ["waiter", "owner"],
      priority: "high",
      link: "/owner/pos?panel=active",
      sound: "bell",
      read: false,
      pushStatus: "dispatching",
      notifiedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const push = body.notificationMethod !== "in-app";
  const waiter = push ? await sendTenantPushNotification(scope, { notificationId: ref.id, type: "kitchen_ready_waiter", title, message, priority: "high", orderId: clean(body.orderId), kitchenOrderId, link: "/owner/pos?panel=active", audience: ["waiter"], sound: "bell" }).catch(() => ({ successCount: 0, failureCount: 0 })) : { successCount: 0, failureCount: 0 };
  const owner = push ? await sendTenantPushNotification(scope, { type: "kitchen_ready_owner", title: "Kitchen Ready", message: `${orderNumber} · ${tableNumber}`, orderId: clean(body.orderId), kitchenOrderId, link: "/owner/pos?panel=active", audience: ["owner"], sound: "silent" }).catch(() => ({ successCount: 0, failureCount: 0 })) : { successCount: 0, failureCount: 0 };
  return NextResponse.json({ ok: true, waiter, owner, notificationId: ref.id, deduplicated: existing.exists });
}
