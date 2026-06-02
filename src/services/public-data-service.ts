"use client";

import type { AppCategory, AppCuisine, CmsSettings, MenuItem, Offer, Restaurant, Review } from "@/lib/types";
import type { AppCategoryDoc, AppCuisineDoc, MenuDoc, OfferDoc, RestaurantDoc } from "@/types/firebase";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { readCachedPublicCmsSettings, writeCachedPublicCmsSettings } from "@/lib/public-cms-cache";
import { sortOffers } from "@/lib/offer-engine";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";

export type PublicDataStatus = "idle" | "loading" | "success" | "error";
type Unsubscribe = () => void;

const FALLBACK_IMAGE = "/icons/sarva-icon.svg";
type PublicApiResponse<T> = { data?: T[]; error?: string };
type PublicSingleResponse<T> = { data?: T; error?: string };
type PublicReviewSummary = { averageRating: number; ratingCount: number };
type PublicReviewsResponse = { data?: Review[]; summary?: PublicReviewSummary; error?: string };
type PublicReviewsPayload = { data: Review[]; summary: PublicReviewSummary };
const inflightPublicRequests = new Map<string, Promise<unknown>>();
const publicResponseCache = new Map<string, { value: unknown; expiresAt: number }>();
const PUBLIC_FETCH_RETRIES = 2;
const PUBLIC_RESPONSE_CACHE_TTL_MS = 60 * 1000;
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

function publicApiUrl(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function isPublicRestaurantListable(doc: RestaurantDoc) {
  const extra = doc as RestaurantDoc & { approved?: boolean; profileComplete?: boolean; publicListingEnabled?: boolean; phone?: string };
  if (extra.approved === false || extra.profileComplete === false || extra.publicListingEnabled === false) return false;
  const hasLocation = Boolean((typeof doc.latitude === "number" && typeof doc.longitude === "number") || doc.googleMapLocation);
  const hasAddress = Boolean((doc.address || doc.location)?.trim());
  const hasCuisine = Boolean(textList(doc.cuisine));
  const hasMedia = Boolean(doc.coverImagePath || doc.coverImagePaths?.length || doc.imagePath || doc.logoPath);
  const hasContact = Boolean(doc.contact?.phone || doc.ownerProfile?.businessPhone || extra.phone);
  return Boolean(doc.active && !doc.isDeleted && doc.name?.trim() && hasAddress && hasLocation && hasCuisine && hasMedia && hasContact && doc.deliveryRadiusKm);
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
      writeMemoryCache(url, items);
      return items;
    })
    .catch((error) => {
      const cached = readMemoryCache<T[]>(url);
      if (Array.isArray(cached)) return cached;
      throw error;
    })
    .finally(() => inflightPublicRequests.delete(url));

  inflightPublicRequests.set(url, request);
  return request;
}

