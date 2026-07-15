import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { cloudinaryThumbnailUrl } from "@/lib/cloudinary-images";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { OwnerBusinessProfile, Restaurant, RestaurantBranch } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

const profileSaveRoles = new Set<UserRole>(["owner", "manager"]);
const CAFE_AL_ARAB_OWNER_EMAIL = "divakdi@gmail.com";

type ProfileRequest = {
  profile?: OwnerBusinessProfile;
  restaurant?: Restaurant;
  branch?: RestaurantBranch;
};

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !profileSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to save the business profile." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as ProfileRequest;
  if (!body.profile || !body.restaurant || !body.branch) {
    return NextResponse.json({ error: "Profile, restaurant, and branch data are required." }, { status: 400 });
  }

  const launchCafeAlArabOwner = await isCafeAlArabLaunchOwner(session, body);
  const restaurantId = launchCafeAlArabOwner ? DEFAULT_RESTAURANT_ID : body.restaurant.slug || session.tenantId || DEFAULT_RESTAURANT_ID;
  try {
    assertRestaurantAccess(session, restaurantId);
  } catch {
    return NextResponse.json({ error: "Restaurant access is not configured." }, { status: 403 });
  }

  const tenantId = resolveTenantId(restaurantId);
  const branchId = launchCafeAlArabOwner ? DEFAULT_BRANCH_ID : body.branch.id || session.branchIds[0] || DEFAULT_BRANCH_ID;
  const profileComplete = isPublicProfileComplete(body.profile);
  const restaurantName = body.profile.hotelName || body.restaurant.name;
  const duplicate = await findDuplicateRestaurantNameForOwner(session.uid, restaurantName, restaurantId);
  if (duplicate && !launchCafeAlArabOwner) {
    return NextResponse.json(
      { error: `Restaurant name already exists for this owner: ${duplicate.name}.` },
      { status: 409 },
    );
  }
  const configuredCoverImagePaths = [
    ...(body.profile.coverImages ?? []),
    body.profile.coverImage,
  ].filter((value): value is string => Boolean(value));
  const coverImagePaths = configuredCoverImagePaths;
  const bannerImages = Array.from(new Set(coverImagePaths)).slice(0, 5);
  const thumbnailImages = bannerImages.map(toRestaurantThumbnailUrl);
  const restaurantPayload = sanitize({
    ...body.restaurant,
    id: restaurantId,
    slug: restaurantId,
    name: body.profile.hotelName || body.restaurant.name,
    displayName: body.profile.hotelName || body.restaurant.displayName,
    imagePath: body.profile.coverImage || body.profile.logo || body.restaurant.image,
    logoPath: body.profile.logo,
    coverImagePath: bannerImages[0] || body.profile.logo || body.restaurant.image,
    coverImagePaths: bannerImages,
    bannerImages,
    thumbnailImages,
    activeBannerThumbnails: thumbnailImages,
    primaryThumbnail: thumbnailImages[0] ?? "",
    address: body.profile.businessAddress || body.restaurant.address || body.restaurant.location,
    location: body.profile.businessAddress || body.restaurant.location,
    googleMapLocation: body.profile.googleMapLocation,
    latitude: body.profile.latitude,
    longitude: body.profile.longitude,
    deliveryRadiusKm: body.profile.deliveryRadiusKm,
    operatingHours: body.profile.operatingHours,
    operatingHoursSchedule: body.profile.operatingHoursSchedule,
    operatingHoursPreference: body.profile.operatingHoursPreference,
    gstDetails: body.profile.gstDetails,
    fssaiLicense: body.profile.fssaiLicense,
    diningAvailable: body.profile.diningAvailable,
    cloudKitchen: body.profile.cloudKitchen,
    minPrice: body.profile.minimumOrder ?? body.restaurant.minPrice,
    deliverySettings: {
      ...body.restaurant.deliverySettings,
      radiusKm: body.profile.deliveryRadiusKm,
      baseFee: body.profile.deliveryCharge ?? body.restaurant.deliverySettings?.baseFee ?? 0,
      freeDeliveryAbove: body.profile.freeDeliveryThreshold ?? body.restaurant.deliverySettings?.freeDeliveryAbove,
    },
    ownerId: body.restaurant.ownerId || session.uid,
    ownerIds: Array.from(new Set([...(body.restaurant.ownerIds ?? []), session.uid])),
    tenantId,
    branchId,
    primaryBranchId: branchId,
    active: profileComplete,
    approved: profileComplete ? (body.restaurant.approved ?? true) : false,
    profileComplete,
    publicListingEnabled: profileComplete,
    orderingEnabled: true,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
    isDeleted: false,
  });
  const branchPayload = sanitize({
    ...body.branch,
    id: branchId,
    tenantId,
    restaurantSlug: restaurantId,
    name: body.branch.name || body.profile.hotelName,
    address: body.profile.businessAddress || body.branch.address,
    phone: body.profile.phoneNumber || body.branch.phone,
    latitude: body.profile.latitude,
    longitude: body.profile.longitude,
    deliveryRadiusKm: body.profile.deliveryRadiusKm,
    managerId: body.branch.managerId || session.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
    isDeleted: false,
  });
  const profilePayload = sanitize({
    ...body.profile,
    thumbnailImages,
    id: session.uid,
    ownerId: session.uid,
    tenantId,
    restaurantId,
    branchId,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  });

  await Promise.all([
    adminDb().collection("restaurants").doc(restaurantId).set(restaurantPayload, { merge: true }),
    adminDb().collection("branches").doc(branchId).set(branchPayload, { merge: true }),
    adminDb().collection("ownerProfiles").doc(session.uid).set(profilePayload, { merge: true }),
    adminDb().collection("users").doc(session.uid).set(sanitize({
      displayName: body.profile.ownerName || body.profile.hotelName,
      tenantId,
      tenantIds: [tenantId],
      restaurantIds: [restaurantId],
      branchIds: [branchId],
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    }), { merge: true }),
    launchCafeAlArabOwner ? retireDuplicateCafeAlArabRestaurantsForOwner(session.uid, restaurantName, restaurantId) : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, restaurantId, branchId });
}

