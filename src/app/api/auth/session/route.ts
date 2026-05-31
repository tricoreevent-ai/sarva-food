import { NextResponse, type NextRequest } from "next/server";
import {
  getSessionFromCookies,
  legacySessionCookieNames,
  parseSessionSurface,
  roleAllowedForSurface,
  scopedSessionCookieNames,
  surfaceForRole,
  verifyFirebaseIdToken,
  type SessionSurface,
  type VerifiedSession,
} from "@/lib/server-auth";

function getCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 5,
  };
}

export async function GET(request: NextRequest) {
  const surface = parseSessionSurface(request.nextUrl.searchParams.get("surface") ?? request.headers.get("x-sarva-surface"));
  const session = await getSessionFromCookies(surface);

  if (!session) {
    return NextResponse.json({ ok: false, error: "No active session." });
  }

  return NextResponse.json({
    ok: true,
    uid: session.uid,
    role: session.role,
    tenantId: session.tenantId,
    tenantIds: session.tenantIds,
    branchIds: session.branchIds,
    restaurantIds: session.restaurantIds,
  });
}

export async function POST(request: NextRequest) {
  const { idToken, surface: requestedSurface } = (await request.json().catch(() => ({}))) as { idToken?: string; surface?: SessionSurface };

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

  const surface = parseSessionSurface(requestedSurface) ?? surfaceForRole(session.role);
  if (!surface || !roleAllowedForSurface(session.role, surface)) {
    return NextResponse.json(
      { error: "This account cannot be used for this module." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    role: session.role,
    tenantId: session.tenantId,
    branchIds: session.branchIds,
  });
  const cookieOptions = getCookieOptions(request);

  writeSessionCookies(response, session, surface, cookieOptions);
  deleteCookieGroup(response, legacySessionCookieNames);

  return response;
}

export async function DELETE(request: NextRequest) {
  const surface = parseSessionSurface(request.nextUrl.searchParams.get("surface") ?? request.headers.get("x-sarva-surface"));
  const response = NextResponse.json({ ok: true });
  if (surface) {
    deleteCookieGroup(response, scopedSessionCookieNames[surface]);
  } else {
    deleteCookieGroup(response, legacySessionCookieNames);
    deleteCookieGroup(response, scopedSessionCookieNames.customer);
    deleteCookieGroup(response, scopedSessionCookieNames.owner);
    deleteCookieGroup(response, scopedSessionCookieNames.admin);
  }
  return response;
}

function writeSessionCookies(
  response: NextResponse,
  session: VerifiedSession,
  surface: SessionSurface,
  cookieOptions: ReturnType<typeof getCookieOptions>,
) {
  const names = scopedSessionCookieNames[surface];
  response.cookies.set(names.uid, session.uid, cookieOptions);
  response.cookies.set(names.role, session.role, cookieOptions);
  if (session.tenantId) response.cookies.set(names.tenantId, session.tenantId, cookieOptions);
  else response.cookies.delete(names.tenantId);
  if (session.tenantIds.length) response.cookies.set(names.tenantIds, session.tenantIds.join(","), cookieOptions);
  else response.cookies.delete(names.tenantIds);
  if (session.branchIds.length) response.cookies.set(names.branchIds, session.branchIds.join(","), cookieOptions);
  else response.cookies.delete(names.branchIds);
  if (session.restaurantIds.length) response.cookies.set(names.restaurantIds, session.restaurantIds.join(","), cookieOptions);
  else response.cookies.delete(names.restaurantIds);
}

function deleteCookieGroup(response: NextResponse, names: typeof legacySessionCookieNames) {
  response.cookies.delete(names.uid);
  response.cookies.delete(names.role);
  response.cookies.delete(names.tenantId);
  response.cookies.delete(names.tenantIds);
  response.cookies.delete(names.branchIds);
  response.cookies.delete(names.restaurantIds);
}
