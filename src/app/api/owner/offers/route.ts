import { NextResponse, type NextRequest } from "next/server";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import { getSessionFromRequest } from "@/lib/server-auth";
import { OfferRepository } from "@/repositories/offer-repository";
import { tenantScope } from "@/repositories/shared";
import type { Offer } from "@/lib/types";
import type { UserRole } from "@/types/firebase";

const ownerSaveRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "accountant",
]);

type OfferRequest = {
  offer?: Offer;
  restaurantId?: string;
};
type OfferChannel = "dine-in" | "delivery" | "parcel" | "takeaway";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !ownerSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to load offers." }, { status: 403 });
  }

  const restaurantId = request.nextUrl.searchParams.get("restaurantId") || session.tenantId || DEFAULT_RESTAURANT_ID;
  try {
    assertRestaurantAccess(session, restaurantId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restaurant access is not configured." },
      { status: 403 },
    );
  }

  const offers = (await new OfferRepository().list(tenantScope(session, restaurantId)))
    .map((doc) => ownerOfferFromDoc(String(doc.id), doc as FirebaseFirestore.DocumentData))
    .filter((offer) => offer.code && offer.restaurantSlug === restaurantId);

  return NextResponse.json({
    data: Array.from(new Map(offers.map((offer) => [offer.code, offer])).values()),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !ownerSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to save offers." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as OfferRequest;
  const offer = body.offer;
  const code = offer?.code?.trim().toUpperCase();
  if (!offer || !code) {
    return NextResponse.json({ error: "Offer code is required." }, { status: 400 });
  }

  const restaurantId = body.restaurantId || offer.restaurantSlug || session.tenantId || DEFAULT_RESTAURANT_ID;
  try {
    assertRestaurantAccess(session, restaurantId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restaurant access is not configured." },
      { status: 403 },
    );
  }

  const data = await new OfferRepository().upsert(tenantScope(session, restaurantId), sanitize({
    ...offer,
    id: code,
    code,
    discountValue: offer.discount,
    restaurantSlug: restaurantId,
    restaurantId,
    tenantId: resolveTenantId(restaurantId),
    branchId: session.branchIds[0] ?? DEFAULT_BRANCH_ID,
    active: (offer.status ?? "active") === "active",
    status: offer.status ?? "active",
    discountType: offer.discountType ?? (offer.offerType === "flat" ? "flat" : offer.offerType === "free-delivery" ? "free-delivery" : "percentage"),
    startsAt: offer.validFrom,
    endsAt: offer.validTo,
    updatedBy: session.uid,
    createdBy: session.uid,
    isDeleted: false,
  }));

  return NextResponse.json({ ok: true, code, data: ownerOfferFromDoc(code, data) });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !ownerSaveRoles.has(session.role)) {
    return NextResponse.json({ error: "Owner access is required to delete offers." }, { status: 403 });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Offer code is required." }, { status: 400 });
  }

  const restaurantId = request.nextUrl.searchParams.get("restaurantId") || session.tenantId || DEFAULT_RESTAURANT_ID;
  const data = await new OfferRepository().delete(tenantScope(session, restaurantId), code);
  return NextResponse.json({ ok: true, code, data });
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

function ownerOfferFromDoc(id: string, input: FirebaseFirestore.DocumentData): Offer {
  const doc = input as Record<string, unknown>;
  const code = String(doc.code ?? id).trim().toUpperCase();
  const discount = Number(doc.discount ?? doc.discountValue ?? 0);
  const offerType = offerTypeValue(doc.offerType, doc.discountType);
  return {
    code,
    title: String(doc.title ?? code),
    subtitle: stringValue(doc.subtitle),
    description: stringValue(doc.description) ?? String(doc.title ?? code),
    discount,
    minimumOrder: Number(doc.minimumOrder ?? 0),
    maxDiscount: numberValue(doc.maxDiscount),
    channel: "Web",
    restaurantSlug: String(doc.restaurantSlug ?? doc.restaurantId ?? doc.tenantId ?? DEFAULT_RESTAURANT_ID),
    restaurantName: stringValue(doc.restaurantName),
    validity: stringValue(doc.validity),
    category: stringValue(doc.category),
    banner: stringValue(doc.banner),
    mobileBanner: stringValue(doc.mobileBanner),
    promoTag: stringValue(doc.promoTag),
    appliesTo: arrayValue<OfferChannel>(doc.appliesTo) ?? ["delivery"],
    discountType: discountTypeValue(doc.discountType, offerType),
    offerType,
    validFrom: dateToIso(doc.validFrom ?? doc.startsAt),
    validTo: dateToIso(doc.validTo ?? doc.endsAt),
    startTime: stringValue(doc.startTime),
    endTime: stringValue(doc.endTime),
    daysOfWeek: arrayValue<string>(doc.daysOfWeek) ?? [],
    applicableCategories: arrayValue<string>(doc.applicableCategories) ?? [],
    applicableItemIds: arrayValue<string>(doc.applicableItemIds) ?? [],
    newCustomersOnly: Boolean(doc.newCustomersOnly),
    usageLimit: numberValue(doc.usageLimit),
    perUserLimit: numberValue(doc.perUserLimit),
    status: statusValue(doc.status, doc.active),
    showOnHomepage: doc.showOnHomepage !== false,
    showOnRestaurantPage: doc.showOnRestaurantPage !== false,
    featured: Boolean(doc.featured),
    priority: Number(doc.priority ?? 0),
    sponsored: Boolean(doc.sponsored),
    sponsoredPriority: Number(doc.sponsoredPriority ?? 0),
    adBudget: numberValue(doc.adBudget),
    campaignStatus: campaignStatusValue(doc.campaignStatus),
    conditions: stringValue(doc.conditions),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function arrayValue<T extends string>(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is T => typeof item === "string") : undefined;
}

function dateToIso(value: unknown) {
  return parseFirestoreDateIso(value);
}

function offerTypeValue(value: unknown, discountType: unknown): NonNullable<Offer["offerType"]> {
  const candidate = typeof value === "string" ? value : typeof discountType === "string" ? discountType : "percentage";
  if (["flat", "percentage", "free-delivery", "buy-x-get-y", "combo", "festival", "first-order", "bulk", "catering", "happy-hour"].includes(candidate)) {
    return candidate as NonNullable<Offer["offerType"]>;
  }
  return "percentage";
}

function discountTypeValue(value: unknown, offerType: NonNullable<Offer["offerType"]>): NonNullable<Offer["discountType"]> {
  const candidate = typeof value === "string" ? value : offerType;
  if (["flat", "percentage", "free-delivery", "buy-x-get-y", "combo"].includes(candidate)) {
    return candidate as NonNullable<Offer["discountType"]>;
  }
  return "percentage";
}

function statusValue(value: unknown, active: unknown): NonNullable<Offer["status"]> {
  if (value === "paused" || value === "inactive") return value;
  return active === false ? "inactive" : "active";
}

function campaignStatusValue(value: unknown): Offer["campaignStatus"] {
  if (["draft", "scheduled", "active", "paused", "ended"].includes(String(value))) {
    return value as Offer["campaignStatus"];
  }
  return "active";
}
