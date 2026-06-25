import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/firebase/admin";
import { AuditRepository } from "@/repositories/audit-repository";
import { canUseOperationalView, operationalViews, type OperationalView } from "@/lib/operational-access";
import { getSessionFromRequest, ownerViewCookieName } from "@/lib/server-auth";
import { verifyFirebasePassword } from "@/lib/server/module-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  return NextResponse.json({ data: { viewMode: session.viewMode, role: session.role, permissions: session.permissions } });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || session.role !== "owner") return NextResponse.json({ error: "Only the owner can switch operational views." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { viewMode?: OperationalView; password?: string };
  if (!body.viewMode || !operationalViews.includes(body.viewMode)) return NextResponse.json({ error: "A valid operational view is required." }, { status: 400 });
  if (!canUseOperationalView(session.role, body.viewMode)) return NextResponse.json({ error: "This view is not available." }, { status: 403 });
  if (!body.password) return NextResponse.json({ error: "Owner password is required." }, { status: 400 });

  const authUser = await adminAuth().getUser(session.uid);
  if (!authUser.email) return NextResponse.json({ error: "Owner email is not configured." }, { status: 409 });
  const verified = await verifyFirebasePassword(authUser.email, body.password).catch(() => null);
  if (!verified || verified.uid !== session.uid) return NextResponse.json({ error: "Owner password is incorrect." }, { status: 401 });

  const response = NextResponse.json({ data: { viewMode: body.viewMode } });
  response.cookies.set(ownerViewCookieName, body.viewMode, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  await new AuditRepository().record({
    tenantId: session.tenantId ?? session.tenantIds[0],
    restaurantId: session.tenantId,
    userId: session.uid,
    role: session.role,
    action: "view_switch",
    module: "access",
    after: { viewMode: body.viewMode },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  return response;
}
