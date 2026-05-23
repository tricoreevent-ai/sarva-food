import "server-only";

import { adminDb } from "@/firebase/admin";
import {
  createSingleMenuDocs,
  createSingleOfferDocs,
  createSingleRestaurantDoc,
  SINGLE_RESTAURANT_SLUG,
} from "@/lib/single-restaurant-data";
import { resolveTenantId } from "@/lib/tenant";
import type { MenuDoc, OfferDoc, RestaurantDoc, ReviewDoc } from "@/types/firebase";

const PUBLIC_RESTAURANT_LIMIT = 100;
const PUBLIC_MENU_LIMIT = 200;
const PUBLIC_MENU_FALLBACK_LIMIT = 500;

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

export async function getPublicRestaurantDocs(slug?: string) {
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
    const docs = toPublicRestaurantDocs(snapshot.docs, slug);
    return docs.length ? docs : singleRestaurantFallback(slug);
  } catch (error) {
    if (!isMissingIndexError(error)) {
      return singleRestaurantFallback(slug);
    }

    return getPublicRestaurantDocsWithoutCompositeIndex(slug);
  }
}

async function getPublicRestaurantDocsWithoutCompositeIndex(slug?: string) {
  const restaurantsQuery = slug
    ? adminDb().collection("restaurants").where("slug", "==", slug).limit(PUBLIC_RESTAURANT_LIMIT)
    : adminDb().collection("restaurants").where("active", "==", true).limit(PUBLIC_RESTAURANT_LIMIT);

  const snapshot = await restaurantsQuery.get();
  const docs = toPublicRestaurantDocs(snapshot.docs, slug);
  return docs.length ? docs : singleRestaurantFallback(slug);
}

function singleRestaurantFallback(slug?: string) {
  if (slug && slug !== SINGLE_RESTAURANT_SLUG) return [];
  return [toPublicRestaurantDoc(createSingleRestaurantDoc())];
}

function toPublicRestaurantDocs(
  docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[],
  slug?: string,
) {
  return docs
    .map((item) => docToJson<RestaurantDoc>(item))
    .filter((item) => !item.isDeleted && item.active === true && (!slug || item.slug === slug))
    .sort((first, second) => first.name.localeCompare(second.name))
    .map(toPublicRestaurantDoc)
    .slice(0, slug ? 1 : PUBLIC_RESTAURANT_LIMIT);
}

export async function getPublicMenuDocs(restaurantId: string) {
  const tenantId = resolveTenantId(restaurantId);
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

    const docs = toPublicMenuDocs([...menusSnapshot.docs, ...menuItemsSnapshot.docs]);
    return docs.length ? docs : singleMenuFallback(restaurantId);
  } catch (error) {
    if (!isMissingIndexError(error)) {
      return singleMenuFallback(restaurantId);
    }

    return getPublicMenuDocsWithoutCompositeIndex(tenantId);
  }
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

  const docs = toPublicMenuDocs([...menusSnapshot.docs, ...menuItemsSnapshot.docs]);
  return docs.length ? docs : singleMenuFallback(tenantId);
}

function singleMenuFallback(restaurantId: string) {
  if (restaurantId !== SINGLE_RESTAURANT_SLUG && resolveTenantId(restaurantId) !== resolveTenantId(SINGLE_RESTAURANT_SLUG)) return [];
  return createSingleMenuDocs().map(toPublicMenuDoc);
}

function toPublicMenuDocs(
  docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[],
) {
  const publicDocs = docs
    .map((item) => docToJson<MenuDoc>(item))
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

export async function getPublicOfferDocs(restaurantId?: string) {
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
    return docs.length ? docs : createSingleOfferDocs().map(toPublicOfferDoc);
  } catch {
    return createSingleOfferDocs().map(toPublicOfferDoc);
  }
}

export async function getPublicReviewDocs(restaurantId: string, menuItemId?: string) {
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
    subscriptionId: undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(extra.approved !== undefined ? { approved: extra.approved } : {}),
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
  const category = (doc as MenuDoc & { category?: string }).category;
  return {
    id: doc.id,
    restaurantId: doc.restaurantId,
    categoryId: doc.categoryId,
    ...(category ? { category } : {}),
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
    dietaryLabels: doc.dietaryLabels,
    allergenLabels: doc.allergenLabels,
    scheduleIds: doc.scheduleIds,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  } as MenuDoc;
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
