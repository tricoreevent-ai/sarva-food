import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import { adminDb, firebaseAdminPrivateKeyDiagnostics } from "@/firebase/admin";
import { defaultAppCategories } from "@/lib/default-app-categories";
import { defaultAppCuisines } from "@/lib/default-app-cuisines";
import { parseFirestoreDateIso, parseFirestoreDateMillis } from "@/lib/firestore-date";
import { DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import type { AppCategoryDoc, AppCuisineDoc, MenuDoc, OfferDoc, RestaurantDoc, ReviewDoc } from "@/types/firebase";

const PUBLIC_RESTAURANT_LIMIT = 100;
const PUBLIC_MENU_LIMIT = 200;
const PUBLIC_MENU_FALLBACK_LIMIT = 500;
const PUBLIC_REST_LIMIT = 500;
const PUBLIC_DATA_LOG_PREFIX = "[Nammude public data]";
const LEGACY_DEMO_TENANT_IDS = new Set(["test-owner", "demo-owner", "sample-owner"]);
const CAFE_AL_ARAB_PUBLIC_TENANT_ALIASES = [
  DEFAULT_RESTAURANT_ID,
  "cafe-al-arab-ul",
  "cafe-al-arab-ul-thanisandra",
  "cafe-al-arab",
];
const LEGACY_SEEDED_PUBLIC_MENU_IDS = new Set([
  "cafe-al-arab-thanisandra-chicken-shawarma-roll",
  "cafe-al-arab-thanisandra-alfaham-half",
  "cafe-al-arab-thanisandra-chicken-mandi",
  "cafe-al-arab-thanisandra-falafel-pita",
  "menu-chicken-shawarma-roll",
  "menu-al-faham-half",
  "menu-chicken-mandi",
  "menu-falafel-pita",
]);
const LEGACY_SEEDED_PUBLIC_OFFER_CODES = new Set(["ARABIC20", "INSTA20"]);
const LEGACY_SEEDED_PUBLIC_OFFER_IDS = new Set(["offer-arabic20"]);

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

  const iso = parseFirestoreDateIso(value);
  if (iso) return iso;

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

function publicTenantAliases(tenantId: string) {
  return isCafeAlArabTenantId(tenantId) ? CAFE_AL_ARAB_PUBLIC_TENANT_ALIASES : [tenantId];
}

function isCafeAlArabTenantId(value?: string | null) {
  return Boolean(value && value.trim().toLowerCase().includes("cafe-al-arab"));
}

function isLegacyDemoTenant(value?: string | null) {
  return Boolean(value && LEGACY_DEMO_TENANT_IDS.has(value.trim().toLowerCase()));
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
  console.error(`[Nammude public API] ${scope} failed${code ? ` (${code})` : ""}: ${message}${hint ? ` ${hint}` : ""}`);
}

export function logPublicDataInfo(scope: string, message: string, details?: Record<string, unknown>) {
  console.info(`${PUBLIC_DATA_LOG_PREFIX} ${scope}: ${message}${details ? ` ${JSON.stringify(details)}` : ""}`);
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
  if (!hasAdminFirestoreCredentials()) {
    logPublicDataInfo("restaurants", "Firebase Admin credentials not detected; using public REST fallback.", {
      slug: slug ?? null,
      hasPublicProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      hasPublicApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    });
    return getPublicRestaurantDocsFromRest(slug);
  }

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
    const rawDocs = snapshot.docs.map((item) => docToJson<RestaurantDoc>(item));
    const docsWithStats = await applyRestaurantStats(rawDocs);
    return toPublicRestaurantDocs(docsWithStats, slug, "admin");
  } catch (error) {
    if (isMissingIndexError(error)) {
      logPublicDataInfo("restaurants", "Composite index unavailable; using simpler Admin query.", { slug: slug ?? null });
      return getPublicRestaurantDocsWithoutCompositeIndex(slug);
    }
    if (isAdminCredentialError(error)) {
      logPublicDataError("restaurants-admin-credentials", error);
      logPublicDataInfo("restaurants-admin-private-key", "Sanitized private key diagnostics.", firebaseAdminPrivateKeyDiagnostics());
      return getPublicRestaurantDocsFromRest(slug);
    }
    throw error;
  }
}

