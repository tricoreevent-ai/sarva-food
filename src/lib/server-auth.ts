import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";
import type { UserRole } from "@/types/firebase";

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

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("sarva_uid")?.value;
  const role = cookieStore.get("sarva_role")?.value as UserRole | undefined;
  const tenantId = cookieStore.get("sarva_tenant")?.value;
  const tenantIds = cookieStore.get("sarva_tenants")?.value;
  const branchIds = cookieStore.get("sarva_branch_ids")?.value;
  const restaurantIds = cookieStore.get("sarva_restaurants")?.value;

  if (!uid || !role) return null;

  return {
    uid,
    role,
    tenantId,
    tenantIds: tenantIds ? tenantIds.split(",").filter(Boolean) : tenantId ? [tenantId] : [],
    branchIds: branchIds ? branchIds.split(",").filter(Boolean) : [],
    restaurantIds: restaurantIds ? restaurantIds.split(",").filter(Boolean) : [],
  } satisfies VerifiedSession;
}

export async function getSessionFromRequest(request: NextRequest | Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    return verifyFirebaseIdToken(token);
  }

  return getSessionFromCookies();
}

export function requireRoles(session: VerifiedSession | null, roles: UserRole[]) {
  if (!session || !roles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
