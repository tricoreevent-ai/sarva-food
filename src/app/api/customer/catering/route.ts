import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { CustomerAccountRepository } from "@/repositories/customer-account-repository";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") return NextResponse.json({ error: "Customer access is required." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (!String(body.name || "").trim() || !String(body.phone || "").trim()) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  const data = await new CustomerAccountRepository().createCatering(session.uid, body);
  return NextResponse.json({ data }, { status: 201 });
}
