"use client";

import type { AppCategory, MenuItem, Offer, Restaurant, Review } from "@/lib/types";
import type { AppCategoryDoc, MenuDoc, OfferDoc, RestaurantDoc } from "@/types/firebase";
import { sortOffers } from "@/lib/offer-engine";

export type PublicDataStatus = "idle" | "loading" | "success" | "error";
type Unsubscribe = () => void;

const FALLBACK_IMAGE = "/icons/sarva-icon.svg";
type PublicApiResponse<T> = { data?: T[]; error?: string };
type PublicReviewSummary = { averageRating: number; ratingCount: number };
type PublicReviewsResponse = { data?: Review[]; summary?: PublicReviewSummary; error?: string };
type PublicReviewsPayload = { data: Review[]; summary: PublicReviewSummary };
const inflightPublicRequests = new Map<string, Promise<unknown>>();
const publicResponseCache = new Map<string, unknown>();
const PUBLIC_FETCH_RETRIES = 2;

function publicApiUrl(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchPublicDocs<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T[]> {
  const url = publicApiUrl(path, params);
  const existing = inflightPublicRequests.get(url) as Promise<T[]> | undefined;
  if (existing) return existing;

  const request = fetchJsonWithRetry<PublicApiResponse<T>>(url)
    .then((payload) => Array.isArray(payload.data) ? payload.data : [])
    .then((items) => {
      publicResponseCache.set(url, items);
      return items;
    })
    .catch((error) => {
      const cached = publicResponseCache.get(url);
      if (Array.isArray(cached)) return cached as T[];
      throw error;
    })
    .finally(() => inflightPublicRequests.delete(url));

  inflightPublicRequests.set(url, request);
  return request;
}

async function fetchPublicRestaurants(slug?: string) {
  const docs = await fetchPublicDocs<RestaurantDoc>("/api/public/restaurants", { slug });
  return docs
    .filter((item) => !item.isDeleted)
    .map((item) => restaurantDocToUi(item))
    .filter((item) => item.approved !== false);
}

async function fetchPublicCategories() {
  const docs = await fetchPublicDocs<AppCategoryDoc>("/api/public/categories");
  return docs
    .filter((item) => item.active && !item.isDeleted)
    .map(categoryDocToUi)
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

async function fetchPublicMenu(restaurantId: string) {
  const docs = await fetchPublicDocs<MenuDoc>("/api/public/menu", { restaurantId });
  return docs
    .filter(isPublicMenuDoc)
    .map((item) => menuDocToUi(item.id, item))
    .filter((item) => !item.soldOut);
}

async function fetchPublicOffers(restaurantId?: string) {
  const docs = await fetchPublicDocs<OfferDoc>("/api/public/offers", { restaurantId });
  const remoteOffers = docs
    .filter((item) => item.active && !item.isDeleted)
    .map(offerDocToUi);
  return sortOffers(remoteOffers.filter((offer) => !restaurantId || offer.restaurantSlug === restaurantId));
}

async function fetchPublicReviews(restaurantId: string, menuItemId?: string): Promise<PublicReviewsPayload> {
  const url = publicApiUrl("/api/public/reviews", { restaurantId, menuItemId });
  const existing = inflightPublicRequests.get(url) as Promise<PublicReviewsPayload> | undefined;
  if (existing) return existing;

  const request = fetchJsonWithRetry<PublicReviewsResponse>(url)
    .then((payload) => {
      const next = {
        data: Array.isArray(payload.data) ? payload.data : [],
        summary: payload.summary ?? { averageRating: 0, ratingCount: 0 },
      };
      publicResponseCache.set(url, next);
      return next;
    })
    .catch((error) => {
      const cached = publicResponseCache.get(url);
      if (cached) return cached as PublicReviewsPayload;
      throw error;
    })
    .finally(() => inflightPublicRequests.delete(url));

  inflightPublicRequests.set(url, request);
  return request;
}

function warnPublicFallbackFailure(scope: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (isTransientFetchError(error)) return;
  console.warn(`[Sarva] ${scope} public API request failed; showing empty state.`, error);
}

async function fetchJsonWithRetry<T>(url: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PUBLIC_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "default",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Public data request failed with ${response.status}.`);
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (!isTransientFetchError(error) || attempt === PUBLIC_FETCH_RETRIES) break;
      await delay(250 * (attempt + 1));
    }
  }

  throw lastError;
}

function isTransientFetchError(error: unknown) {
  return error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message);
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function preloadPrimaryMenu(restaurants: Restaurant[]) {
  const primary = restaurants[0];
  if (!primary?.slug) return;
  void fetchPublicMenu(primary.slug).catch(() => undefined);
  void fetchPublicOffers(primary.slug).catch(() => undefined);
}

export function listenPublicRestaurants(
  onData: (restaurants: Restaurant[]) => void,
): Unsubscribe {
  let active = true;
  const deliver = (items: Restaurant[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicRestaurants()
    .then((items) => {
      deliver(items);
      preloadPrimaryMenu(items);
    })
    .catch((error) => {
      warnPublicFallbackFailure("restaurants", error);
      deliver([]);
    });

  return () => {
    active = false;
  };
}

export function listenPublicCategories(
  onData: (categories: AppCategory[]) => void,
): Unsubscribe {
  let active = true;
  const deliver = (items: AppCategory[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicCategories()
    .then(deliver)
    .catch((error) => {
      warnPublicFallbackFailure("categories", error);
      deliver([]);
    });

  return () => {
    active = false;
  };
}

export function listenPublicRestaurant(
  slug: string,
  onData: (restaurant: Restaurant | null) => void,
): Unsubscribe {
  let active = true;
  const deliver = (item: Restaurant | null) => {
    if (!active) return;
    onData(item);
  };

  void fetchPublicRestaurants(slug)
    .then((items) => deliver(items[0] ?? null))
    .catch((error) => {
      warnPublicFallbackFailure("restaurant", error);
      deliver(null);
    });

  return () => {
    active = false;
  };
}

export function listenPublicMenu(
  restaurantId: string,
  onData: (items: MenuItem[]) => void,
): Unsubscribe {
  let active = true;
  const deliver = (items: MenuItem[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicMenu(restaurantId)
    .then(deliver)
    .catch((error) => {
      warnPublicFallbackFailure("menu", error);
      deliver([]);
    });

  return () => {
    active = false;
  };
}

export function listenPublicOffers(
  restaurantId: string | undefined,
  onData: (offers: Offer[]) => void,
): Unsubscribe {
  let active = true;
  const deliver = (items: Offer[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicOffers(restaurantId)
    .then(deliver)
    .catch((error) => {
      warnPublicFallbackFailure("offers", error);
      deliver([]);
    });

  return () => {
    active = false;
  };
}

export function listenPublicReviews(
  restaurantId: string,
  onData: (payload: { reviews: Review[]; summary: { averageRating: number; ratingCount: number } }) => void,
  menuItemId?: string,
): Unsubscribe {
  let active = true;
  const deliver = (payload: { reviews: Review[]; summary: { averageRating: number; ratingCount: number } }) => {
    if (!active) return;
    onData(payload);
  };

  void fetchPublicReviews(restaurantId, menuItemId)
    .then((payload) => deliver({ reviews: payload.data, summary: payload.summary }))
    .catch((error) => {
      warnPublicFallbackFailure("reviews", error);
      deliver({ reviews: [], summary: { averageRating: 0, ratingCount: 0 } });
    });

  return () => {
    active = false;
  };
}

export function restaurantDocToUi(doc: RestaurantDoc): Restaurant {
  const extra = doc as RestaurantDoc & {
    rating?: number;
    deliveryTime?: string;
    etaMinutes?: number;
    priceForTwo?: number;
    reviewCount?: number;
    deliveryFee?: number;
    minPrice?: number;
    maxPrice?: number;
    foodTypes?: Restaurant["foodTypes"];
    popularItems?: string[];
    categoryTags?: string[];
    offerCodes?: string[];
    searchKeywords?: string[];
    tags?: string[];
    instagramHandle?: string;
  };
  const etaMinutes = typeof extra.etaMinutes === "number" ? extra.etaMinutes : undefined;
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    ownerId: doc.ownerId ?? doc.ownerIds?.[0],
    branchId: doc.branchId ?? doc.primaryBranchId,
    ownerIds: doc.ownerIds,
    name: doc.name,
    slug: doc.slug,
    cuisine: textList(doc.cuisine),
    location: doc.location || doc.address || "",
    rating: typeof extra.rating === "number" ? extra.rating : 0,
    deliveryTime: extra.deliveryTime || (etaMinutes ? `${etaMinutes}-${etaMinutes + 8} min` : ""),
    priceForTwo: typeof extra.priceForTwo === "number" ? extra.priceForTwo : 0,
    image: withCloudinaryAuto(doc.coverImagePath || doc.coverImagePaths?.[0] || doc.imagePath || FALLBACK_IMAGE),
    logo: withCloudinaryAuto(doc.logoPath || ""),
    coverImage: withCloudinaryAuto(doc.coverImagePath || doc.coverImagePaths?.[0] || doc.imagePath || ""),
    coverImages: (doc.coverImagePaths ?? [doc.coverImagePath || doc.imagePath || ""]).map(withCloudinaryAuto).filter(Boolean),
    isOpen: doc.active,
    tags: extra.tags?.length ? extra.tags : (doc.deliveryRadiusKm ? [`${doc.deliveryRadiusKm} km delivery`] : []),
    instagramHandle: extra.instagramHandle ?? "",
    latitude: doc.latitude,
    longitude: doc.longitude,
    deliveryRadiusKm: doc.deliveryRadiusKm,
    approved: doc.active && !doc.isDeleted,
    reviewCount: typeof extra.reviewCount === "number" ? extra.reviewCount : undefined,
    deliveryFee: typeof extra.deliveryFee === "number" ? extra.deliveryFee : undefined,
    minPrice: typeof extra.minPrice === "number" ? extra.minPrice : undefined,
    maxPrice: typeof extra.maxPrice === "number" ? extra.maxPrice : undefined,
    foodTypes: extra.foodTypes,
    popularItems: extra.popularItems,
    categoryTags: extra.categoryTags,
    offerCodes: extra.offerCodes,
    searchKeywords: extra.searchKeywords,
    address: doc.address || doc.location || "",
    googleMapLocation: doc.googleMapLocation,
    operatingHours: doc.operatingHours,
    operatingHoursSchedule: doc.operatingHoursSchedule,
    operatingHoursPreference: doc.operatingHoursPreference,
    gstDetails: doc.gstDetails,
    fssaiLicense: doc.fssaiLicense,
    diningAvailable: doc.diningAvailable,
    cloudKitchen: doc.cloudKitchen,
    contact: doc.contact,
    ownerProfile: doc.ownerProfile,
    deliverySettings: doc.deliverySettings,
    scheduling: doc.scheduling,
    advancedFeatures: doc.advancedFeatures,
  };
}

export function menuDocToUi(id: string, doc: MenuDoc): MenuItem {
  const deliveryPrice = doc.channelConfig?.delivery?.price ?? doc.deliveryPrice ?? doc.price;
  return {
    id: doc.id || id,
    restaurantSlug: doc.restaurantId,
    ownerId: doc.ownerId,
    name: doc.name,
    translations: doc.translations,
    category: (doc as MenuDoc & { category?: string }).category || doc.categoryId || "Menu",
    categoryId: doc.categoryId,
    subcategory: doc.subcategory,
    cuisineIds: doc.cuisineIds,
    description: doc.description || "",
    longDescription: doc.longDescription,
    price: deliveryPrice,
    dineInPrice: doc.dineInPrice,
    parcelPrice: doc.parcelPrice,
    deliveryPrice,
    taxRate: doc.taxRate,
    packingCharge: doc.packingCharge,
    image: withCloudinaryAuto(doc.imagePath || doc.imagePaths?.[0] || FALLBACK_IMAGE),
    images: doc.imagePaths?.map(withCloudinaryAuto),
    isVeg: doc.isVeg,
    foodType: doc.foodType,
    isPopular: (doc.tags ?? []).some((tag) => ["popular", "bestseller"].includes(tag.toLowerCase())),
    prepTime: "",
    dietaryLabels: doc.dietaryLabels,
    allergenLabels: doc.allergenLabels,
    tags: doc.tags,
    badges: doc.badges,
    searchKeywords: doc.searchKeywords,
    soldOut: !doc.available || doc.isDeleted || doc.channelConfig?.delivery?.available === false,
    menuVisibility: doc.menuVisibility,
    scheduleIds: doc.scheduleIds,
    recipeLinks: doc.recipeLinks,
  };
}

export function categoryDocToUi(doc: AppCategoryDoc): AppCategory {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    image: withCloudinaryAuto(doc.imagePath || (doc as AppCategoryDoc & { image?: string }).image || ""),
    icon: doc.icon,
    sortOrder: doc.sortOrder,
    active: doc.active,
    colorTheme: doc.colorTheme,
    createdAt: firestoreDateToIso(doc.createdAt),
    updatedAt: firestoreDateToIso(doc.updatedAt),
  };
}

function withCloudinaryAuto(url: string) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto") || /\/upload\/[^/]*q_auto/.test(url)) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

export function offerDocToUi(doc: OfferDoc): Offer {
  return {
    code: doc.code,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description ?? doc.title,
    discount: doc.discountValue,
    minimumOrder: doc.minimumOrder ?? 0,
    channel: "Web",
    restaurantSlug: doc.restaurantId,
    discountType: doc.discountType,
    offerType: doc.offerType,
    validFrom: firestoreDateToIso(doc.startsAt),
    validTo: firestoreDateToIso(doc.endsAt),
    startTime: doc.startTime,
    endTime: doc.endTime,
    daysOfWeek: doc.daysOfWeek,
    promoTag: doc.promoTag,
    banner: doc.banner,
    mobileBanner: doc.mobileBanner,
    maxDiscount: doc.maxDiscount,
    applicableCategories: doc.applicableCategories,
    applicableItemIds: doc.applicableItemIds,
    appliesTo: doc.appliesTo ?? ["delivery", "dine-in", "takeaway"],
    newCustomersOnly: doc.newCustomersOnly,
    usageLimit: doc.usageLimit,
    perUserLimit: doc.perUserLimit,
    status: doc.status ?? (doc.active ? "active" : "inactive"),
    showOnHomepage: doc.showOnHomepage,
    showOnRestaurantPage: doc.showOnRestaurantPage,
    featured: doc.featured,
    priority: doc.priority,
    sponsored: doc.sponsored,
    sponsoredPriority: doc.sponsoredPriority,
    adBudget: doc.adBudget,
    campaignStatus: doc.campaignStatus,
    conditions: doc.conditions,
  };
}

function isPublicMenuDoc(doc: Partial<MenuDoc>): doc is MenuDoc {
  return Boolean(
    doc &&
      !doc.isDeleted &&
      doc.available !== false &&
      doc.menuVisibility?.delivery !== false &&
      doc.channelConfig?.delivery?.visible !== false &&
      doc.channelConfig?.delivery?.available !== false &&
      typeof doc.name === "string" &&
      typeof doc.price === "number" &&
      typeof doc.restaurantId === "string",
  );
}

function firestoreDateToIso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: () => Date };
  return typeof maybeTimestamp.toDate === "function" ? maybeTimestamp.toDate().toISOString() : undefined;
}

function textList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item))
      .filter(Boolean)
      .join(", ");
  }
  return typeof value === "string" ? value : "";
}
