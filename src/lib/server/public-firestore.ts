import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import { adminDb } from "@/firebase/admin";
import { defaultAppCategories } from "@/lib/default-app-categories";
import { resolveTenantId } from "@/lib/tenant";
import type { AppCategoryDoc, MenuDoc, OfferDoc, RestaurantDoc, ReviewDoc } from "@/types/firebase";

const PUBLIC_RESTAURANT_LIMIT = 100;
const PUBLIC_MENU_LIMIT = 200;
const PUBLIC_MENU_FALLBACK_LIMIT = 500;
const PUBLIC_REST_LIMIT = 500;
const DEFAULT_PUBLIC_RESTAURANT_IDS = ["cafe-al-arab-thanisandra", "falak-leela-bhartiya"];

type PublicFieldFilter = {
  fieldPath: string;
  op?: "EQUAL";
  value: string | number | boolean;
};

type FirestoreRestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
  referenceValue?: string;
  geoPointValue?: { latitude: number; longitude: number };
};

type FirestoreRestDocument = {
  name: string;
  fields?: Record<string, FirestoreRestValue>;
};

type FirestoreRunQueryRow = {
  document?: FirestoreRestDocument;
  error?: { code?: number; message?: string; status?: string };
};

type RestaurantStatsDoc = {
  id: string;
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: Record<string, number>;
  totalOrders?: number;
  repeatCustomers?: number;
};

function serializeFirestoreValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, serializeFirestoreValue(entry)]),
  );
}

function docToJson<T extends { id: string }>(
  snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>,
): T {
  return serializeFirestoreValue({
    id: snapshot.id,
    ...snapshot.data(),
  }) as T;
}

function hasAdminFirestoreCredentials() {
  return Boolean(
    (
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) ||
    existsSync(join(process.cwd(), "service-account-key.json")) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_CONFIG,
  );
}

function isAdminCredentialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /credential|private key|DECODER|PEM|application default|Could not load the default credentials|Unable to detect a Project Id/i.test(message);
}

function publicRestConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_API_KEY for public Firestore REST fallback.");
  }
  return { projectId, apiKey };
}

async function runPublicFirestoreQuery<T extends { id: string }>(
  collectionId: string,
  input: {
    filters?: PublicFieldFilter[];
    orderBy?: { fieldPath: string; direction?: "ASCENDING" | "DESCENDING" };
    limit?: number;
  } = {},
) {
  const { projectId, apiKey } = publicRestConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        ...(input.filters?.length ? { where: restWhere(input.filters) } : {}),
        ...(input.orderBy ? { orderBy: [{ field: { fieldPath: input.orderBy.fieldPath }, direction: input.orderBy.direction ?? "ASCENDING" }] } : {}),
        limit: input.limit ?? PUBLIC_REST_LIMIT,
      },
    }),
  });

  const payload = (await response.json().catch(() => [])) as FirestoreRunQueryRow[] | { error?: { message?: string; status?: string } };
  if (!response.ok || !Array.isArray(payload)) {
    const message = Array.isArray(payload) ? response.statusText : payload.error?.message ?? response.statusText;
    throw new Error(`Public Firestore REST query failed for ${collectionId}: ${message}`);
  }

  const errorRow = payload.find((row) => row.error);
  if (errorRow?.error) {
    throw new Error(`Public Firestore REST query failed for ${collectionId}: ${errorRow.error.message ?? errorRow.error.status ?? "unknown error"}`);
  }

  return payload
    .map((row) => row.document)
    .filter((doc): doc is FirestoreRestDocument => Boolean(doc))
    .map((doc) => restDocumentToJson<T>(doc));
}

async function getPublicFirestoreDocument<T extends { id: string }>(collectionId: string, docId: string) {
  const { projectId, apiKey } = publicRestConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}/${encodeURIComponent(docId)}?key=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404 || response.status === 403) return null;
  const payload = (await response.json().catch(() => ({}))) as FirestoreRestDocument & { error?: { message?: string } };
  if (!response.ok || payload.error) {
    throw new Error(`Public Firestore REST document read failed for ${collectionId}/${docId}: ${payload.error?.message ?? response.statusText}`);
  }
  return restDocumentToJson<T>(payload);
}

