import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { logOperationalFailure } from "@/lib/server/operational-logging";
import { tenantScope } from "@/repositories/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireKitchenNotificationListAccess(request);
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const unsubscribe = adminDb()
        .collection("notifications")
        .where("tenantId", "==", scope.tenantId)
        .where("type", "==", "kitchen_ready_ops")
        .limit(100)
        .onSnapshot(
          (snapshot) => {
            const upsert: Array<Record<string, unknown>> = [];
            const removed: string[] = [];
            for (const change of snapshot.docChanges()) {
              const raw = change.doc.data() as Record<string, unknown>;
              const data = { id: change.doc.id, ...raw };
              const kitchenOrderId = clean(raw.kitchenOrderId) || kitchenOrderIdFromNotificationId(change.doc.id);
              if (change.type === "removed") removed.push(kitchenOrderId);
              else upsert.push({ ...data, kitchenOrderId });
            }
            send("ready-signals", { upsert, removed, count: snapshot.size });
          },
          (error) => {
            logOperationalFailure("owner.kitchen.notify_waiter.stream", error, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
            send("error", { error: "Kitchen ready signal sync failed." });
          },
        );

      request.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        controller.close();
      }, { once: true });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

async function requireKitchenNotificationListAccess(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "read");
  if (!access.error) return access;
  const fallback = await requireOwnerFeature(request, "pos", "read");
  if (!fallback.error && isWaiterWorkflowSession(fallback.session)) return fallback;
  return access;
}

function isWaiterWorkflowSession(session: { role: string; viewMode?: string }) {
  return session.role === "waiter" || (session.role === "owner" && session.viewMode === "waiter");
}

function kitchenOrderIdFromNotificationId(id: string) {
  return clean(id.split(":kitchen-ready:").pop());
}

function clean(value: unknown, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