async function getPublicRestaurantDocsFromRest(slug?: string) {
  const docs = slug
    ? await getPublicRestaurantDocsBySlugFromRest(slug)
    : await runPublicFirestoreQuery<RestaurantDoc>("restaurants", {
      filters: [{ fieldPath: "active", value: true }],
      limit: PUBLIC_RESTAURANT_LIMIT,
    });
  const stats = await Promise.all(docs.map((doc) => getPublicFirestoreDocument<RestaurantStatsDoc>("restaurant_stats", doc.tenantId || doc.id).catch(() => null)));
  return toPublicRestaurantDocs(mergeRestaurantStats(docs, stats.filter((item): item is RestaurantStatsDoc => Boolean(item))), slug, "rest");
}

async function getPublicRestaurantDocsBySlugFromRest(slug: string) {
  const [directDocs, slugMatches] = await Promise.all([
    Promise.all(publicTenantAliases(slug).map((id) => getPublicFirestoreDocument<RestaurantDoc>("restaurants", id))),
    runPublicFirestoreQuery<RestaurantDoc>("restaurants", {
      filters: [{ fieldPath: "slug", value: slug }],
      limit: PUBLIC_RESTAURANT_LIMIT,
    }).catch(() => []),
  ]);

  return Array.from(
    new Map(
      [...directDocs.filter((doc): doc is RestaurantDoc => Boolean(doc)), ...slugMatches]
        .map((doc) => [doc.id, doc]),
    ).values(),
  );
}

