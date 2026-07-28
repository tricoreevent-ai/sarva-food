import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { kitchenDocToTableOrder, orderDocToDemoOrder } from "@/lib/operational-api-mappers";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { logOperationalFailure } from "@/lib/server/operational-logging";
import { tenantScope } from "@/repositories/shared";
import type { OrderDoc } from "@/types/firebase";
import type { DemoOrder, TableOrder } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "pos", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const orderListener = adminDb()
        .collection("orders")
        .where("tenantId", "==", scope.tenantId)
        .onSnapshot(
          (snapshot) => {
            const ordersUpsert: DemoOrder[] = [];
            const orderIdsRemoved: string[] = [];
            for (const change of snapshot.docChanges()) {
              const order = { id: change.doc.id, ...change.doc.data() } as OrderDoc;
              if (change.type === "removed" || order.status === "draft") {
                orderIdsRemoved.push(change.doc.id);
              } else {
                ordersUpsert.push(orderDocToOperationalDemoOrder(order));
              }
            }
            if (ordersUpsert.length || orderIdsRemoved.length) send("state", { ordersUpsert, orderIdsRemoved });
          },
          (error) => {
            logOperationalFailure("owner.pos.stream.orders", error, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
            send("error", { error: "POS realtime sync failed." });
          },
        );

      const kitchenListener = adminDb()
        .collection("kitchenOrders")
        .where("tenantId", "==", scope.tenantId)
        .onSnapshot(
          (snapshot) => {
            const kitchenUpsert: TableOrder[] = [];
            const kitchenIdsRemoved: string[] = [];
            for (const change of snapshot.docChanges()) {
              if (change.type === "removed") {
                kitchenIdsRemoved.push(change.doc.id);
              } else {
                kitchenUpsert.push(kitchenDocToTableOrder({ id: change.doc.id, ...change.doc.data() }));
              }
            }
            if (kitchenUpsert.length || kitchenIdsRemoved.length) send("state", { kitchenUpsert, kitchenIdsRemoved });
          },
          (error) => {
            logOperationalFailure("owner.pos.stream.kitchen", error, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
            send("error", { error: "POS realtime sync failed." });
          },
        );

      request.signal.addEventListener("abort", () => {
        closed = true;
        orderListener();
        kitchenListener();
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

function orderDocToOperationalDemoOrder(order: OrderDoc) {
  return {
    ...orderDocToDemoOrder(order),
    paymentTimeline: (order as OrderDoc & { paymentTimeline?: unknown[] }).paymentTimeline ?? [],
    auditTimeline: (order as OrderDoc & { auditTimeline?: unknown[] }).auditTimeline ?? [],
    statusHistory: order.statusHistory ?? [],
    splitBills: (order as OrderDoc & { splitBills?: unknown[] }).splitBills ?? [],
    corrections: (order as OrderDoc & { corrections?: unknown[] }).corrections ?? [],
    paymentLock: (order as OrderDoc & { paymentLock?: unknown }).paymentLock,
    paidAmount: (order as OrderDoc & { paidAmount?: number }).paidAmount,
    mergedOrderIds: (order as OrderDoc & { mergedOrderIds?: string[] }).mergedOrderIds ?? [],
    mergedIntoOrderId: (order as OrderDoc & { mergedIntoOrderId?: string }).mergedIntoOrderId,
    tableNumber: order.tableNumber,
    waiterName: order.waiterName,
  };
}
