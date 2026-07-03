import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { tenantScope } from "@/repositories/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "kitchen", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const unsubscribe = adminDb()
        .collection("kitchenOrders")
        .where("tenantId", "==", scope.tenantId)
        .onSnapshot(
          (snapshot) => {
            const data = snapshot.docs
              .map((doc) => kitchenDocToTableOrder({ id: doc.id, ...doc.data() }))
              .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
            send("orders", { data, count: data.length });
          },
          (error) => {
            console.error("[kitchen-stream] snapshot failed", { reason: error instanceof Error ? error.name : typeof error });
            send("error", { error: "Kitchen realtime sync failed." });
          },
        );

      request.signal.addEventListener("abort", () => {
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
