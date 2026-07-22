import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { orderDocToDemoOrder } from "@/lib/operational-api-mappers";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { logOperationalFailure } from "@/lib/server/operational-logging";
import { tenantScope } from "@/repositories/shared";
import type { OrderDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "reports", "read");
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

      const unsubscribe = adminDb()
        .collection("orders")
        .where("tenantId", "==", scope.tenantId)
        .onSnapshot(
          (snapshot) => {
            const ordersUpsert: ReturnType<typeof orderDocToDemoOrder>[] = [];
            const orderIdsRemoved: string[] = [];
            for (const change of snapshot.docChanges()) {
              const order = { id: change.doc.id, ...change.doc.data() } as OrderDoc;
              if (change.type === "removed" || order.status === "draft") orderIdsRemoved.push(change.doc.id);
              else ordersUpsert.push(orderDocToDemoOrder(order));
            }
            send("state", { ordersUpsert, orderIdsRemoved, count: snapshot.size });
          },
          (error) => {
            logOperationalFailure("owner.reports.stream.orders", error, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
            send("error", { error: "Reports realtime sync failed." });
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
