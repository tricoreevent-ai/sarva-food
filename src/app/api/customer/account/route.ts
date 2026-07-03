import { NextResponse, type NextRequest } from "next/server";
import { CustomerAccountRepository, type CustomerResource } from "@/repositories/customer-account-repository";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resources = new Set<CustomerResource>(["profile", "addresses", "payments", "savedRestaurants", "coupons", "reviews"]);

export async function GET(request: NextRequest) {
  try {
    const session = await customerSession(request);
    if (session instanceof NextResponse) return session;
    return NextResponse.json({ data: await new CustomerAccountRepository().snapshot(session.uid) });
  } catch (error) {
    logCustomerAccountError("load", error);
    return NextResponse.json({ error: "Could not load your account. Please try again." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await customerSession(request);
    if (session instanceof NextResponse) return session;
    const body = await request.json().catch(() => ({})) as { resource?: CustomerResource; id?: string; data?: Record<string, unknown> };
    const id = body.resource === "profile" ? session.uid : body.id;
    if (!body.resource || !resources.has(body.resource) || !id) return NextResponse.json({ error: "Valid customer resource and id are required." }, { status: 400 });
    return NextResponse.json({ data: await new CustomerAccountRepository().set(session.uid, body.resource, id, body.data ?? {}) });
  } catch (error) {
    logCustomerAccountError("save", error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await customerSession(request);
    if (session instanceof NextResponse) return session;
    const resource = request.nextUrl.searchParams.get("resource") as CustomerResource | null;
    const id = request.nextUrl.searchParams.get("id");
    if (!resource || resource === "profile" || !resources.has(resource) || !id) return NextResponse.json({ error: "Valid customer resource and id are required." }, { status: 400 });
    return NextResponse.json({ data: await new CustomerAccountRepository().delete(session.uid, resource, id) });
  } catch (error) {
    logCustomerAccountError("delete", error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 400 });
  }
}

async function customerSession(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") return NextResponse.json({ error: "Customer access is required." }, { status: 403 });
  return session;
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/already saved/i.test(message)) return "This delivery address is already saved.";
  if (/not found/i.test(message)) return "That saved item could not be found. Refresh and try again.";
  if (/invalid/i.test(message)) return "Some saved details look invalid. Check them and try again.";
  return "Customer account update failed. Please try again.";
}

function logCustomerAccountError(action: string, error: unknown) {
  console.error("[customer/account] request failed", {
    requestId: crypto.randomUUID(),
    action,
    reason: error instanceof Error ? error.message : String(error ?? "unknown"),
  });
}