function publicRestaurantIds() {
  const configured = process.env.NEXT_PUBLIC_LAUNCH_RESTAURANT_IDS
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_PUBLIC_RESTAURANT_IDS;
}

function restWhere(filters: PublicFieldFilter[]) {
  const fieldFilters = filters.map((filter) => ({
    fieldFilter: {
      field: { fieldPath: filter.fieldPath },
      op: filter.op ?? "EQUAL",
      value: restValue(filter.value),
    },
  }));

  if (fieldFilters.length === 1) return fieldFilters[0];

  return {
    compositeFilter: {
      op: "AND",
      filters: fieldFilters,
    },
  };
}

function restValue(value: string | number | boolean): FirestoreRestValue {
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: value };
}

function restDocumentToJson<T extends { id: string }>(document: FirestoreRestDocument): T {
  const id = decodeURIComponent(document.name.split("/").pop() ?? "");
  return {
    id,
    ...Object.fromEntries(
      Object.entries(document.fields ?? {}).map(([key, value]) => [key, restFieldValue(value)]),
    ),
  } as T;
}

function restFieldValue(value: FirestoreRestValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(restFieldValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue?.fields ?? {}).map(([key, entry]) => [key, restFieldValue(entry)]),
    );
  }
  return undefined;
}

function isMissingIndexError(error: unknown) {
  const maybeError = error as { code?: unknown; message?: unknown };
  const code = maybeError.code;
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    code === 9 ||
    code === "9" ||
    code === "FAILED_PRECONDITION" ||
    code === "failed-precondition" ||
    /FAILED_PRECONDITION|requires an index/i.test(message)
  );
}

export function logPublicDataError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : undefined;
  const hint = publicDataErrorHint(message);
  console.error(`[Sarva public API] ${scope} failed${code ? ` (${code})` : ""}: ${message}${hint ? ` ${hint}` : ""}`);
}

function publicDataErrorHint(message: string) {
  if (/DECODER|PEM|private key|invalid_grant|credential/i.test(message)) {
    return "Check FIREBASE_ADMIN_PRIVATE_KEY in hosting. In Hostinger hPanel paste the value without wrapping quotes; escaped \\n line breaks are supported.";
  }
  if (/Could not load the default credentials|Unable to detect a Project Id|application default/i.test(message)) {
    return "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in hosting environment variables.";
  }
  if (/permission-denied|Missing or insufficient permissions/i.test(message)) {
    return "Deploy Firestore rules and confirm public restaurant/menu documents are active.";
  }
  return "";
}

export async function getPublicRestaurantDocs(slug?: string) {
  if (!hasAdminFirestoreCredentials()) return getPublicRestaurantDocsFromRest(slug);

  try {
    let restaurantsQuery = adminDb()
      .collection("restaurants")
      .where("active", "==", true);

    if (slug) {
      restaurantsQuery = restaurantsQuery.where("slug", "==", slug);
    } else {
      restaurantsQuery = restaurantsQuery.orderBy("name", "asc");
    }

    const snapshot = await restaurantsQuery.limit(slug ? 1 : PUBLIC_RESTAURANT_LIMIT).get();
    return toPublicRestaurantDocs(await applyRestaurantStats(snapshot.docs.map((item) => docToJson<RestaurantDoc>(item))), slug);
  } catch (error) {
    if (isMissingIndexError(error)) return getPublicRestaurantDocsWithoutCompositeIndex(slug);
    if (isAdminCredentialError(error)) return getPublicRestaurantDocsFromRest(slug);
    throw error;
  }
}

