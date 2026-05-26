"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { shouldUseFirebase } from "@/lib/env";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/tenant";
import type { Offer, OwnerBusinessProfile, Restaurant, RestaurantBranch, StaffMember } from "@/lib/types";
import { createMetadata, updateMetadata } from "@/services/firestore-metadata";
import { normalizePhone } from "@/services/restaurant-ops-service";

const RESTAURANT_ID = DEFAULT_RESTAURANT_ID;
const BRANCH_ID = DEFAULT_BRANCH_ID;

function currentOwnerId() {
  return getFirebaseAuth().currentUser?.uid ?? "system";
}

function ownerScope(input: { restaurantId?: string; branchId?: string } = {}) {
  const restaurantId = input.restaurantId ?? RESTAURANT_ID;
  return {
    tenantId: resolveTenantId(restaurantId),
    restaurantId,
    branchId: input.branchId ?? BRANCH_ID,
    ownerId: currentOwnerId(),
  };
}

export type OperationalCollection =
  | "reports"
  | "accountingEntries"
  | "expenses"
  | "inventory"
  | "inventoryTransactions"
  | "purchaseOrders"
  | "suppliers"
  | "customers"
  | "loyaltyCustomers"
  | "tables"
  | "roles"
  | "users"
  | "notifications"
  | "staffActivityLogs"
  | "offers"
  | "coupons"
  | "printerProfiles"
  | "receiptTemplates"
  | "paymentTransactions";

export type DateRangeInput = {
  from: Date;
  to: Date;
};

export type AccountingWrite = {
  id?: string;
  type: "income" | "expense" | "journal";
  category: string;
  amount: number;
  gst: number;
  paymentMode: string;
  notes?: string;
  attachmentUrl?: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  createdBy: string;
  branchId?: string;
  restaurantId?: string;
};

export type InventoryWrite = {
  id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  supplierId?: string;
  costPerUnit?: number;
  sku?: string;
  price?: number;
  lowStockAlert?: number;
  gstApplicable?: boolean;
  gstRate?: number;
  hsnCode?: string;
  sellable?: boolean;
  branchId?: string;
  restaurantId?: string;
};

export function canUseProductionFirestore() {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") return false;
  return Boolean(getFirebaseAuth().currentUser);
}

async function ownerApi<T>(path: string, init: RequestInit) {
  if (typeof window === "undefined") return null;
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Owner save failed.");
  return data;
}

export function listenOperationalCollection<T extends DocumentData>(
  collectionName: OperationalCollection,
  constraints: QueryConstraint[],
  onData: (items: Array<T & { id: string }>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!canUseProductionFirestore()) return () => undefined;
  const q = query(collection(getFirebaseDb(), collectionName), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T & { id: string })),
    (error) => onError?.(error),
  );
}

export function listenAccountingEntries(
  range: DateRangeInput,
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "accountingEntries",
    [
      where("tenantId", "==", DEFAULT_TENANT_ID),
      where("branchId", "==", BRANCH_ID),
      where("createdAt", ">=", range.from),
      where("createdAt", "<=", range.to),
      orderBy("createdAt", "desc"),
      limit(250),
    ],
    onData,
    onError,
  );
}

export function listenInventory(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "inventory",
    [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", BRANCH_ID), orderBy("itemName", "asc"), limit(250)],
    onData,
    onError,
  );
}

export function listenLoyaltyCustomers(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "loyaltyCustomers",
    [where("tenantId", "==", DEFAULT_TENANT_ID), orderBy("loyaltyPoints", "desc"), limit(250)],
    onData,
    onError,
  );
}

export function listenNotifications(
  onData: (items: Array<DocumentData & { id: string }>) => void,
  onError?: (error: Error) => void,
) {
  return listenOperationalCollection(
    "notifications",
    [where("tenantId", "==", DEFAULT_TENANT_ID), where("branchId", "==", BRANCH_ID), where("read", "==", false), orderBy("createdAt", "desc"), limit(50)],
    onData,
    onError,
  );
}