async function getPublicRestaurantDocsWithoutCompositeIndex(slug?: string) {
  const restaurantsQuery = slug
    ? adminDb().collection("restaurants").where("slug", "==", slug).limit(PUBLIC_RESTAURANT_LIMIT)
    : adminDb().collection("restaurants").where("active", "==", true).limit(PUBLIC_RESTAURANT_LIMIT);

  const snapshot = await restaurantsQuery.get();
  return toPublicRestaurantDocs(await applyRestaurantStats(snapshot.docs.map((item) => docToJson<RestaurantDoc>(item))), slug, "admin-simple");
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

function toPublicRestaurantDocs(docs: RestaurantDoc[], slug?: string, source = "unknown") {
  const publicDocs = docs
    .filter((item) => !item.isDeleted && item.active === true && isPublicRestaurantListable(item) && matchesPublicRestaurantSlug(item, slug))
    .map(toPublicRestaurantDoc);

  const deduped = dedupePublicRestaurantDocs(publicDocs)
    .sort((first, second) => first.name.localeCompare(second.name))
    .slice(0, slug ? 1 : PUBLIC_RESTAURANT_LIMIT);

  logPublicRestaurantDiagnostics(docs, deduped, slug, source);
  return deduped;
}

function logPublicRestaurantDiagnostics(rawDocs: RestaurantDoc[], publicDocs: RestaurantDoc[], slug?: string, source = "unknown") {
  const rejectionSummary = summarizeRestaurantVisibilityRejections(rawDocs, slug);
  const shouldLog = !publicDocs.length || process.env.NEXT_PUBLIC_APP_ENV !== "production";
  if (!shouldLog) return;

  logPublicDataInfo("restaurants", publicDocs.length ? "Loaded public restaurants." : "No public restaurants passed visibility filters.", {
    source,
    slug: slug ?? null,
    rawCount: rawDocs.length,
    publicCount: publicDocs.length,
    rejectionSummary,
  });
}

function summarizeRestaurantVisibilityRejections(docs: RestaurantDoc[], slug?: string) {
  const summary: Record<string, number> = {};
  for (const doc of docs) {
    const reasons = restaurantVisibilityRejectionReasons(doc, slug);
    for (const reason of reasons) summary[reason] = (summary[reason] ?? 0) + 1;
  }
  return summary;
}

function restaurantVisibilityRejectionReasons(doc: RestaurantDoc, slug?: string) {
  const reasons: string[] = [];
  const extra = doc as RestaurantDoc & { approved?: boolean; profileComplete?: boolean; publicListingEnabled?: boolean; phone?: string };
  if (doc.isDeleted) reasons.push("deleted");
  if (doc.active !== true) reasons.push("inactive");
  if (isLegacyDemoTenant(doc.tenantId ?? doc.id ?? doc.slug)) reasons.push("legacy-demo-tenant");
  if (extra.approved === false) reasons.push("approval-disabled");
  if (extra.publicListingEnabled === false) reasons.push("public-listing-disabled");
  if (extra.profileComplete === false) reasons.push("profile-incomplete");
  if (!doc.name?.trim()) reasons.push("missing-name");
  if (!((doc.address || doc.location)?.trim())) reasons.push("missing-address");
  if (!((typeof doc.latitude === "number" && typeof doc.longitude === "number") || doc.googleMapLocation)) reasons.push("missing-location");
  if (!(Array.isArray(doc.cuisine) ? doc.cuisine.length : String(doc.cuisine ?? "").trim())) reasons.push("missing-cuisine");
  if (!(doc.bannerImages?.length || doc.coverImagePath || doc.coverImagePaths?.length || doc.imagePath || doc.logoPath)) reasons.push("missing-media");
  if (!(doc.contact?.phone || doc.ownerProfile?.businessPhone || extra.phone)) reasons.push("missing-contact");
  if (!doc.deliveryRadiusKm) reasons.push("missing-delivery-radius");
  if (!matchesPublicRestaurantSlug(doc, slug)) reasons.push("slug-mismatch");
  return reasons;
}

function matchesPublicRestaurantSlug(doc: RestaurantDoc, slug?: string) {
  if (!slug) return true;
  if (doc.slug === slug || doc.id === slug || doc.tenantId === slug) return true;
  return isCafeAlArabTenantId(slug) && isCafeAlArabRestaurantDoc(doc);
}

function dedupePublicRestaurantDocs(docs: RestaurantDoc[]) {
  const restaurants = new Map<string, RestaurantDoc>();
  docs.forEach((doc) => {
    const key = publicRestaurantIdentityKey(doc);
    const previous = restaurants.get(key);
    if (!previous || isPreferredPublicRestaurantDoc(doc, previous)) {
      restaurants.set(key, doc);
    }
  });
  return Array.from(restaurants.values());
}

function publicRestaurantIdentityKey(doc: RestaurantDoc) {
  if (isCafeAlArabRestaurantDoc(doc)) return DEFAULT_RESTAURANT_ID;
  return (doc.slug || doc.tenantId || doc.id || doc.name).trim().toLowerCase();
}

function isPreferredPublicRestaurantDoc(candidate: RestaurantDoc, current: RestaurantDoc) {
  if (candidate.id === DEFAULT_RESTAURANT_ID && current.id !== DEFAULT_RESTAURANT_ID) return true;
  if (candidate.slug === DEFAULT_RESTAURANT_ID && current.slug !== DEFAULT_RESTAURANT_ID) return true;
  return false;
}

function isCafeAlArabRestaurantDoc(doc: RestaurantDoc) {
  const extra = doc as RestaurantDoc & { displayName?: string };
  return [doc.id, doc.slug, doc.tenantId, doc.name, extra.displayName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.trim().toLowerCase().includes("cafe al arab") || isCafeAlArabTenantId(value));
}

function isPublicRestaurantListable(doc: RestaurantDoc) {
  if (isLegacyDemoTenant(doc.tenantId ?? doc.id ?? doc.slug)) return false;
  const extra = doc as RestaurantDoc & { approved?: boolean; profileComplete?: boolean; publicListingEnabled?: boolean };
  if (extra.approved === false || extra.publicListingEnabled === false || extra.profileComplete === false) return false;
  const hasLocation = Boolean((typeof doc.latitude === "number" && typeof doc.longitude === "number") || doc.googleMapLocation);
  const hasAddress = Boolean((doc.address || doc.location)?.trim());
  const hasCuisine = Boolean(Array.isArray(doc.cuisine) ? doc.cuisine.length : String(doc.cuisine ?? "").trim());
  const hasMedia = Boolean(doc.bannerImages?.length || doc.coverImagePath || doc.coverImagePaths?.length || doc.imagePath || doc.logoPath);
  const hasContact = Boolean(doc.contact?.phone || doc.ownerProfile?.businessPhone || (doc as RestaurantDoc & { phone?: string }).phone);
  return Boolean(doc.name?.trim() && hasAddress && hasLocation && hasCuisine && hasMedia && hasContact && doc.deliveryRadiusKm);
}

export async function getPublicMenuDocs(restaurantId: string) {
  const tenantId = resolveTenantId(restaurantId);
  const tenantIds = publicTenantAliases(tenantId);
  if (!hasAdminFirestoreCredentials()) return getPublicMenuDocsFromRest(tenantId);

  try {
    const [menusSnapshots, menuItemsSnapshots] = await Promise.all([
      Promise.all(tenantIds.map((id) =>
        adminDb()
          .collection("menus")
          .where("available", "==", true)
          .where("tenantId", "==", id)
          .orderBy("sortOrder", "asc")
          .limit(PUBLIC_MENU_LIMIT)
          .get(),
      )),
      Promise.all(tenantIds.map((id) =>
        adminDb()
          .collection("menuItems")
          .where("available", "==", true)
          .where("tenantId", "==", id)
          .orderBy("sortOrder", "asc")
          .limit(PUBLIC_MENU_LIMIT)
          .get(),
      )),
    ]);

    const rawDocs = [...menusSnapshots, ...menuItemsSnapshots].flatMap((snapshot) => snapshot.docs.map((item) => docToJson<MenuDoc>(item)));
    const publicDocs = toPublicMenuDocs(rawDocs, tenantId);
    logPublicDataInfo("menu", "Loaded public menu.", {
      source: "admin",
      tenantId,
      rawCount: rawDocs.length,
      publicCount: publicDocs.length,
      rejectionSummary: menuRejectionSummary(rawDocs),
    });
    return publicDocs;
  } catch (error) {
    if (isMissingIndexError(error)) return getPublicMenuDocsWithoutCompositeIndex(tenantId);
    if (isAdminCredentialError(error)) {
      logPublicDataError("menu-admin-credentials", error);
      return getPublicMenuDocsFromRest(tenantId);
    }
    throw error;
  }
}

async function getPublicMenuDocsFromRest(tenantId: string) {
  const [menus, menuItems] = await Promise.all([
    getPublicMenuCollectionDocsFromRest("menus", tenantId),
    getPublicMenuCollectionDocsFromRest("menuItems", tenantId),
  ]);

  const rawDocs = [...menus, ...menuItems].filter((item) => isSameTenant(item, tenantId));
  const publicDocs = toPublicMenuDocs(rawDocs, tenantId);
  logPublicDataInfo("menu", "Loaded public menu.", {
    source: "rest",
    tenantId,
    rawCount: rawDocs.length,
    publicCount: publicDocs.length,
    rejectionSummary: menuRejectionSummary(rawDocs),
  });
  return publicDocs;
}

async function getPublicMenuCollectionDocsFromRest(collectionId: "menus" | "menuItems", tenantId: string) {
  const tenantIds = publicTenantAliases(tenantId);
  const queries = tenantIds.flatMap((id) => [
    { fieldPath: "tenantId", value: id },
    { fieldPath: "restaurantId", value: id },
  ]);
  const docs = (await Promise.all(
    queries.map((tenantFilter) =>
      runPublicFirestoreQuery<MenuDoc>(collectionId, {
        filters: [
          { fieldPath: "available", value: true },
          tenantFilter,
        ],
        limit: PUBLIC_MENU_LIMIT,
      }),
    ),
  )).flat();

  return Array.from(new Map(docs.map((item) => [item.id, item])).values());
}

async function getPublicMenuDocsWithoutCompositeIndex(tenantId: string) {
  const tenantIds = publicTenantAliases(tenantId);
  const [menusSnapshots, menuItemsSnapshots] = await Promise.all([
    Promise.all(tenantIds.map((id) =>
      adminDb()
        .collection("menus")
        .where("tenantId", "==", id)
        .limit(PUBLIC_MENU_FALLBACK_LIMIT)
        .get(),
    )),
    Promise.all(tenantIds.map((id) =>
      adminDb()
        .collection("menuItems")
        .where("tenantId", "==", id)
        .limit(PUBLIC_MENU_FALLBACK_LIMIT)
        .get(),
    )),
  ]);

  const rawDocs = [...menusSnapshots, ...menuItemsSnapshots].flatMap((snapshot) => snapshot.docs.map((item) => docToJson<MenuDoc>(item)));
  const publicDocs = toPublicMenuDocs(rawDocs, tenantId);
  logPublicDataInfo("menu", "Loaded public menu.", {
    source: "admin-simple",
    tenantId,
    rawCount: rawDocs.length,
    publicCount: publicDocs.length,
    rejectionSummary: menuRejectionSummary(rawDocs),
  });
  return publicDocs;
}

function toPublicMenuDocs(docs: MenuDoc[], requestedTenantId?: string) {
  const publicDocs = docs
    .filter((item) => menuRejectionReasons(item).length === 0)
    .map((item) => normalizePublicMenuTenant(item, requestedTenantId));

  return Array.from(new Map(publicDocs.map((item) => [item.id, item])).values())
    .map(toPublicMenuDoc)
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
}

function menuRejectionSummary(docs: MenuDoc[]) {
  const summary: Record<string, number> = {};
  for (const doc of docs) {
    const reasons = menuRejectionReasons(doc);
    for (const reason of reasons) {
      summary[reason] = (summary[reason] ?? 0) + 1;
    }
  }
  return summary;
}

function menuRejectionReasons(item: MenuDoc) {
  const reasons: string[] = [];
  if (item.isDeleted) reasons.push("deleted");
  if (isLegacyDemoTenant(item.tenantId ?? item.restaurantId)) reasons.push("legacy-demo-tenant");
  if (isLegacySeededPublicMenuDoc(item)) reasons.push("legacy-seeded-cafe-item");
  if (item.available === false) reasons.push("unavailable");
  if ((item as MenuDoc & { soldOut?: boolean }).soldOut === true) reasons.push("sold-out");
  if (!isVisibleOnCustomerMenuChannel(item)) reasons.push("hidden-channel");
  if (typeof item.name !== "string") reasons.push("missing-name");
  if (typeof item.price !== "number") reasons.push("missing-price");
  if (typeof item.restaurantId !== "string") reasons.push("missing-restaurant-id");
  return reasons;
}

function isLegacySeededPublicMenuDoc(item: MenuDoc) {
  return item.restaurantId === "cafe-al-arab-thanisandra" && LEGACY_SEEDED_PUBLIC_MENU_IDS.has(item.id);
}

function isVisibleOnCustomerMenuChannel(item: MenuDoc) {
  return (["delivery", "parcel", "dine-in"] as const).some((channel) =>
    item.menuVisibility?.[channel] !== false &&
    item.channelConfig?.[channel]?.visible !== false &&
    item.channelConfig?.[channel]?.available !== false,
  );
}

function isSameTenant(doc: Partial<MenuDoc | OfferDoc | RestaurantDoc>, tenantId: string) {
  const candidate = doc as { tenantId?: string; restaurantId?: string; id?: string };
  const docTenant = candidate.tenantId ?? candidate.restaurantId ?? candidate.id;
  if (!docTenant) return false;
  const resolvedDocTenant = resolveTenantId(docTenant);
  return resolvedDocTenant === tenantId || (isCafeAlArabTenantId(resolvedDocTenant) && isCafeAlArabTenantId(tenantId));
}

function normalizePublicMenuTenant(item: MenuDoc, requestedTenantId?: string): MenuDoc {
  if (!requestedTenantId || !isCafeAlArabTenantId(requestedTenantId) || !isCafeAlArabTenantId(item.tenantId ?? item.restaurantId)) return item;
  return {
    ...item,
    tenantId: DEFAULT_RESTAURANT_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
  };
}

function normalizePublicOfferTenant(item: OfferDoc, requestedTenantId?: string): OfferDoc {
  const itemTenant = item.tenantId ?? item.restaurantId;
  if (!isCafeAlArabTenantId(itemTenant) || (requestedTenantId && !isCafeAlArabTenantId(requestedTenantId))) return item;
  return {
    ...item,
    tenantId: DEFAULT_RESTAURANT_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
  };
}

function dedupePublicOffers(docs: OfferDoc[]) {
  return Array.from(
    new Map(docs.map((item) => [`${item.tenantId ?? ""}:${item.code || item.id}`.toLowerCase(), item])).values(),
  );
}

function isLegacySeededPublicOfferDoc(doc: OfferDoc) {
  return LEGACY_SEEDED_PUBLIC_OFFER_IDS.has(String(doc.id ?? "").toLowerCase()) ||
    LEGACY_SEEDED_PUBLIC_OFFER_CODES.has(String(doc.code ?? "").toUpperCase());
}

export async function getPublicOfferDocs(restaurantId?: string) {
  if (!hasAdminFirestoreCredentials()) return getPublicOfferDocsFromRest(restaurantId);

  try {
    const requestedTenantId = restaurantId ? resolveTenantId(restaurantId) : undefined;
    const tenantIds = requestedTenantId ? publicTenantAliases(requestedTenantId) : undefined;
    const snapshots = tenantIds?.length
      ? await Promise.all(tenantIds.flatMap((tenantId) =>
        (["tenantId", "restaurantId"] as const).map((field) =>
          adminDb()
            .collection("offers")
            .where("active", "==", true)
            .where(field, "==", tenantId)
            .limit(50)
            .get(),
        ),
      ))
      : [await adminDb()
        .collection("offers")
        .where("active", "==", true)
        .limit(100)
        .get()];

    const docs = snapshots.flatMap((snapshot) => snapshot.docs)
      .map((item) => docToJson<OfferDoc>(item))
      .filter((item) => item.active && !item.isDeleted && !isLegacyDemoTenant(item.tenantId ?? item.restaurantId) && !isLegacySeededPublicOfferDoc(item) && (!requestedTenantId || isSameTenant(item, requestedTenantId)) && isOfferCurrentlyVisible(item))
      .map((item) => toPublicOfferDoc(normalizePublicOfferTenant(item, requestedTenantId)));
    return dedupePublicOffers(docs);
  } catch (error) {
    if (isAdminCredentialError(error)) return getPublicOfferDocsFromRest(restaurantId);
    throw new Error("Unable to load public offers.");
  }
}

async function getPublicOfferDocsFromRest(restaurantId?: string) {
  const tenantId = restaurantId ? resolveTenantId(restaurantId) : undefined;
  const tenantIds = tenantId
    ? publicTenantAliases(tenantId).map(resolveTenantId)
    : publicRestaurantTenantIds(await getPublicRestaurantDocsFromRest());
  if (!tenantIds.length) return [];
  const docs = (await Promise.all(
    tenantIds.flatMap((id) =>
      (["tenantId", "restaurantId"] as const).map((field) =>
        runPublicFirestoreQuery<OfferDoc>("offers", {
          filters: [
            { fieldPath: "active", value: true },
            { fieldPath: field, value: id },
          ],
          limit: 50,
        }),
      ),
    ),
  )).flat();

  return dedupePublicOffers(docs
    .filter((item) => item.active && !item.isDeleted && !isLegacyDemoTenant(item.tenantId ?? item.restaurantId) && !isLegacySeededPublicOfferDoc(item) && (!tenantId || isSameTenant(item, tenantId)) && isOfferCurrentlyVisible(item))
    .map((item) => toPublicOfferDoc(normalizePublicOfferTenant(item, tenantId))));
}

function publicRestaurantTenantIds(docs: RestaurantDoc[]) {
  return Array.from(new Set(docs.flatMap((doc) =>
    [doc.tenantId, doc.id, doc.slug]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => publicTenantAliases(resolveTenantId(value)).map(resolveTenantId)),
  )));
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
    return mergeDefaultCategoryDocs(snapshot.docs.map((item) => docToJson<AppCategoryDoc>(item)))
      .map(toPublicCategoryDoc);
  } catch (error) {
    if (isAdminCredentialError(error)) return getPublicCategoryDocsFromRest();
    if (!isMissingIndexError(error)) throw error;
    const snapshot = await adminDb()
      .collection("appCategories")
      .where("active", "==", true)
      .limit(100)
      .get();
    return mergeDefaultCategoryDocs(snapshot.docs.map((item) => docToJson<AppCategoryDoc>(item)))
      .map(toPublicCategoryDoc)
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  }
}

