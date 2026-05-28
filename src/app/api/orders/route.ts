import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import type { OfferDoc, OrderDoc, OrderLineDoc, RestaurantDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreateOrderBody = {
  restaurantId?: string;
  fulfillmentType?: "delivery" | "parcel" | "dine-in";
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: string;
  guestCount?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryGeo?: { lat?: number; lng?: number };
  deliveryPlaceId?: string;
  deliveryAddressLabel?: string;
  lines?: OrderLineDoc[];
  offerCode?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  deliveryFee?: number;
  total?: number;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateOrderBody;
    const restaurantId = body.restaurantId ? resolveTenantId(body.restaurantId) : "";
    const fulfillmentType = body.fulfillmentType ?? "delivery";
    const scheduleMode = body.scheduleMode ?? "now";
    const scheduledFor = parseScheduledFor(body.scheduledFor);
    const lines = Array.isArray(body.lines) ? body.lines.filter(isValidLine) : [];
    const deliveryGeo = body.deliveryGeo;
    const hasCoordinates = typeof deliveryGeo?.lat === "number" && typeof deliveryGeo.lng === "number";

    if (!restaurantId || !lines.length || !body.customerName?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json({ ok: false, error: "Restaurant, customer, and order lines are required." }, { status: 400 });
    }
    if (fulfillmentType === "delivery" && !hasCoordinates) {
      return NextResponse.json({ ok: false, error: "Delivery coordinates are required." }, { status: 400 });
    }
    if (fulfillmentType === "delivery" && !body.deliveryAddress?.trim()) {
      return NextResponse.json({ ok: false, error: "Delivery address is required." }, { status: 400 });
    }
    if (scheduleMode === "scheduled" && !scheduledFor) {
      return NextResponse.json({ ok: false, error: "A valid scheduled date and time is required." }, { status: 400 });
    }

    const restaurantSnapshot = await adminDb().collection("restaurants").doc(restaurantId).get();
    if (!restaurantSnapshot.exists) {
      return NextResponse.json({ ok: false, error: "Restaurant is not available." }, { status: 404 });
    }

    const restaurant = { id: restaurantSnapshot.id, ...restaurantSnapshot.data() } as RestaurantDoc;
    if (!restaurant.active || (fulfillmentType === "delivery" && (typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number"))) {
      return NextResponse.json({ ok: false, error: "Restaurant is not accepting delivery orders." }, { status: 409 });
    }

    const deliveryPoint = hasCoordinates ? { lat: deliveryGeo.lat as number, lng: deliveryGeo.lng as number } : undefined;
    const distanceKm = fulfillmentType === "delivery" && deliveryPoint
      ? haversineKm(
          deliveryPoint,
          { lat: restaurant.latitude as number, lng: restaurant.longitude as number },
        )
      : 0;
    const deliveryRadiusKm = restaurant.deliveryRadiusKm ?? 0;
    if (fulfillmentType === "delivery" && (!deliveryRadiusKm || distanceKm > deliveryRadiusKm)) {
      return NextResponse.json({
        ok: false,
        error: "This address is outside the restaurant delivery radius.",
        distanceKm,
        deliveryRadiusKm,
      }, { status: 422 });
    }

    const schedule = await validateSchedule({
      scheduledFor,
      scheduleMode,
      fulfillmentType,
      restaurant,
      restaurantId,
      lineCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    });
    if (!schedule.ok) {
      return NextResponse.json({ ok: false, error: schedule.error }, { status: 422 });
    }

    const now = new Date();
    const orderRef = adminDb().collection("orders").doc();
    const deliveryAddress = fulfillmentType === "delivery" ? body.deliveryAddress?.trim() : undefined;
    const deliveryPlaceId = body.deliveryPlaceId?.trim();
    const offerCode = body.offerCode?.trim().toUpperCase();
    const subtotal = money(body.subtotal);
    const offerValidation = await validateOffer({ restaurantId, offerCode, subtotal, fulfillmentType });
    if (!offerValidation.ok) {
      return NextResponse.json({ ok: false, error: offerValidation.error }, { status: 422 });
    }
    const discount = offerValidation.discount ?? money(body.discount);
    const tax = money(body.tax);
    const deliveryFee = offerValidation.freeDelivery ? 0 : money(body.deliveryFee);
    const total = Math.max(0, money(subtotal - discount + deliveryFee + tax));
    const order = stripUndefined({
      id: orderRef.id,
      tenantId: restaurant.tenantId ?? restaurantId,
      restaurantId,
      branchId: restaurant.branchId ?? restaurant.primaryBranchId,
      customerId: session.uid,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone.trim(),
      ...(deliveryAddress ? { deliveryAddress } : {}),
      ...(fulfillmentType === "delivery" && deliveryPoint ? { deliveryGeo: deliveryPoint } : {}),
      deliveryAddressLabel: fulfillmentType === "delivery" ? body.deliveryAddressLabel?.trim() || "Delivery" : undefined,
      channel: "web",
      status: "new",
      lines,
      subtotal,
      discount,
      tax,
      deliveryFee,
      total,
      paymentStatus: "pending",
      deliveryOtp: orderRef.id.slice(-4),
      fulfillmentType,
      orderType: fulfillmentType,
      scheduleMode,
      scheduledFor: scheduledFor ?? undefined,
      scheduledDateLabel: scheduledFor ? scheduledFor.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined,
      scheduledSlotId: scheduledFor ? buildSlotId(restaurantId, scheduledFor, schedule.slotMinutes) : undefined,
      scheduledStatus: scheduleMode === "scheduled" ? "requested" : undefined,
      cutoffAt: schedule.cutoffAt,
      prepEstimateMinutes: schedule.prepEstimateMinutes,
      capacityCheck: schedule.capacityCheck,
      guestCount: body.guestCount,
      acceptedTermsVersion: body.acceptedTermsVersion,
      acceptedTermsAt: body.acceptedTermsAt ? new Date(body.acceptedTermsAt) : now,
      createdAt: now,
      updatedAt: now,
      ...(deliveryPlaceId ? { deliveryPlaceId } : {}),
      ...(offerValidation.offerCode ? { offerCode: offerValidation.offerCode } : {}),
    }) as OrderDoc;

    const batch = adminDb().batch();
    batch.set(orderRef, order);
    batch.set(adminDb().collection("customerOrders").doc(orderRef.id), order);
    if (order.deliveryAddress && order.deliveryGeo) {
      const addressId = `${session.uid}-default`;
      batch.set(adminDb().collection("customerAddresses").doc(addressId), {
        id: addressId,
        customerId: session.uid,
        label: order.deliveryAddressLabel,
        address: order.deliveryAddress,
        fullAddress: order.deliveryAddress,
        geo: order.deliveryGeo,
        latitude: order.deliveryGeo.lat,
        longitude: order.deliveryGeo.lng,
        verified: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        ...(order.deliveryPlaceId ? { placeId: order.deliveryPlaceId } : {}),
      }, { merge: true });
    }
    await batch.commit();

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      distanceKm,
      deliveryRadiusKm,
      status: order.status,
    }, { status: 201 });
  } catch (error) {
    console.error("Create order failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Unable to create order right now." }, { status: 500 });
  }
}

