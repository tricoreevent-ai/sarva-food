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
import { adminDb } from "@/firebase/admin";
import { AuditRepository } from "@/repositories/audit-repository";

function getCookieOptions(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isLocalHost = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$|^\[::1\](?::\d+)?$/i.test(host);
  const isHttps = request.nextUrl.protocol === "https:" || forwardedProto === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps || (process.env.NODE_ENV === "production" && !isLocalHost),
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

  const profile = await getSessionProfile(session.uid);

  return NextResponse.json({
    ok: true,
    uid: session.uid,
    role: session.role,
    displayName: profile?.displayName,
    email: profile?.email,
    tenantId: session.tenantId,
    tenantIds: session.tenantIds,
    branchIds: session.branchIds,
    restaurantIds: session.restaurantIds,
  });
}

async function getSessionProfile(uid: string) {
  const snapshot = await adminDb().collection("users").doc(uid).get().catch(() => null);
  const data = snapshot?.data() as { displayName?: string; email?: string } | undefined;
  return data ? { displayName: data.displayName, email: data.email } : null;
}

export async function POST(request: NextRequest) {
  const { idToken, surface: requestedSurface, ensureCustomer } = (await request.json().catch(() => ({}))) as {
    idToken?: string;
    surface?: SessionSurface;
    ensureCustomer?: boolean;
  };

  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  const requestedSessionSurface = parseSessionSurface(requestedSurface);
  let session;
  try {
    session = await verifyFirebaseIdToken(idToken, { ensureCustomer: requestedSessionSurface === "customer" || ensureCustomer === true });
  } catch (error) {
    console.error("[auth/session] Firebase session verification failed", { reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json(
      { error: sessionVerificationMessage(error, requestedSessionSurface) },
      { status: 401 },
    );
  }

  const surface = requestedSessionSurface ?? surfaceForRole(session.role);
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
  const tenantId = session.tenantId ?? session.tenantIds[0] ?? "platform";
  const sessionId = `${session.uid}-${Date.now()}`;
  const audit = new AuditRepository();
  await Promise.all([
    audit.record({ tenantId, restaurantId: session.tenantId, userId: session.uid, role: session.role, action: "login", module: "auth", ip: request.headers.get("x-forwarded-for") ?? undefined, userAgent: request.headers.get("user-agent") ?? undefined }),
    audit.openSession({ sessionId, tenantId, restaurantId: session.tenantId, userId: session.uid, role: session.role, action: "login", module: "auth", ip: request.headers.get("x-forwarded-for") ?? undefined, userAgent: request.headers.get("user-agent") ?? undefined }),
  ]);

  return response;
}

function sessionVerificationMessage(error: unknown, surface?: SessionSurface | null) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/Could not load the default credentials|Unable to detect a Project Id|application default|credential|private key|client_email/i.test(message)) {
    return "Secure account setup is not configured on this server.";
  }
  if (/inactive or missing/i.test(message)) {
    if (surface === "owner") return "Owner profile is inactive or missing. Ask the platform admin to activate this account.";
    if (surface === "admin") return "Admin profile is inactive or missing. Ask the platform admin to activate this account.";
    return "Customer profile could not be created. Please try again.";
  }
  if (/undefined.*Firestore value|not a valid Firestore document/i.test(message)) {
    return "Customer profile could not be created. Please try again.";
  }
  return "Invalid or expired session.";
}

export async function DELETE(request: NextRequest) {
  const surface = parseSessionSurface(request.nextUrl.searchParams.get("surface") ?? request.headers.get("x-sarva-surface"));
  const session = await getSessionFromCookies(surface);
  const response = NextResponse.json({ ok: true });
  if (surface) {
    deleteCookieGroup(response, scopedSessionCookieNames[surface]);
  } else {
    deleteCookieGroup(response, legacySessionCookieNames);
    deleteCookieGroup(response, scopedSessionCookieNames.customer);
    deleteCookieGroup(response, scopedSessionCookieNames.owner);
    deleteCookieGroup(response, scopedSessionCookieNames.admin);
  }
  if (session) {
    const tenantId = session.tenantId ?? session.tenantIds[0] ?? "platform";
    const audit = new AuditRepository();
    await Promise.all([
      audit.record({ tenantId, restaurantId: session.tenantId, userId: session.uid, role: session.role, action: "logout", module: "auth", ip: request.headers.get("x-forwarded-for") ?? undefined, userAgent: request.headers.get("user-agent") ?? undefined }),
      audit.closeLatestSession(session.uid),
    ]);
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