async function getPublicCategoryDocsFromRest() {
  try {
    const docs = await runPublicFirestoreQuery<AppCategoryDoc>("appCategories", {
      filters: [{ fieldPath: "active", value: true }],
      limit: 100,
    });
    return mergeDefaultCategoryDocs(docs)
      .map(toPublicCategoryDoc)
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  } catch {
    return mergeDefaultCategoryDocs([]).map(toPublicCategoryDoc);
  }
}

export async function getPublicCuisineDocs() {
  if (!hasAdminFirestoreCredentials()) return getPublicCuisineDocsFromRest();

  try {
    const snapshot = await adminDb()
      .collection("appCuisines")
      .where("active", "==", true)
      .orderBy("sortOrder", "asc")
      .limit(150)
      .get();
    return mergeDefaultCuisineDocs(snapshot.docs.map((item) => docToJson<AppCuisineDoc>(item)))
      .map(toPublicCuisineDoc);
  } catch (error) {
    if (isAdminCredentialError(error)) return getPublicCuisineDocsFromRest();
    if (!isMissingIndexError(error)) throw error;
    const snapshot = await adminDb()
      .collection("appCuisines")
      .where("active", "==", true)
      .limit(150)
      .get();
    return mergeDefaultCuisineDocs(snapshot.docs.map((item) => docToJson<AppCuisineDoc>(item)))
      .map(toPublicCuisineDoc)
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  }
}