async function fetchPublicRestaurants(slug?: string) {
  const docs = await fetchPublicDocs<RestaurantDoc>("/api/public/restaurants", { slug });
  return docs
    .filter(isPublicRestaurantListable)
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

async function fetchPublicCuisines() {
  const docs = await fetchPublicDocs<AppCuisineDoc>("/api/public/cuisines");
  return docs
    .filter((item) => item.active && !item.isDeleted)
    .map(cuisineDocToUi)
    .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
}

async function fetchPublicCms() {
  const url = publicApiUrl("/api/public/cms");
  const existing = inflightPublicRequests.get(url) as Promise<CmsSettings> | undefined;
  if (existing) return existing;

  const request = fetchJsonWithRetry<PublicSingleResponse<CmsSettings>>(url)
    .then((payload) => {
      const settings = resolveCmsSettings(payload.data);
      writeMemoryCache(url, settings, 5 * 60 * 1000);
      writeCachedPublicCmsSettings(settings);
      return settings;
    })
    .catch((error) => {
      const cached = readMemoryCache<CmsSettings>(url);
      if (cached) return cached as CmsSettings;
      const persisted = readCachedPublicCmsSettings();
      if (persisted) return persisted;
      throw error;
    })
    .finally(() => inflightPublicRequests.delete(url));

  inflightPublicRequests.set(url, request);
  return request;
}

async function fetchPublicMenu(restaurantId: string) {
  const docs = await fetchPublicDocs<MenuDoc>("/api/public/menu", { restaurantId });
  return docs
    .filter(isPublicMenuDoc)
    .filter((item) => !isLegacySeededPublicMenuDoc(item))
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
      writeMemoryCache(url, next);
      return next;
    })
    .catch((error) => {
      const cached = readMemoryCache<PublicReviewsPayload>(url);
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
  options: { preloadPrimaryMenu?: boolean; onError?: (error: unknown) => void } = {},
): Unsubscribe {
  let active = true;
  const deliver = (items: Restaurant[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicRestaurants()
    .then((items) => {
      deliver(items);
      if (options.preloadPrimaryMenu) preloadPrimaryMenu(items);
    })
    .catch((error) => {
      warnPublicFallbackFailure("restaurants", error);
      if (active) options.onError?.(error);
    });

  return () => {
    active = false;
  };
}

function readMemoryCache<T>(key: string): T | undefined {
  const cached = publicResponseCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    publicResponseCache.delete(key);
    return undefined;
  }
  return cached.value as T;
}

function writeMemoryCache(key: string, value: unknown, ttlMs = PUBLIC_RESPONSE_CACHE_TTL_MS) {
  publicResponseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
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

export function listenPublicCuisines(
  onData: (cuisines: AppCuisine[]) => void,
): Unsubscribe {
  let active = true;
  const deliver = (items: AppCuisine[]) => {
    if (!active) return;
    onData(items);
  };

  void fetchPublicCuisines()
    .then(deliver)
    .catch((error) => {
      warnPublicFallbackFailure("cuisines", error);
      deliver([]);
    });

  return () => {
    active = false;
  };
}

export function listenPublicCms(
  onData: (settings: CmsSettings) => void,
): Unsubscribe {
  let active = true;
  const deliver = (settings: CmsSettings) => {
    if (!active) return;
    onData(settings);
  };

  const cached = readCachedPublicCmsSettings();
  if (cached) deliver(cached);

  void fetchPublicCms()
    .then(deliver)
    .catch((error) => {
      warnPublicFallbackFailure("cms", error);
      deliver(defaultCmsSettings);
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
  const coverImagePaths = Array.from(new Set(
    (doc.coverImagePaths ?? [doc.coverImagePath || doc.imagePath || ""])
      .filter((value): value is string => Boolean(value) && value !== doc.logoPath),
  ));
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
    coverImages: coverImagePaths.map(withCloudinaryAuto).filter(Boolean),
    isOpen: doc.active,
    tags: extra.tags?.length ? extra.tags : (doc.deliveryRadiusKm ? [`${doc.deliveryRadiusKm} km delivery`] : []),
    instagramHandle: extra.instagramHandle ?? "",
    latitude: doc.latitude,
    longitude: doc.longitude,
    deliveryRadiusKm: doc.deliveryRadiusKm,
    approved: isPublicRestaurantListable(doc),
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
    prepTime: doc.prepTime ?? "",
    calories: doc.calories,
    spiceLevel: doc.spiceLevel,
    averageRating: doc.averageRating,
    reviewCount: doc.reviewCount,
    dietaryLabels: doc.dietaryLabels,
    allergenLabels: doc.allergenLabels,
    tags: doc.tags,
    badges: doc.badges,
    searchKeywords: doc.searchKeywords,
    soldOut: !doc.available || doc.isDeleted || doc.channelConfig?.delivery?.available === false,
    modifiers: doc.modifiers,
    addOns: doc.addOns,
    variantGroups: doc.variantGroups,
    modifierGroups: doc.modifierGroups,
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

export function cuisineDocToUi(doc: AppCuisineDoc): AppCuisine {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    image: withCloudinaryAuto(doc.imagePath || (doc as AppCuisineDoc & { image?: string }).image || ""),
    icon: doc.icon,
    color: doc.color,
    sortOrder: doc.sortOrder,
    active: doc.active,
    description: doc.description,
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
      isVisibleOnCustomerMenuChannel(doc) &&
      typeof doc.name === "string" &&
      typeof doc.price === "number" &&
      typeof doc.restaurantId === "string",
  );
}

function isLegacySeededPublicMenuDoc(doc: MenuDoc) {
  return doc.restaurantId === "cafe-al-arab-thanisandra" && LEGACY_SEEDED_PUBLIC_MENU_IDS.has(doc.id);
}

function isVisibleOnCustomerMenuChannel(doc: Partial<MenuDoc>) {
  return (["delivery", "parcel", "dine-in"] as const).some((channel) =>
    doc.menuVisibility?.[channel] !== false &&
    doc.channelConfig?.[channel]?.visible !== false &&
    doc.channelConfig?.[channel]?.available !== false,
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
