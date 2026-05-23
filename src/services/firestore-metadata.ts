import { serverTimestamp, type FieldValue } from "firebase/firestore";
import { getFirebaseAuth } from "@/firebase/client";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";

export type OperationalMetadataInput = Record<string, unknown> & {
  tenantId?: string;
  restaurantId?: string;
  branchId?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type OperationalMetadata = Record<string, unknown> & {
  tenantId: string;
  restaurantId: string;
  branchId: string;
  createdBy: string;
  updatedBy: string;
  createdAt?: FieldValue;
  updatedAt: FieldValue;
  deletedAt?: FieldValue | null;
  deletedBy?: string | null;
  isDeleted?: boolean;
};

export function currentActorId() {
  if (typeof window === "undefined") return "server";

  try {
    return getFirebaseAuth().currentUser?.uid ?? "system";
  } catch {
    return "system";
  }
}

export function createMetadata(input: OperationalMetadataInput = {}): Record<string, unknown> {
  const actor = input.createdBy ?? input.updatedBy ?? currentActorId();
  const restaurantId = input.restaurantId ?? DEFAULT_RESTAURANT_ID;

  return {
    tenantId: input.tenantId ?? resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branchId ?? DEFAULT_BRANCH_ID,
    createdBy: actor,
    updatedBy: actor,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
  };
}

export function updateMetadata(input: OperationalMetadataInput = {}): Record<string, unknown> {
  const restaurantId = input.restaurantId ?? DEFAULT_RESTAURANT_ID;

  return {
    tenantId: input.tenantId ?? resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branchId ?? DEFAULT_BRANCH_ID,
    updatedBy: input.updatedBy ?? currentActorId(),
    updatedAt: serverTimestamp(),
  };
}

export function softDeleteMetadata(input: OperationalMetadataInput = {}) {
  return {
    ...updateMetadata(input),
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: input.updatedBy ?? currentActorId(),
  };
}
