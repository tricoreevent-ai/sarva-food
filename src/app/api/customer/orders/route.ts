import { NextResponse, type NextRequest } from "next/server";
import { OrderRepository } from "@/repositories/order-repository";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request, "customer");
    if (!session || session.role !== "customer") return NextResponse.json({ error: "Customer access is required." }, { status: 403 });
    const id = request.nextUrl.searchParams.get("id");
    const repository = new OrderRepository();
    if (id) {
      const data = await repository.getForCustomer(session.uid, id);
      return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const data = await repository.listForCustomer(session.uid);
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("[customer/orders] load failed", {
      requestId: crypto.randomUUID(),
      reason: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({ error: "Could not load your order right now." }, { status: 400 });
  }
}