export async function saveAccountingEntry(entry: AccountingWrite) {
  if (!canUseProductionFirestore()) return null;
  const scope = ownerScope(entry);
  const payload = {
    ...entry,
    ...scope,
    ...updateMetadata(entry),
  };
  if (entry.id) {
    await setDoc(doc(getFirebaseDb(), "accountingEntries", entry.id), payload, { merge: true });
    return entry.id;
  }
  const ref = await addDoc(collection(getFirebaseDb(), "accountingEntries"), {
    ...payload,
    tenantId: payload.tenantId,
    ...createMetadata(payload),
  });
  return ref.id;
}

export async function saveInventoryItem(item: InventoryWrite) {
  if (!canUseProductionFirestore()) return null;
  const db = getFirebaseDb();
  const id = item.id ?? `inv-${Date.now()}`;
  const scope = ownerScope(item);
  const payload = {
    ...item,
    id,
    ...scope,
    ...updateMetadata(item),
  };
  await setDoc(doc(db, "inventory", id), {
    ...payload,
    ...createMetadata(payload),
  }, { merge: true });
  await addDoc(collection(db, "inventoryTransactions"), {
    restaurantId: payload.restaurantId,
    tenantId: payload.tenantId,
    branchId: payload.branchId,
    ownerId: payload.ownerId,
    inventoryId: id,
    type: "manual-adjustment",
    quantity: item.quantity,
    unit: item.unit,
    ...createMetadata(payload),
  });
  return id;
}

export async function saveOwnerOffer(offer: Offer, restaurantId = DEFAULT_RESTAURANT_ID) {
  let apiError: unknown;
  const apiResult = await ownerApi<{ ok: boolean; code: string }>("/api/owner/offers", {
    method: "POST",
    body: JSON.stringify({ offer, restaurantId }),
  }).catch((error) => {
    apiError = error;
    return null;
  });
  if (apiResult?.ok) return apiResult.code;

  if (!canUseProductionFirestore()) throw apiError ?? new Error("Offer could not be saved because owner access is not available.");
  const code = offer.code.trim().toUpperCase();
  await setDoc(doc(getFirebaseDb(), "offers", code), {
    id: code,
    code,
    title: offer.title,
    subtitle: offer.subtitle,
    description: offer.description,
    promoTag: offer.promoTag,
    banner: offer.banner,
    mobileBanner: offer.mobileBanner,
    discountType: offer.discountType ?? (offer.offerType === "flat" ? "flat" : "percentage"),
    offerType: offer.offerType,
    discountValue: offer.discount,
    minimumOrder: offer.minimumOrder,
    maxDiscount: offer.maxDiscount,
    active: (offer.status ?? "active") === "active",
    status: offer.status ?? "active",
    startsAt: offer.validFrom ? new Date(offer.validFrom) : undefined,
    endsAt: offer.validTo ? new Date(offer.validTo) : undefined,
    startTime: offer.startTime,
    endTime: offer.endTime,
    daysOfWeek: offer.daysOfWeek,
    applicableCategories: offer.applicableCategories,
    applicableItemIds: offer.applicableItemIds,
    appliesTo: offer.appliesTo,
    newCustomersOnly: offer.newCustomersOnly,
    usageLimit: offer.usageLimit,
    perUserLimit: offer.perUserLimit,
    showOnHomepage: offer.showOnHomepage,
    showOnRestaurantPage: offer.showOnRestaurantPage,
    featured: offer.featured,
    priority: offer.priority,
    sponsored: offer.sponsored,
    sponsoredPriority: offer.sponsoredPriority,
    adBudget: offer.adBudget,
    campaignStatus: offer.campaignStatus,
    conditions: offer.conditions,
    ...updateMetadata({ restaurantId }),
    isDeleted: false,
  }, { merge: true });
  return code;
}

export async function deleteOwnerOffer(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  let apiError: unknown;
  const apiResult = await ownerApi<{ ok: boolean; code: string }>(`/api/owner/offers?code=${encodeURIComponent(normalizedCode)}`, {
    method: "DELETE",
  }).catch((error) => {
    apiError = error;
    return null;
  });
  if (apiResult?.ok) return apiResult.code;

  if (!canUseProductionFirestore()) throw apiError ?? new Error("Offer could not be deleted because owner access is not available.");
  await deleteDoc(doc(getFirebaseDb(), "offers", normalizedCode));
  return normalizedCode;
}

