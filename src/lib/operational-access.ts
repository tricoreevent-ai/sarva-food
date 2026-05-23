"use client";

import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { COLLECTIONS } from "@/firebase/collections";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { shouldUseFirebase } from "@/lib/env";
import type { UserDoc, UserRole } from "@/types/firebase";

const operationalRoles: UserRole[] = [
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
  "delivery-staff",
];

type AccessCache = {
  uid: string;
  profile: UserDoc | null;
  fetchedAt: number;
};

let accessCache: AccessCache | null = null;
const cacheTtlMs = 5 * 60 * 1000;

export type OperationalAccessResult = {
  allowed: boolean;
  profile: UserDoc | null;
  reason?: string;
};

export async function resolveOperationalAccess(force = false): Promise<OperationalAccessResult> {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") {
    return { allowed: true, profile: null };
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return { allowed: false, profile: null, reason: "No signed-in Firebase user. Sign in again before retrying sync." };

  if (!force && accessCache?.uid === user.uid && Date.now() - accessCache.fetchedAt < cacheTtlMs) {
    return validateProfile(accessCache.profile);
  }

  const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, user.uid));
  const profile = snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserDoc) : null;
  accessCache = { uid: user.uid, profile, fetchedAt: Date.now() };
  return validateProfile(profile);
}

export async function assertCanSyncTenant(input: { tenantId?: string; branchId?: string }) {
  const access = await resolveOperationalAccess();
  if (!access.allowed) throw new Error(access.reason ?? "Operational access is not configured for this user.");

  const profile = access.profile;
  if (!profile) return;

  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const branchId = input.branchId ?? DEFAULT_BRANCH_ID;
  const tenantIds = new Set([...(profile.tenantIds ?? []), ...(profile.restaurantIds ?? []), profile.tenantId].filter(Boolean));
  if (!tenantIds.has(tenantId)) {
    throw new Error(`Access setup required: this user is not linked to restaurant ${tenantId}. Add it to users/${profile.id}.restaurantIds or tenantId.`);
  }
  if (profile.branchIds?.length && !profile.branchIds.includes(branchId)) {
    throw new Error(`Access setup required: this user is not linked to branch ${branchId}. Add it to users/${profile.id}.branchIds.`);
  }
}

function validateProfile(profile: UserDoc | null): OperationalAccessResult {
  if (!profile) return { allowed: false, profile, reason: "User profile missing in Firestore users collection." };
  if (!profile.active) return { allowed: false, profile, reason: "User profile is inactive in Firestore." };
  if (!operationalRoles.includes(profile.role)) {
    return { allowed: false, profile, reason: `Role ${profile.role} cannot run owner/POS sync.` };
  }
  if (!profile.tenantId && !profile.tenantIds?.length && !profile.restaurantIds?.length) {
    return { allowed: false, profile, reason: "User profile has no restaurantId or tenantId access." };
  }
  return { allowed: true, profile };
}
