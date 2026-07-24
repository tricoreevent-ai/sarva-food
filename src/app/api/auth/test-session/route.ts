import { NextResponse, type NextRequest } from "next/server";
import {
  legacySessionCookieNames,
  parseSessionSurface,
  roleAllowedForSurface,
  scopedSessionCookieNames,
  surfaceForRole,
  type SessionSurface,
} from "@/lib/server-auth";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { UserRole } from "@/types/firebase";

const allowedRoles: UserRole[] = [
  "customer",
  "owner",
  "manager",
  "cashier",
  "chef",
  "waiter",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "admin",
  "super_admin",
];

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 5,
};

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const devLoginEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true";

  if (!devLoginEnabled) {
    return NextResponse.json({ error: "Development login is disabled." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { uid?: string; role?: UserRole; surface?: SessionSurface };
  const role = body.role;

  if (!body.uid || !role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid test session." }, { status: 400 });
  }
  const surface = parseSessionSurface(body.surface) ?? surfaceForRole(role);
  if (!surface || !roleAllowedForSurface(role, surface)) {
    return NextResponse.json({ error: "This test user cannot be used for this module." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, role });
  const names = scopedSessionCookieNames[surface];
  response.cookies.set(names.uid, body.uid, cookieOptions);
  response.cookies.set(names.role, role, cookieOptions);
  if (role !== "admin" && role !== "customer") {
    response.cookies.set(names.tenantId, DEFAULT_TENANT_ID, cookieOptions);
    response.cookies.set(names.tenantIds, DEFAULT_TENANT_ID, cookieOptions);
    response.cookies.set(names.branchIds, DEFAULT_BRANCH_ID, cookieOptions);
    response.cookies.set(names.restaurantIds, DEFAULT_TENANT_ID, cookieOptions);
  } else {
    response.cookies.delete(names.tenantId);
    response.cookies.delete(names.tenantIds);
    response.cookies.delete(names.branchIds);
    response.cookies.delete(names.restaurantIds);
  }
  response.cookies.delete(legacySessionCookieNames.uid);
  response.cookies.delete(legacySessionCookieNames.role);
  response.cookies.delete(legacySessionCookieNames.tenantId);
  response.cookies.delete(legacySessionCookieNames.tenantIds);
  response.cookies.delete(legacySessionCookieNames.branchIds);
  response.cookies.delete(legacySessionCookieNames.restaurantIds);
  return response;
}