function isValidLine(line: OrderLineDoc) {
  return (
    line &&
    typeof line.menuItemId === "string" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    typeof line.quantity === "number" &&
    line.quantity > 0
  );
}

function money(value?: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round((value as number) * 100) / 100) : 0;
}

function haversineKm(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const radius = 6371;
  const dLat = degreesToRadians(second.lat - first.lat);
  const dLng = degreesToRadians(second.lng - first.lng);
  const lat1 = degreesToRadians(first.lat);
  const lat2 = degreesToRadians(second.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function parseScheduledFor(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

async function validateSchedule(input: {
  scheduledFor?: Date;
  scheduleMode: "now" | "scheduled";
  fulfillmentType: "delivery" | "parcel" | "dine-in";
  restaurant: RestaurantDoc;
  restaurantId: string;
  lineCount: number;
}) {
  const settings = input.restaurant.scheduling ?? {
    enabled: true,
    minPrepMinutes: 30,
    cutoffMinutes: 45,
    slotMinutes: 30,
    maxOrdersPerSlot: input.restaurant.deliverySettings?.maxOrdersPerSlot ?? 8,
    dineInReservationEnabled: true,
    parcelSchedulingEnabled: true,
    deliverySchedulingEnabled: true,
  };
  const prepEstimateMinutes = Math.max(settings.minPrepMinutes, 10 + input.lineCount * 4);
  const slotMinutes = settings.slotMinutes || 30;
  const maxOrders = settings.maxOrdersPerSlot || input.restaurant.deliverySettings?.maxOrdersPerSlot || 8;

  if (input.scheduleMode === "now") {
    return {
      ok: true as const,
      prepEstimateMinutes,
      slotMinutes,
      cutoffAt: undefined,
      capacityCheck: { slotMinutes, maxOrders, reservedOrders: 0, deliveryCapacityOk: true },
    };
  }

  if (!settings.enabled || !input.scheduledFor) {
    return { ok: false as const, error: "Scheduled ordering is not available for this restaurant." };
  }
  if (input.fulfillmentType === "delivery" && !settings.deliverySchedulingEnabled) {
    return { ok: false as const, error: "Delivery scheduling is disabled for this restaurant." };
  }
  if (input.fulfillmentType === "parcel" && !settings.parcelSchedulingEnabled) {
    return { ok: false as const, error: "Parcel scheduling is disabled for this restaurant." };
  }
  if (input.fulfillmentType === "dine-in" && !settings.dineInReservationEnabled) {
    return { ok: false as const, error: "Dine-in reservations are disabled for this restaurant." };
  }

  const earliest = Date.now() + settings.cutoffMinutes * 60_000;
  if (input.scheduledFor.getTime() < earliest) {
    return { ok: false as const, error: `Scheduled orders need at least ${settings.cutoffMinutes} minutes notice.` };
  }

  const maxDate = Date.now() + 14 * 24 * 60 * 60 * 1000;
  if (input.scheduledFor.getTime() > maxDate) {
    return { ok: false as const, error: "Scheduled orders can be placed up to 14 days ahead." };
  }

  const cutoffAt = new Date(input.scheduledFor.getTime() - settings.cutoffMinutes * 60_000);
  const scheduledSlotId = buildSlotId(input.restaurantId, input.scheduledFor, slotMinutes);
  const reservedOrders = await countScheduledOrdersForSlot(scheduledSlotId);
  if (reservedOrders >= maxOrders) {
    return { ok: false as const, error: "This scheduled slot is full. Please choose another time." };
  }

  return {
    ok: true as const,
    prepEstimateMinutes,
    slotMinutes,
    cutoffAt,
    capacityCheck: {
      slotMinutes,
      maxOrders,
      reservedOrders,
      deliveryCapacityOk: reservedOrders < maxOrders,
    },
  };
}

async function countScheduledOrdersForSlot(scheduledSlotId: string) {
  const snapshot = await adminDb()
    .collection("orders")
    .where("scheduledSlotId", "==", scheduledSlotId)
    .limit(100)
    .get();

  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.status !== "cancelled" && data.scheduledStatus !== "rejected";
  }).length;
}

async function validateOffer(input: {
  restaurantId: string;
  offerCode?: string;
  subtotal: number;
  fulfillmentType: "delivery" | "parcel" | "dine-in";
}) {
  if (!input.offerCode) return { ok: true as const };
  const snapshot = await adminDb()
    .collection("offers")
    .where("restaurantId", "==", input.restaurantId)
    .where("code", "==", input.offerCode)
    .limit(1)
    .get();
  const doc = snapshot.docs[0]?.data() as OfferDoc | undefined;
  if (!doc || doc.isDeleted || !doc.active || (doc.status && doc.status !== "active")) {
    return { ok: false as const, error: "This offer is no longer active." };
  }
  if (!isOfferDateValid(doc)) {
    return { ok: false as const, error: "This offer is not valid for the current date or time." };
  }
  if (input.subtotal < (doc.minimumOrder ?? 0)) {
    return { ok: false as const, error: `Minimum order for this offer is ₹${doc.minimumOrder}.` };
  }
  if (doc.appliesTo?.length && !doc.appliesTo.includes(input.fulfillmentType)) {
    return { ok: false as const, error: "This offer is not valid for the selected order type." };
  }

  const rawDiscount =
    doc.discountType === "flat"
      ? Math.min(input.subtotal, doc.discountValue)
      : doc.discountType === "free-delivery"
        ? 0
        : Math.round(input.subtotal * ((doc.discountValue ?? 0) / 100));
  const discount = doc.maxDiscount ? Math.min(rawDiscount, doc.maxDiscount) : rawDiscount;
  return { ok: true as const, offerCode: input.offerCode, discount, freeDelivery: doc.discountType === "free-delivery" };
}

function isOfferDateValid(doc: OfferDoc) {
  const now = new Date();
  const startsAt = dateMillis(doc.startsAt);
  const endsAt = dateMillis(doc.endsAt);
  if (startsAt && startsAt > now.getTime()) return false;
  if (endsAt && endsAt < now.getTime()) return false;
  if (doc.daysOfWeek?.length) {
    const day = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    if (!doc.daysOfWeek.map((item) => item.toLowerCase().slice(0, 3)).includes(day)) return false;
  }
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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

function buildSlotId(restaurantId: string, scheduledFor: Date, slotMinutes: number) {
  const rounded = new Date(scheduledFor);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / slotMinutes) * slotMinutes, 0, 0);
  return `${restaurantId}-${rounded.toISOString()}`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }
  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)]),
  ) as T;
}