async function getPublicRestaurantDocsFromRest(slug?: string) {
  const docs = (await Promise.all(
    publicRestaurantIds().map((id) => getPublicFirestoreDocument<RestaurantDoc>("restaurants", id)),
  )).filter((doc): doc is RestaurantDoc => Boolean(doc));
  const stats = await Promise.all(docs.map((doc) => getPublicFirestoreDocument<RestaurantStatsDoc>("restaurant_stats", doc.tenantId || doc.id).catch(() => null)));
  return toPublicRestaurantDocs(mergeRestaurantStats(docs, stats.filter((item): item is RestaurantStatsDoc => Boolean(item))), slug);
}

async function getPublicRestaurantDocsWithoutCompositeIndex(slug?: string) {
  const restaurantsQuery = slug
    ? adminDb().collection("restaurants").where("slug", "==", slug).limit(PUBLIC_RESTAURANT_LIMIT)
    : adminDb().collection("restaurants").where("active", "==", true).limit(PUBLIC_RESTAURANT_LIMIT);

  const snapshot = await restaurantsQuery.get();
  return toPublicRestaurantDocs(await applyRestaurantStats(snapshot.docs.map((item) => docToJson<RestaurantDoc>(item))), slug);
}

async function applyRestaurantStats(docs: RestaurantDoc[]) {
  if (!docs.length) return docs;
  const ids = docs.map((doc) => doc.tenantId || doc.id).filter(Boolean);
  const chunks = Array.from({ length: Math.ceil(ids.length / 30) }, (_, index) => ids.slice(index * 30, index * 30 + 30));
  const snapshots = await Promise.all(
    chunks.map((chunk) => adminDb().collection("restaurant_stats").where("__name__", "in", chunk).get().catch(() => null)),
  );
  const stats = snapshots.flatMap((snapshot) => snapshot?.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RestaurantStatsDoc) ?? []);
  return mergeRestaurantStats(docs, stats);
}

function mergeRestaurantStats(docs: RestaurantDoc[], stats: RestaurantStatsDoc[]) {
  const statsMap = new Map(stats.map((item) => [item.id, item]));
  return docs.map((doc) => {
    const stat = statsMap.get(doc.tenantId || doc.id);
    if (!stat) return doc;
    return {
      ...doc,
      rating: typeof stat.averageRating === "number" ? stat.averageRating : (doc as RestaurantDoc & { rating?: number }).rating,
      reviewCount: typeof stat.totalReviews === "number" ? stat.totalReviews : (doc as RestaurantDoc & { reviewCount?: number }).reviewCount,
      ratingDistribution: stat.ratingDistribution,
      totalOrders: stat.totalOrders,
      repeatCustomers: stat.repeatCustomers,
    } as RestaurantDoc;
  });
}

function toPublicRestaurantDocs(docs: RestaurantDoc[], slug?: string) {
  return docs
    .filter((item) => !item.isDeleted && item.active === true && isPublicRestaurantListable(item) && (!slug || item.slug === slug))
    .sort((first, second) => first.name.localeCompare(second.name))
    .map(toPublicRestaurantDoc)
    .slice(0, slug ? 1 : PUBLIC_RESTAURANT_LIMIT);
}

function isPublicRestaurantListable(doc: RestaurantDoc) {
  const extra = doc as RestaurantDoc & { approved?: boolean; profileComplete?: boolean; publicListingEnabled?: boolean };
  if (extra.approved === false || extra.publicListingEnabled === false || extra.profileComplete === false) return false;
  const hasLocation = Boolean((typeof doc.latitude === "number" && typeof doc.longitude === "number") || doc.googleMapLocation);
  const hasAddress = Boolean((doc.address || doc.location)?.trim());
  const hasCuisine = Boolean(Array.isArray(doc.cuisine) ? doc.cuisine.length : String(doc.cuisine ?? "").trim());
  const hasMedia = Boolean(doc.coverImagePath || doc.coverImagePaths?.length || doc.imagePath || doc.logoPath);
  const hasContact = Boolean(doc.contact?.phone || doc.ownerProfile?.businessPhone || (doc as RestaurantDoc & { phone?: string }).phone);
  return Boolean(doc.name?.trim() && hasAddress && hasLocation && hasCuisine && hasMedia && hasContact && doc.deliveryRadiusKm);
}

