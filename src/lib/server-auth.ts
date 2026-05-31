import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";
import type { UserRole } from "@/types/firebase";

export type SessionSurface = "customer" | "owner" | "admin";

export type VerifiedSession = {
  uid: string;
  role: UserRole;
  tenantId?: string;
  tenantIds: string[];
  branchIds: string[];
  restaurantIds: string[];
};

const SESSION_PROFILE_CACHE_TTL_MS = 30_000;
const sessionProfileCache = new Map<string, { expiresAt: number; session: VerifiedSession }>();
const ownerRoles = new Set<UserRole>(["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff", "delivery"]);
const adminRoles = new Set<UserRole>(["admin", "super_admin"]);
const customerRoles = new Set<UserRole>(["customer"]);

export const scopedSessionCookieNames = {
  customer: {
    uid: "sarva_customer_uid",
    role: "sarva_customer_role",
    tenantId: "sarva_customer_tenant",
    tenantIds: "sarva_customer_tenants",
    branchIds: "sarva_customer_branch_ids",
    restaurantIds: "sarva_customer_restaurants",
  },
  owner: {
    uid: "sarva_owner_uid",
    role: "sarva_owner_role",
    tenantId: "sarva_owner_tenant",
    tenantIds: "sarva_owner_tenants",
    branchIds: "sarva_owner_branch_ids",
    restaurantIds: "sarva_owner_restaurants",
  },
  admin: {
    uid: "sarva_admin_uid",
    role: "sarva_admin_role",
    tenantId: "sarva_admin_tenant",
    tenantIds: "sarva_admin_tenants",
    branchIds: "sarva_admin_branch_ids",
    restaurantIds: "sarva_admin_restaurants",
  },
} satisfies Record<SessionSurface, Record<"uid" | "role" | "tenantId" | "tenantIds" | "branchIds" | "restaurantIds", string>>;

export const legacySessionCookieNames = {
  uid: "sarva_uid",
  role: "sarva_role",
  tenantId: "sarva_tenant",
  tenantIds: "sarva_tenants",
  branchIds: "sarva_branch_ids",
  restaurantIds: "sarva_restaurants",
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedSession> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const cached = sessionProfileCache.get(decoded.uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session;
  }

  const profile = await adminDb().collection("users").doc(decoded.uid).get();
  const user = profile.data() as
    | {
        role?: UserRole;
        tenantId?: string;
        tenantIds?: string[];
        restaurantIds?: string[];
        branchIds?: string[];
        active?: boolean;
      }
    | undefined;

  if (!user?.active || !user.role) {
    throw new Error("User profile is inactive or missing.");
  }

  const tenantIds = user.tenantIds ?? (user.tenantId ? [user.tenantId] : user.restaurantIds ?? []);

  const session = {
    uid: decoded.uid,
    role: user.role,
    tenantId: user.tenantId ?? tenantIds[0],
    tenantIds,
    branchIds: user.branchIds ?? [],
    restaurantIds: user.restaurantIds ?? [],
  };
  sessionProfileCache.set(decoded.uid, {
    expiresAt: Date.now() + SESSION_PROFILE_CACHE_TTL_MS,
    session,
  });

  return session;
}

export async function getSessionFromCookies(surface?: SessionSurface) {
  const cookieStore = await cookies();
  if (surface) {
    return sessionFromCookieReader((name) => cookieStore.get(name)?.value, scopedSessionCookieNames[surface], surface);
  }

  for (const nextSurface of ["customer", "owner", "admin"] as const) {
    const session = sessionFromCookieReader((name) => cookieStore.get(name)?.value, scopedSessionCookieNames[nextSurface], nextSurface);
    if (session) return session;
  }

  return sessionFromCookieReader((name) => cookieStore.get(name)?.value, legacySessionCookieNames);
}

export async function getSessionFromRequest(request: NextRequest | Request, surface?: SessionSurface) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    return verifyFirebaseIdToken(token);
  }

  const requestedSurface = surface ?? parseSessionSurface(request.headers.get("x-sarva-surface")) ?? inferSessionSurfaceFromRequest(request);
  const nextRequest = "cookies" in request ? request as NextRequest : undefined;
  if (nextRequest) {
    if (requestedSurface) {
      return sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, scopedSessionCookieNames[requestedSurface], requestedSurface);
    }

    for (const nextSurface of ["customer", "owner", "admin"] as const) {
      const session = sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, scopedSessionCookieNames[nextSurface], nextSurface);
      if (session) return session;
    }

    return sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, legacySessionCookieNames);
  }

  return getSessionFromCookies(requestedSurface);
}

function sessionFromCookieReader(
  read: (name: string) => string | undefined,
  names: typeof legacySessionCookieNames,
  expectedSurface?: SessionSurface,
) {
  const uid = read(names.uid);
  const role = read(names.role) as UserRole | undefined;
  const tenantId = read(names.tenantId);
  const tenantIds = read(names.tenantIds);
  const branchIds = read(names.branchIds);
  const restaurantIds = read(names.restaurantIds);

  if (!uid || !role) return null;
  if (expectedSurface && !roleAllowedForSurface(role, expectedSurface)) return null;

  return {
    uid,
    role,
    tenantId,
    tenantIds: tenantIds ? tenantIds.split(",").filter(Boolean) : tenantId ? [tenantId] : [],
    branchIds: branchIds ? branchIds.split(",").filter(Boolean) : [],
    restaurantIds: restaurantIds ? restaurantIds.split(",").filter(Boolean) : [],
  } satisfies VerifiedSession;
}

export function requireRoles(session: VerifiedSession | null, roles: UserRole[]) {
  if (!session || !roles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function parseSessionSurface(value?: string | null): SessionSurface | undefined {
  return value === "customer" || value === "owner" || value === "admin" ? value : undefined;
}

export function surfaceForRole(role: UserRole): SessionSurface | undefined {
  if (customerRoles.has(role)) return "customer";
  if (ownerRoles.has(role)) return "owner";
  if (adminRoles.has(role)) return "admin";
  return undefined;
}

export function roleAllowedForSurface(role: UserRole, surface: SessionSurface) {
  return surfaceForRole(role) === surface;
}

function inferSessionSurfaceFromRequest(request: Request) {
  let pathname = "";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return undefined;
  }

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/api/owner") || pathname.startsWith("/owner") || pathname.startsWith("/pos")) return "owner";
  if (pathname.startsWith("/api/orders") || pathname.startsWith("/api/payments") || pathname.startsWith("/account") || pathname.startsWith("/profile") || pathname.startsWith("/orders")) return "customer";
  return undefined;
}