async function getPublicCuisineDocsFromRest() {
  try {
    const docs = await runPublicFirestoreQuery<AppCuisineDoc>("appCuisines", {
      filters: [{ fieldPath: "active", value: true }],
      limit: 150,
    });
    return mergeDefaultCuisineDocs(docs)
      .map(toPublicCuisineDoc)
      .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
  } catch {
    return mergeDefaultCuisineDocs([]).map(toPublicCuisineDoc);
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
    displayName?: string;
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
  const cafeAlArab = isCafeAlArabRestaurantDoc(doc);
  const publicRestaurantId = cafeAlArab ? DEFAULT_RESTAURANT_ID : doc.id;
  const publicRestaurantName = cafeAlArab ? "Cafe Al Arab UL" : doc.name;
  const bannerImages = restaurantBannerImages(doc);
  const thumbnailImages = restaurantThumbnailImages(doc, bannerImages);
  return {
    id: publicRestaurantId,
    tenantId: cafeAlArab ? DEFAULT_RESTAURANT_ID : doc.tenantId,
    name: publicRestaurantName,
    displayName: cafeAlArab ? publicRestaurantName : extra.displayName,
    slug: cafeAlArab ? DEFAULT_RESTAURANT_ID : doc.slug,
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
    coverImagePath: bannerImages[0] ?? doc.coverImagePath,
    coverImagePaths: bannerImages,
    bannerImages,
    thumbnailImages,
    primaryThumbnail: thumbnailImages[0] ?? "",
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

function restaurantBannerImages(doc: RestaurantDoc) {
  return Array.from(new Set([
    ...(doc.bannerImages ?? []),
    ...(doc.coverImagePaths ?? []),
    doc.coverImagePath,
    doc.imagePath,
  ].filter((value): value is string => Boolean(value && value !== doc.logoPath)))).slice(0, 5);
}

function restaurantThumbnailImages(doc: RestaurantDoc, bannerImages: string[]) {
  const saved = Array.isArray(doc.thumbnailImages) ? doc.thumbnailImages.filter(Boolean) : [];
  const thumbnails = saved.length ? saved : bannerImages.map(toRestaurantThumbnailUrl);
  return Array.from(new Set(thumbnails)).slice(0, 5);
}

function toRestaurantThumbnailUrl(url: string) {
  if (url.includes("images.unsplash.com")) return withUnsplashThumbnail(url);
  return withCloudinaryTransform(url, "f_webp,q_70,w_400,c_limit");
}

function withUnsplashThumbnail(url: string) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("auto", "format");
    if (!nextUrl.searchParams.has("fit")) nextUrl.searchParams.set("fit", "crop");
    nextUrl.searchParams.set("w", "400");
    nextUrl.searchParams.set("q", "70");
    return nextUrl.toString();
  } catch {
    return url;
  }
}

function withCloudinaryTransform(url: string, transform: string) {
  const marker = "/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const [prefix, rest = ""] = url.split(marker);
  const parts = rest.split("/").filter(Boolean);
  if (parts[0] && !parts[0].startsWith("v") && /[,_]/.test(parts[0])) parts.shift();
  return `${prefix}${marker}${transform}/${parts.join("/")}`;
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
    prepTime: doc.prepTime,
    calories: doc.calories,
    spiceLevel: doc.spiceLevel,
    averageRating: doc.averageRating,
    reviewCount: doc.reviewCount,
    available: doc.available,
    tags: doc.tags,
    badges: doc.badges,
    searchKeywords: doc.searchKeywords,
    dietaryLabels: doc.dietaryLabels,
    allergenLabels: doc.allergenLabels,
    modifiers: doc.modifiers,
    addOns: doc.addOns,
    variantGroups: doc.variantGroups,
    modifierGroups: doc.modifierGroups,
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

function toPublicCuisineDoc(doc: AppCuisineDoc): AppCuisineDoc {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    imagePath: doc.imagePath,
    icon: doc.icon,
    color: doc.color,
    sortOrder: doc.sortOrder,
    active: doc.active,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function mergeDefaultCategoryDocs(docs: AppCategoryDoc[]) {
  const now = new Date();
  const defaultDocs: AppCategoryDoc[] = defaultAppCategories.map((item) => ({
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
  return mergeDefaultDocs(defaultDocs, docs);
}

function mergeDefaultCuisineDocs(docs: AppCuisineDoc[]) {
  const now = new Date();
  const defaultDocs: AppCuisineDoc[] = defaultAppCuisines.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    imagePath: item.image,
    icon: item.icon,
    color: item.color,
    sortOrder: item.sortOrder,
    active: item.active,
    description: item.description,
    createdAt: item.createdAt ? new Date(item.createdAt) : now,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : now,
  } satisfies AppCuisineDoc));
  return mergeDefaultDocs(defaultDocs, docs);
}

function mergeDefaultDocs<T extends { id: string; slug?: string; active: boolean; sortOrder: number; isDeleted?: boolean }>(defaults: T[], docs: T[]) {
  const deleted = new Set(docs.filter((item) => item.isDeleted).flatMap((item) => [item.id, item.slug].filter(Boolean) as string[]));
  const merged = new Map<string, T>();
  defaults
    .filter((item) => !deleted.has(item.id) && (!item.slug || !deleted.has(item.slug)))
    .forEach((item) => merged.set(item.slug ?? item.id, item));
  docs
    .filter((item) => !item.isDeleted)
    .forEach((item) => merged.set(item.slug ?? item.id, item));
  return Array.from(merged.values())
    .filter((item) => item.active !== false)
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
}

function toPublicOfferDoc(doc: OfferDoc): OfferDoc {
  const legacy = doc as OfferDoc & { discount?: number; validFrom?: unknown; validTo?: unknown };
  const startsAt = (doc.startsAt ?? legacy.validFrom) as OfferDoc["startsAt"];
  const endsAt = (doc.endsAt ?? legacy.validTo) as OfferDoc["endsAt"];
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
    discountValue: Number(doc.discountValue ?? legacy.discount ?? 0),
    minimumOrder: doc.minimumOrder,
    maxDiscount: doc.maxDiscount,
    active: doc.active,
    status: doc.status,
    startsAt,
    endsAt,
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
  return parseFirestoreDateMillis(value);
}