export async function getPublicMenuDocs(restaurantId: string) {
  const tenantId = resolveTenantId(restaurantId);
  if (!hasAdminFirestoreCredentials()) return getPublicMenuDocsFromRest(tenantId);

  try {
    const [menusSnapshot, menuItemsSnapshot] = await Promise.all([
      adminDb()
        .collection("menus")
        .where("available", "==", true)
        .where("tenantId", "==", tenantId)
        .orderBy("sortOrder", "asc")
        .limit(PUBLIC_MENU_LIMIT)
        .get(),
      adminDb()
        .collection("menuItems")
        .where("available", "==", true)
        .where("tenantId", "==", tenantId)
        .orderBy("sortOrder", "asc")
        .limit(PUBLIC_MENU_LIMIT)
        .get(),
    ]);

    return toPublicMenuDocs([...menusSnapshot.docs, ...menuItemsSnapshot.docs].map((item) => docToJson<MenuDoc>(item)));
  } catch (error) {
    if (isMissingIndexError(error)) return getPublicMenuDocsWithoutCompositeIndex(tenantId);
    if (isAdminCredentialError(error)) return getPublicMenuDocsFromRest(tenantId);
    throw error;
  }
}

async function getPublicMenuDocsFromRest(tenantId: string) {
  const [menus, menuItems] = await Promise.all([
    runPublicFirestoreQuery<MenuDoc>("menus", {
      filters: [
        { fieldPath: "available", value: true },
        { fieldPath: "tenantId", value: tenantId },
      ],
      limit: PUBLIC_MENU_LIMIT,
    }),
    runPublicFirestoreQuery<MenuDoc>("menuItems", {
      filters: [
        { fieldPath: "available", value: true },
        { fieldPath: "tenantId", value: tenantId },
      ],
      limit: PUBLIC_MENU_LIMIT,
    }),
  ]);

  return toPublicMenuDocs([...menus, ...menuItems].filter((item) => isSameTenant(item, tenantId)));
}

async function getPublicMenuDocsWithoutCompositeIndex(tenantId: string) {
  const [menusSnapshot, menuItemsSnapshot] = await Promise.all([
    adminDb()
      .collection("menus")
      .where("tenantId", "==", tenantId)
      .limit(PUBLIC_MENU_FALLBACK_LIMIT)
      .get(),
    adminDb()
      .collection("menuItems")
      .where("tenantId", "==", tenantId)
      .limit(PUBLIC_MENU_FALLBACK_LIMIT)
      .get(),
  ]);

  return toPublicMenuDocs([...menusSnapshot.docs, ...menuItemsSnapshot.docs].map((item) => docToJson<MenuDoc>(item)));
}

function toPublicMenuDocs(docs: MenuDoc[]) {
  const publicDocs = docs
    .filter((item) =>
      !item.isDeleted &&
      item.available !== false &&
      (item as MenuDoc & { soldOut?: boolean }).soldOut !== true &&
      item.menuVisibility?.delivery !== false &&
      item.channelConfig?.delivery?.visible !== false &&
      item.channelConfig?.delivery?.available !== false &&
      typeof item.name === "string" &&
      typeof item.price === "number" &&
      typeof item.restaurantId === "string",
    );

  return Array.from(new Map(publicDocs.map((item) => [item.id, item])).values())
    .map(toPublicMenuDoc)
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
}

function isSameTenant(doc: Partial<MenuDoc | OfferDoc | RestaurantDoc>, tenantId: string) {
  const candidate = doc as { tenantId?: string; restaurantId?: string; id?: string };
  const docTenant = candidate.tenantId ?? candidate.restaurantId ?? candidate.id;
  return Boolean(docTenant && resolveTenantId(docTenant) === tenantId);
}