export async function saveOwnerRestaurantProfile(input: {
  profile: OwnerBusinessProfile;
  restaurant: Restaurant;
  branch: RestaurantBranch;
}) {
  let apiError: unknown;
  const apiResult = await ownerApi<{ ok: boolean; restaurantId: string }>("/api/owner/profile", {
    method: "POST",
    body: JSON.stringify(input),
  }).catch((error) => {
    apiError = error;
    return null;
  });
  if (apiResult?.ok) return apiResult.restaurantId;

  if (!canUseProductionFirestore()) throw apiError ?? new Error("Owner profile could not be saved because owner access is not available.");
  const { profile, restaurant, branch } = input;
  await Promise.all([
    setDoc(doc(getFirebaseDb(), "restaurants", restaurant.slug), {
      id: restaurant.slug,
      name: restaurant.name,
      slug: restaurant.slug,
      ownerIds: restaurant.ownerIds ?? [restaurant.ownerId ?? currentOwnerId()],
      ownerId: restaurant.ownerId ?? currentOwnerId(),
      branchId: restaurant.branchId,
      primaryBranchId: restaurant.branchId,
      location: restaurant.location,
      address: restaurant.location,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      cuisine: restaurant.cuisine,
      active: restaurant.approved !== false,
      imagePath: restaurant.image,
      logoPath: restaurant.logo ?? profile.logo,
      coverImagePath: restaurant.coverImage ?? profile.coverImage ?? restaurant.image,
      coverImagePaths: Array.from(new Set([...(restaurant.coverImages ?? []), ...(profile.coverImages ?? []), restaurant.coverImage, profile.coverImage].filter(Boolean))),
      googleMapLocation: restaurant.googleMapLocation ?? profile.googleMapLocation,
      operatingHours: profile.operatingHours,
      operatingHoursSchedule: profile.operatingHoursSchedule,
      operatingHoursPreference: profile.operatingHoursPreference,
      gstDetails: profile.gstDetails,
      fssaiLicense: profile.fssaiLicense,
      diningAvailable: profile.diningAvailable,
      cloudKitchen: profile.cloudKitchen,
      minPrice: profile.minimumOrder ?? restaurant.minPrice,
      contact: restaurant.contact,
      ownerProfile: {
        ...restaurant.ownerProfile,
        ownerName: profile.ownerName,
        hotelName: profile.hotelName,
        gstDetails: profile.gstDetails,
        fssaiLicense: profile.fssaiLicense,
        operatingHours: profile.operatingHours,
        diningAvailable: profile.diningAvailable,
        cloudKitchen: profile.cloudKitchen,
        reviewStatus: profile.reviewStatus ?? "pending_review",
      },
      deliverySettings: restaurant.deliverySettings,
      scheduling: restaurant.scheduling,
      advancedFeatures: restaurant.advancedFeatures,
      ...updateMetadata({ restaurantId: restaurant.slug, branchId: branch.id }),
      isDeleted: false,
    }, { merge: true }),
    setDoc(doc(getFirebaseDb(), "branches", branch.id), {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      active: true,
      ...updateMetadata({ restaurantId: branch.restaurantSlug, branchId: branch.id }),
      isDeleted: false,
    }, { merge: true }),
  ]);
  return restaurant.slug;
}

export async function deductRecipeInventory(input: {
  orderId: string;
  lines: Array<{ itemId?: string; menuItemId?: string; quantity: number; recipe?: Array<{ inventoryId: string; quantity: number }> }>;
}) {
  if (!canUseProductionFirestore()) return;
  const db = getFirebaseDb();
  for (const line of input.lines) {
    for (const recipeItem of line.recipe ?? []) {
      await addDoc(collection(db, "inventoryTransactions"), {
        restaurantId: RESTAURANT_ID,
        tenantId: DEFAULT_TENANT_ID,
        branchId: BRANCH_ID,
        ownerId: currentOwnerId(),
        orderId: input.orderId,
        menuItemId: line.menuItemId ?? line.itemId,
        inventoryId: recipeItem.inventoryId,
        type: "deduction",
        quantity: -(recipeItem.quantity * line.quantity),
        ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
      });
    }
  }
}

