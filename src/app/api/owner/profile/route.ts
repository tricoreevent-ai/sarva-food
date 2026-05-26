import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { OwnerBusinessProfile, Restaurant, RestaurantBranch } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

const profileSaveRoles = new Set<UserRole>(["owner", "manager"]);

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

  const restaurantId = body.restaurant.slug || session.tenantId || DEFAULT_RESTAURANT_ID;
  try {
    assertRestaurantAccess(session, restaurantId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restaurant access is not configured." },
      { status: 403 },
    );
  }

  const tenantId = resolveTenantId(restaurantId);
  const branchId = body.branch.id || session.branchIds[0] || DEFAULT_BRANCH_ID;
  const coverImagePaths = [
    ...(body.profile.coverImages ?? []),
    body.profile.coverImage,
    body.profile.logo,
    body.restaurant.image,
  ].filter((value): value is string => Boolean(value));
  const restaurantPayload = sanitize({
    ...body.restaurant,
    id: restaurantId,
    slug: restaurantId,
    name: body.profile.hotelName || body.restaurant.name,
    displayName: body.profile.hotelName || body.restaurant.displayName,
    imagePath: body.profile.coverImage || body.profile.logo || body.restaurant.image,
    logoPath: body.profile.logo,
    coverImagePath: body.profile.coverImage || body.profile.logo || body.restaurant.image,
    coverImagePaths: Array.from(new Set(coverImagePaths)),
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
  ]);

  return NextResponse.json({ ok: true, restaurantId, branchId });
}

function assertRestaurantAccess(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  restaurantId: string,
) {
  const allowed = new Set([session.tenantId, ...session.tenantIds, ...session.restaurantIds].filter(Boolean));
  if (allowed.size && !allowed.has(restaurantId) && !allowed.has(resolveTenantId(restaurantId))) {
    throw new Error(`Access setup required: this user is not linked to restaurant ${restaurantId}.`);
  }
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