function toRestaurantThumbnailUrl(url: string) {
  return cloudinaryThumbnailUrl(url);
}

async function findDuplicateRestaurantNameForOwner(ownerId: string, name: string, currentRestaurantId: string) {
  const duplicate = (await findDuplicateRestaurantDocsForOwner(ownerId, name, currentRestaurantId))[0];
  return duplicate ? { id: duplicate.id, name: duplicate.name || duplicate.displayName || duplicate.id } : null;
}

async function findDuplicateRestaurantDocsForOwner(ownerId: string, name: string, currentRestaurantId: string) {
  const normalizedName = normalizeRestaurantName(name);
  if (!ownerId || !normalizedName) return [];

  const snapshot = await adminDb()
    .collection("restaurants")
    .where("ownerIds", "array-contains", ownerId)
    .limit(25)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; name?: string; displayName?: string; active?: boolean; isDeleted?: boolean }))
    .filter((doc) =>
      doc.id !== currentRestaurantId &&
      doc.active !== false &&
      !doc.isDeleted &&
      normalizeRestaurantName(doc.name || doc.displayName || "") === normalizedName
    );
}

async function retireDuplicateCafeAlArabRestaurantsForOwner(ownerId: string, name: string, currentRestaurantId: string) {
  const duplicates = (await findDuplicateRestaurantDocsForOwner(ownerId, name, currentRestaurantId))
    .filter((doc) => isCafeAlArabName(doc.name || doc.displayName || doc.id));
  if (!duplicates.length) return;

  const batch = adminDb().batch();
  duplicates.forEach((doc) => {
    batch.set(adminDb().collection("restaurants").doc(doc.id), {
      active: false,
      approved: false,
      publicListingEnabled: false,
      isDeleted: true,
      mergedIntoRestaurantId: currentRestaurantId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: ownerId,
    }, { merge: true });
  });
  await batch.commit();
}

function normalizeRestaurantName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function isCafeAlArabLaunchOwner(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  body: ProfileRequest,
) {
  const profile = (body.profile ?? {}) as OwnerBusinessProfile & Record<string, unknown>;
  const directIdentityValues = [
    session.uid,
    profile.ownerEmail,
    profile.businessEmail,
    profile.supportEmail,
    profile.cateringEmail,
    profile.email,
  ];
  if (directIdentityValues.some((value) => normalizeEmail(value) === CAFE_AL_ARAB_OWNER_EMAIL)) return true;

  const linkedToLaunchTenant =
    session.tenantId === DEFAULT_RESTAURANT_ID ||
    session.tenantIds.includes(DEFAULT_RESTAURANT_ID) ||
    session.restaurantIds.includes(DEFAULT_RESTAURANT_ID);
  if (linkedToLaunchTenant && isCafeAlArabName(profile.hotelName || body.restaurant?.name || body.restaurant?.displayName || "")) return true;

  const userSnapshot = await adminDb().collection("users").doc(session.uid).get().catch(() => null);
  const user = userSnapshot?.data() as Record<string, unknown> | undefined;
  return normalizeEmail(user?.email) === CAFE_AL_ARAB_OWNER_EMAIL;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isCafeAlArabName(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase().replace(/[-_]+/g, " ").includes("cafe al arab");
}

function assertRestaurantAccess(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  restaurantId: string,
) {
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean));
  const hasCafeAlArabAliasAccess = isCafeAlArabName(restaurantId) && Array.from(allowed).some(isCafeAlArabName);
  if (allowed.size && !allowed.has(restaurantId) && !allowed.has(resolveTenantId(restaurantId)) && !hasCafeAlArabAliasAccess) {
    throw new Error(`Access setup required: this user is not linked to restaurant ${restaurantId}.`);
  }
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isPublicProfileComplete(profile: OwnerBusinessProfile) {
  const hasLocation = Boolean((typeof profile.latitude === "number" && typeof profile.longitude === "number") || profile.googleMapLocation);
  const hasHours = profile.operatingHoursPreference === "specified" && Boolean(profile.operatingHoursSchedule?.some((day) => day.open && day.slots.length));
  const hasCuisine = Boolean(profile.cuisineTypes?.length || profile.cuisineType?.trim());
  const hasMedia = Boolean(profile.logo || profile.coverImage || profile.coverImages?.length);
  return Boolean(
    profile.hotelName?.trim() &&
    profile.phoneNumber?.trim() &&
    profile.businessAddress?.trim() &&
    hasLocation &&
    hasHours &&
    hasCuisine &&
    hasMedia &&
    profile.deliveryRadiusKm > 0,
  );
}