export async function upsertCustomerProfile(input: {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}) {
  if (!canUseProductionFirestore()) return null;
  const normalized = normalizePhone(input.phone);
  const id = input.id ?? `cust-${normalized || Date.now()}`;
  const db = getFirebaseDb();
  await setDoc(doc(db, "customers", id), {
    id,
    tenantId: DEFAULT_TENANT_ID,
    restaurantId: RESTAURANT_ID,
    branchId: BRANCH_ID,
    ownerId: currentOwnerId(),
    name: input.name,
    phone: input.phone,
    normalizedPhone: normalized,
    email: input.email,
    ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
  }, { merge: true });
  if (input.address) {
    await setDoc(doc(db, "customerAddresses", `${id}-default`), {
      id: `${id}-default`,
      tenantId: DEFAULT_TENANT_ID,
      restaurantId: RESTAURANT_ID,
      branchId: BRANCH_ID,
      ownerId: currentOwnerId(),
      customerId: id,
      label: "Default",
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      placeId: input.placeId,
      ...createMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
    }, { merge: true });
  }
  return id;
}

export async function logStaffActivity(input: {
  userId: string;
  action: string;
  module: string;
  restaurantId?: string;
  branchId?: string;
}) {
  if (!canUseProductionFirestore()) return null;
  const scope = ownerScope(input);
  const ref = await addDoc(collection(getFirebaseDb(), "staffActivityLogs"), {
    ...input,
    ...scope,
    ...createMetadata(input),
  });
  return ref.id;
}

export async function updateTableStatus(tableId: string, status: string) {
  if (!canUseProductionFirestore()) return;
  await updateDoc(doc(getFirebaseDb(), "tables", tableId), {
    status,
    ownerId: currentOwnerId(),
    ...updateMetadata({ restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
  });
}

export async function safeUpsertEmployeeUser(member: StaffMember) {
  if (!canUseProductionFirestore()) return null;
  if (member.role === "owner" || member.role === "admin") {
    throw new Error("Owner and admin accounts must be created by platform admin.");
  }

  await setDoc(doc(getFirebaseDb(), "users", member.id), {
    id: member.id,
    uid: member.id,
    displayName: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    roleId: member.roleId ?? member.role,
    tenantId: DEFAULT_TENANT_ID,
    ownerId: currentOwnerId(),
    tenantIds: [DEFAULT_TENANT_ID],
    restaurantIds: [RESTAURANT_ID],
    branchIds: [member.branchId],
    permissions: member.permissions,
    requiresLogin: member.requiresLogin,
    employmentType: member.employmentType,
    monthlySalary: member.monthlySalary,
    contractRate: member.contractRate,
    panNumber: member.panNumber,
    pfNumber: member.pfNumber,
    esiNumber: member.esiNumber,
    professionalTaxState: member.professionalTaxState,
    tdsSection: member.tdsSection,
    payrollEstimate: member.payrollEstimate,
    active: member.status === "active",
    ...createMetadata({ tenantId: DEFAULT_TENANT_ID, restaurantId: RESTAURANT_ID, branchId: member.branchId }),
  }, { merge: true });

  return member.id;
}

export async function safeDeleteEmployeeUser(memberId: string) {
  if (!canUseProductionFirestore()) return null;
  await setDoc(doc(getFirebaseDb(), "users", memberId), {
    active: false,
    isDeleted: true,
    deletedAt: new Date(),
    ...updateMetadata({ tenantId: DEFAULT_TENANT_ID, restaurantId: RESTAURANT_ID, branchId: BRANCH_ID }),
  }, { merge: true });
  return memberId;
}

export async function probeCollection(collectionName: string) {
  if (!shouldUseFirebase() || !isFirebaseConfigured || typeof window === "undefined") {
    return { collection: collectionName, ok: false, count: 0, message: "Firebase disabled or not configured." };
  }
  const snapshot = await getDocs(query(collection(getFirebaseDb(), collectionName), limit(1)));
  return { collection: collectionName, ok: true, count: snapshot.size, message: snapshot.empty ? "No documents found." : "Reachable." };
}
