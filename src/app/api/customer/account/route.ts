import { NextResponse, type NextRequest } from "next/server";
import { CustomerAccountRepository, type CustomerResource } from "@/repositories/customer-account-repository";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resources = new Set<CustomerResource>(["profile", "addresses", "payments", "savedRestaurants", "coupons", "reviews"]);

export async function GET(request: NextRequest) {
  const session = await customerSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ data: await new CustomerAccountRepository().snapshot(session.uid) });
}

export async function PATCH(request: NextRequest) {
  const session = await customerSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({})) as { resource?: CustomerResource; id?: string; data?: Record<string, unknown> };
  const id = body.resource === "profile" ? session.uid : body.id;
  if (!body.resource || !resources.has(body.resource) || !id) return NextResponse.json({ error: "Valid customer resource and id are required." }, { status: 400 });
  return NextResponse.json({ data: await new CustomerAccountRepository().set(session.uid, body.resource, id, body.data ?? {}) });
}

export async function DELETE(request: NextRequest) {
  const session = await customerSession(request);
  if (session instanceof NextResponse) return session;
  const resource = request.nextUrl.searchParams.get("resource") as CustomerResource | null;
  const id = request.nextUrl.searchParams.get("id");
  if (!resource || resource === "profile" || !resources.has(resource) || !id) return NextResponse.json({ error: "Valid customer resource and id are required." }, { status: 400 });
  return NextResponse.json({ data: await new CustomerAccountRepository().delete(session.uid, resource, id) });
}

async function customerSession(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") return NextResponse.json({ error: "Customer access is required." }, { status: 403 });
  return session;
}
