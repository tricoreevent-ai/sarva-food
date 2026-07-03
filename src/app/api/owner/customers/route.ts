import { NextResponse, type NextRequest } from "next/server";
import { CustomerRepository } from "@/repositories/customer-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  }

  try {
    const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
    const customers = new CustomerRepository();
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const data = await customers.detail(scope, id);
      return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json({ data: await customers.list(scope, request.nextUrl.searchParams.get("search") ?? "") });
  } catch (error) {
    console.error("[owner/customers] load failed", { requestId: crypto.randomUUID(), reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to load customers." }, { status: 400 });
  }
}