export async function getPublicOfferDocs(restaurantId?: string) {
  if (!hasAdminFirestoreCredentials()) return getPublicOfferDocsFromRest(restaurantId);

  let offersQuery = adminDb()
    .collection("offers")
    .where("active", "==", true);

  if (restaurantId) {
    offersQuery = offersQuery.where("tenantId", "==", resolveTenantId(restaurantId));
  }

  try {
    const snapshot = await offersQuery.limit(restaurantId ? 50 : 100).get();

    const docs = snapshot.docs
      .map((item) => docToJson<OfferDoc>(item))
      .filter((item) => item.active && !item.isDeleted && isOfferCurrentlyVisible(item))
      .map(toPublicOfferDoc);
    return docs;
  } catch (error) {
    if (isAdminCredentialError(error)) return getPublicOfferDocsFromRest(restaurantId);
    throw new Error("Unable to load public offers.");
  }
}

async function getPublicOfferDocsFromRest(restaurantId?: string) {
  const tenantId = restaurantId ? resolveTenantId(restaurantId) : undefined;
  const tenantIds = tenantId ? [tenantId] : publicRestaurantIds().map(resolveTenantId);
  const docs = (await Promise.all(
    tenantIds.map((id) =>
      runPublicFirestoreQuery<OfferDoc>("offers", {
        filters: [
          { fieldPath: "active", value: true },
          { fieldPath: "tenantId", value: id },
        ],
        limit: 50,
      }),
    ),
  )).flat();

  return docs
    .filter((item) => item.active && !item.isDeleted && (!tenantId || isSameTenant(item, tenantId)) && isOfferCurrentlyVisible(item))
    .map(toPublicOfferDoc);
}

export async function getPublicCategoryDocs() {
  if (!hasAdminFirestoreCredentials()) return getPublicCategoryDocsFromRest();

  try {
    const snapshot = await adminDb()
      .collection("appCategories")
      .where("active", "==", true)
      .orderBy("sortOrder", "asc")
      .limit(100)
      .get();
    return snapshot.docs.map((item) => toPublicCategoryDoc(docToJson<AppCategoryDoc>(item)));
  } catch (error) {
    if (isAdminCredentialError(error)) return getPublicCategoryDocsFromRest();
    if (!isMissingIndexError(error)) throw error;
    const snapshot = await adminDb()
      .collection("appCategories")
      .where("active", "==", true)
      .limit(100)
      .get();
    return snapshot.docs
      .map((item) => toPublicCategoryDoc(docToJson<AppCategoryDoc>(item)))
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  }
}

async function getPublicCategoryDocsFromRest() {
  try {
    const docs = await runPublicFirestoreQuery<AppCategoryDoc>("appCategories", {
      filters: [{ fieldPath: "active", value: true }],
      limit: 100,
    });
    return docs
      .map(toPublicCategoryDoc)
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  } catch {
    const now = new Date();
    return defaultAppCategories.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      imagePath: item.image,
      icon: item.icon,
      sortOrder: item.sortOrder,
      active: item.active,
      colorTheme: item.colorTheme,
      createdAt: item.createdAt ? new Date(item.createdAt) : now,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : now,
    } satisfies AppCategoryDoc));
  }
}

export async function getPublicReviewDocs(restaurantId: string, menuItemId?: string) {
  if (!hasAdminFirestoreCredentials()) {
    return { reviews: [], summary: { averageRating: 0, ratingCount: 0 } };
  }

  let reviewsQuery = adminDb()
    .collection("customerReviews")
    .where("restaurantId", "==", resolveTenantId(restaurantId))
    .where("status", "==", "published")
    .limit(100);

  if (menuItemId) {
    reviewsQuery = reviewsQuery.where("menuItemId", "==", menuItemId);
  }

  const snapshot = await reviewsQuery.get();
  const reviews = snapshot.docs
    .map((item) => docToJson<ReviewDoc>(item))
    .filter((item) => !item.isDeleted && item.verifiedOrder && item.status === "published")
    .sort((first, second) => dateMillis(second.createdAt) - dateMillis(first.createdAt));

  const ratingCount = reviews.length;
  const averageRating = ratingCount
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount) * 10) / 10
    : 0;

  return {
    reviews,
    summary: {
      averageRating,
      ratingCount,
    },
  };
}

