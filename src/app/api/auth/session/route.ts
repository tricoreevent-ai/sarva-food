import { NextResponse, type NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/server-auth";

function getCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 5,
  };
}

export async function POST(request: NextRequest) {
  const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  let session;
  try {
    session = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired session." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    role: session.role,
    tenantId: session.tenantId,
    branchIds: session.branchIds,
  });
  const cookieOptions = getCookieOptions(request);

  response.cookies.set("sarva_uid", session.uid, cookieOptions);
  response.cookies.set("sarva_role", session.role, cookieOptions);
  if (session.tenantId) response.cookies.set("sarva_tenant", session.tenantId, cookieOptions);
  if (session.tenantIds.length) response.cookies.set("sarva_tenants", session.tenantIds.join(","), cookieOptions);
  if (session.branchIds.length) response.cookies.set("sarva_branch_ids", session.branchIds.join(","), cookieOptions);
  if (session.restaurantIds.length) response.cookies.set("sarva_restaurants", session.restaurantIds.join(","), cookieOptions);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sarva_uid");
  response.cookies.delete("sarva_role");
  response.cookies.delete("sarva_tenant");
  response.cookies.delete("sarva_tenants");
  response.cookies.delete("sarva_branch_ids");
  response.cookies.delete("sarva_restaurants");
  return response;
}
