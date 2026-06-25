import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";
import { defaultOperationalView, type OperationalView } from "@/lib/operational-access";
import { inheritedPermissions } from "@/lib/rbac";
import type { UserRole } from "@/types/firebase";

export type SessionSurface = "customer" | "owner" | "admin";

export type VerifiedSession = {
  uid: string;
  role: UserRole;
  tenantId?: string;
  tenantIds: string[];
  branchIds: string[];
  restaurantIds: string[];
  permissions: string[];
  viewMode: OperationalView;
};

type AuthBackedCustomerProfile = {
  role?: UserRole;
  active?: boolean;
  displayName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  tenantIds?: string[];
  restaurantIds?: string[];
  branchIds?: string[];
  permissions?: string[];
  createdAt?: unknown;
};

const SESSION_PROFILE_CACHE_TTL_MS = 30_000;
const sessionProfileCache = new Map<string, { expiresAt: number; session: VerifiedSession }>();
const ownerRoles = new Set<UserRole>(["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff", "delivery"]);
const adminRoles = new Set<UserRole>(["admin", "super_admin"]);
const customerRoles = new Set<UserRole>(["customer"]);
export const ownerViewCookieName = "sarva_owner_view";

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

export async function verifyFirebaseIdToken(idToken: string, options: { ensureCustomer?: boolean } = {}): Promise<VerifiedSession> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  if (options.ensureCustomer) {
    await ensureCustomerProfileFromAuth(decoded.uid);
    sessionProfileCache.delete(decoded.uid);
  }

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
        permissions?: string[];
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
    permissions: user.permissions ?? inheritedPermissions(user.role),
    viewMode: defaultOperationalView(user.role),
  };
  sessionProfileCache.set(decoded.uid, {
    expiresAt: Date.now() + SESSION_PROFILE_CACHE_TTL_MS,
    session,
  });

  return session;
}

async function ensureCustomerProfileFromAuth(uid: string) {
  const db = adminDb();
  const authUser = await adminAuth().getUser(uid);
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  const existingData = existing.data() as AuthBackedCustomerProfile | undefined;

  if (existing.exists && existingData?.role && existingData.role !== "customer") {
    return;
  }

  const now = new Date().toISOString();
  const displayName = authUser.displayName || existingData?.displayName || authUser.email?.split("@")[0] || "Nammude user";
  const email = authUser.email || existingData?.email;
  const phone = authUser.phoneNumber || existingData?.phone;
  const photoURL = authUser.photoURL || existingData?.photoURL;
  const permissions = existingData?.permissions?.length ? existingData.permissions : ["customer:profile", "customer:orders"];
  const active = existingData?.active ?? true;

  await userRef.set(
    omitUndefinedFields({
      id: uid,
      uid,
      displayName,
      email,
      phone,
      photoURL,
      role: "customer",
      roleId: "customer",
      tenantIds: existingData?.tenantIds ?? [],
      restaurantIds: existingData?.restaurantIds ?? [],
      branchIds: existingData?.branchIds ?? [],
      permissions,
      active,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
    }),
    { merge: true },
  );

  await db.collection("customerProfiles").doc(uid).set(
    omitUndefinedFields({
      id: uid,
      uid,
      displayName,
      email,
      phone,
      photoURL,
      emailVerified: authUser.emailVerified,
      phoneVerified: Boolean(authUser.phoneNumber),
      active,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
    }),
    { merge: true },
  );
}

function omitUndefinedFields<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => typeof value !== "undefined"),
  ) as Partial<T>;
}

export async function getSessionFromCookies(surface?: SessionSurface) {
  const cookieStore = await cookies();
  if (surface) {
    return hydrateCookieSession(
      sessionFromCookieReader((name) => cookieStore.get(name)?.value, scopedSessionCookieNames[surface], surface),
      surface === "owner" ? cookieStore.get(ownerViewCookieName)?.value : undefined,
    );
  }

  for (const nextSurface of ["customer", "owner", "admin"] as const) {
    const session = sessionFromCookieReader((name) => cookieStore.get(name)?.value, scopedSessionCookieNames[nextSurface], nextSurface);
    if (session) return hydrateCookieSession(session, nextSurface === "owner" ? cookieStore.get(ownerViewCookieName)?.value : undefined);
  }

  return hydrateCookieSession(sessionFromCookieReader((name) => cookieStore.get(name)?.value, legacySessionCookieNames));
}

export async function getSessionFromRequest(request: NextRequest | Request, surface?: SessionSurface) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const nextRequest = "cookies" in request ? request as NextRequest : undefined;

  if (token) {
    const session = await verifyFirebaseIdToken(token);
    return { ...session, viewMode: readOperationalView(nextRequest?.cookies.get(ownerViewCookieName)?.value, session.role) };
  }

  const requestedSurface = surface ?? parseSessionSurface(request.headers.get("x-sarva-surface")) ?? inferSessionSurfaceFromRequest(request);
  if (nextRequest) {
    if (requestedSurface) {
      return hydrateCookieSession(
        sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, scopedSessionCookieNames[requestedSurface], requestedSurface),
        requestedSurface === "owner" ? nextRequest.cookies.get(ownerViewCookieName)?.value : undefined,
      );
    }

    for (const nextSurface of ["customer", "owner", "admin"] as const) {
      const session = sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, scopedSessionCookieNames[nextSurface], nextSurface);
      if (session) return hydrateCookieSession(session, nextSurface === "owner" ? nextRequest.cookies.get(ownerViewCookieName)?.value : undefined);
    }

    return hydrateCookieSession(sessionFromCookieReader((name) => nextRequest.cookies.get(name)?.value, legacySessionCookieNames));
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
    permissions: inheritedPermissions(role),
    viewMode: defaultOperationalView(role),
  } satisfies VerifiedSession;
}

async function hydrateCookieSession(session: VerifiedSession | null, requestedView?: string) {
  if (!session) return null;
  const cached = sessionProfileCache.get(session.uid);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.session, viewMode: readOperationalView(requestedView, cached.session.role) };
  }
  const profile = await adminDb().collection("users").doc(session.uid).get().catch(() => null);
  const user = profile?.data() as {
    role?: UserRole;
    tenantId?: string;
    tenantIds?: string[];
    restaurantIds?: string[];
    branchIds?: string[];
    permissions?: string[];
    active?: boolean;
  } | undefined;
  if (!user?.active || !user.role) return null;
  const tenantIds = user.tenantIds ?? (user.tenantId ? [user.tenantId] : user.restaurantIds ?? []);
  const hydrated: VerifiedSession = {
    uid: session.uid,
    role: user.role,
    tenantId: user.tenantId ?? tenantIds[0],
    tenantIds,
    branchIds: user.branchIds ?? [],
    restaurantIds: user.restaurantIds ?? [],
    permissions: user.permissions ?? inheritedPermissions(user.role),
    viewMode: readOperationalView(requestedView, user.role),
  };
  sessionProfileCache.set(session.uid, { expiresAt: Date.now() + SESSION_PROFILE_CACHE_TTL_MS, session: hydrated });
  return hydrated;
}

function readOperationalView(value: string | undefined, role: UserRole) {
  const allowed: OperationalView[] = ["owner", "manager", "cashier", "kitchen", "waiter", "delivery"];
  return role === "owner" && allowed.includes(value as OperationalView)
    ? value as OperationalView
    : defaultOperationalView(role);
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