function toPublicRestaurantDoc(doc: RestaurantDoc): RestaurantDoc {
  const extra = doc as RestaurantDoc & {
    approved?: boolean;
    rating?: number;
    deliveryTime?: string;
    etaMinutes?: number;
    priceForTwo?: number;
    reviewCount?: number;
    deliveryFee?: number;
    minPrice?: number;
    maxPrice?: number;
    foodTypes?: string[];
    popularItems?: string[];
    categoryTags?: string[];
    offerCodes?: string[];
    searchKeywords?: string[];
    tags?: string[];
    instagramHandle?: string;
    profileComplete?: boolean;
    publicListingEnabled?: boolean;
  };
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    name: doc.name,
    slug: doc.slug,
    ownerIds: doc.ownerIds ?? [],
    ownerId: doc.ownerId ?? doc.ownerIds?.[0],
    branchId: doc.branchId ?? doc.primaryBranchId,
    primaryBranchId: doc.primaryBranchId,
    location: doc.location,
    latitude: doc.latitude,
    longitude: doc.longitude,
    address: doc.address,
    deliveryRadiusKm: doc.deliveryRadiusKm,
    cuisine: doc.cuisine,
    active: doc.active,
    imagePath: doc.imagePath,
    logoPath: doc.logoPath,
    coverImagePath: doc.coverImagePath,
    coverImagePaths: doc.coverImagePaths,
    googleMapLocation: doc.googleMapLocation,
    operatingHours: doc.operatingHours,
    operatingHoursSchedule: doc.operatingHoursSchedule,
    operatingHoursPreference: doc.operatingHoursPreference,
    gstDetails: doc.gstDetails,
    fssaiLicense: doc.fssaiLicense,
    diningAvailable: doc.diningAvailable,
    cloudKitchen: doc.cloudKitchen,
    minPrice: extra.minPrice,
    subscriptionId: undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(extra.approved !== undefined ? { approved: extra.approved } : {}),
    ...(extra.profileComplete !== undefined ? { profileComplete: extra.profileComplete } : {}),
    ...(extra.publicListingEnabled !== undefined ? { publicListingEnabled: extra.publicListingEnabled } : {}),
    ...(extra.rating !== undefined ? { rating: extra.rating } : {}),
    ...(extra.deliveryTime ? { deliveryTime: extra.deliveryTime } : {}),
    ...(extra.etaMinutes !== undefined ? { etaMinutes: extra.etaMinutes } : {}),
    ...(extra.priceForTwo !== undefined ? { priceForTwo: extra.priceForTwo } : {}),
    ...(extra.reviewCount !== undefined ? { reviewCount: extra.reviewCount } : {}),
    ...(extra.deliveryFee !== undefined ? { deliveryFee: extra.deliveryFee } : {}),
    ...(extra.minPrice !== undefined ? { minPrice: extra.minPrice } : {}),
    ...(extra.maxPrice !== undefined ? { maxPrice: extra.maxPrice } : {}),
    ...(extra.foodTypes ? { foodTypes: extra.foodTypes } : {}),
    ...(extra.popularItems ? { popularItems: extra.popularItems } : {}),
    ...(extra.categoryTags ? { categoryTags: extra.categoryTags } : {}),
    ...(extra.offerCodes ? { offerCodes: extra.offerCodes } : {}),
    ...(extra.searchKeywords ? { searchKeywords: extra.searchKeywords } : {}),
    ...(extra.tags ? { tags: extra.tags } : {}),
    ...(extra.instagramHandle ? { instagramHandle: extra.instagramHandle } : {}),
    ...(doc.contact ? { contact: doc.contact } : {}),
    ...(doc.ownerProfile ? { ownerProfile: doc.ownerProfile } : {}),
    ...(doc.deliverySettings ? { deliverySettings: doc.deliverySettings } : {}),
    ...(doc.scheduling ? { scheduling: doc.scheduling } : {}),
    ...(doc.advancedFeatures ? { advancedFeatures: doc.advancedFeatures } : {}),
  } as RestaurantDoc;
}

function toPublicMenuDoc(doc: MenuDoc): MenuDoc {
  const deliveryConfig = doc.channelConfig?.delivery;
  return {
    id: doc.id,
    restaurantId: doc.restaurantId,
    categoryId: doc.categoryId,
    ...(doc.category ? { category: doc.category } : {}),
    ...(doc.subcategory ? { subcategory: doc.subcategory } : {}),
    cuisineIds: doc.cuisineIds,
    name: doc.name,
    translations: doc.translations,
    description: doc.description,
    longDescription: doc.longDescription,
    price: deliveryConfig?.price ?? doc.deliveryPrice ?? doc.price,
    deliveryPrice: deliveryConfig?.price ?? doc.deliveryPrice,
    taxRate: deliveryConfig?.taxRate ?? doc.taxRate,
    packingCharge: deliveryConfig?.packingCharge ?? doc.packingCharge,
    imagePath: doc.imagePath,
    imagePaths: doc.imagePaths,
    isVeg: doc.isVeg,
    foodType: doc.foodType,
    available: doc.available,
    tags: doc.tags,
    badges: doc.badges,
    searchKeywords: doc.searchKeywords,
    dietaryLabels: doc.dietaryLabels,
    allergenLabels: doc.allergenLabels,
    scheduleIds: doc.scheduleIds,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  } as MenuDoc;
}

function toPublicCategoryDoc(doc: AppCategoryDoc): AppCategoryDoc {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    imagePath: doc.imagePath,
    icon: doc.icon,
    sortOrder: doc.sortOrder,
    active: doc.active,
    colorTheme: doc.colorTheme,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicOfferDoc(doc: OfferDoc): OfferDoc {
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    restaurantId: doc.restaurantId,
    code: doc.code,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    promoTag: doc.promoTag,
    banner: doc.banner,
    mobileBanner: doc.mobileBanner,
    discountType: doc.discountType,
    offerType: doc.offerType,
    discountValue: doc.discountValue,
    minimumOrder: doc.minimumOrder,
    maxDiscount: doc.maxDiscount,
    active: doc.active,
    status: doc.status,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    startTime: doc.startTime,
    endTime: doc.endTime,
    daysOfWeek: doc.daysOfWeek,
    applicableCategories: doc.applicableCategories,
    applicableItemIds: doc.applicableItemIds,
    appliesTo: doc.appliesTo,
    newCustomersOnly: doc.newCustomersOnly,
    usageLimit: doc.usageLimit,
    perUserLimit: doc.perUserLimit,
    showOnHomepage: doc.showOnHomepage,
    showOnRestaurantPage: doc.showOnRestaurantPage,
    featured: doc.featured,
    priority: doc.priority,
    sponsored: doc.sponsored,
    sponsoredPriority: doc.sponsoredPriority,
    adBudget: doc.adBudget,
    campaignStatus: doc.campaignStatus,
    conditions: doc.conditions,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function isOfferCurrentlyVisible(doc: OfferDoc) {
  const now = Date.now();
  const startsAt = dateMillis(doc.startsAt);
  const endsAt = dateMillis(doc.endsAt);
  if (doc.status && doc.status !== "active") return false;
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  const current = new Date(now);
  if (doc.daysOfWeek?.length) {
    const day = current.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    if (!doc.daysOfWeek.map((item) => item.toLowerCase().slice(0, 3)).includes(day)) return false;
  }
  const currentTime = `${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`;
  if (doc.startTime && currentTime < doc.startTime) return false;
  if (doc.endTime && currentTime > doc.endTime) return false;
  return true;
}

function dateMillis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value) || 0;
  const maybeTimestamp = value as { toDate?: () => Date };
  return typeof maybeTimestamp.toDate === "function" ? maybeTimestamp.toDate().getTime() : 0;
}
