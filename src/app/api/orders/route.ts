import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import { OrderRepository } from "@/repositories/order-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { productionLogger, safeErrorName } from "@/lib/server/production-logger";
import type { OrderDoc, OrderLineDoc, RestaurantDoc } from "@/types/firebase";
import { adminDb } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { campaignAvailability, type MarketingCampaign } from "@/features/marketing/campaign-engine";
import { createHash } from "node:crypto";

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
  campaign?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return fail("Your session expired. Please sign in again.", 401, "CUSTOMER_AUTH_REQUIRED");
    }

    const body = (await request.json().catch(() => ({}))) as CreateOrderBody;
    const restaurantId = body.restaurantId ? resolveTenantId(body.restaurantId) : "";
    const fulfillmentType = body.fulfillmentType ?? "delivery";
    const scheduleMode = body.scheduleMode ?? "now";
    const scheduledFor = parseScheduledFor(body.scheduledFor);
    const requestedLines = Array.isArray(body.lines) ? body.lines.filter(isValidLine) : [];
    const deliveryGeo = body.deliveryGeo;
    const hasCoordinates = typeof deliveryGeo?.lat === "number" && typeof deliveryGeo.lng === "number";

    if (!restaurantId || !requestedLines.length || !body.customerName?.trim() || !body.customerPhone?.trim()) {
      return fail("Restaurant, customer, and order lines are required.", 400, "VALIDATION_REQUIRED_FIELDS");
    }
    if (fulfillmentType === "delivery" && !body.deliveryAddress?.trim()) {
      return fail("Please complete your delivery address.", 400, "DELIVERY_ADDRESS_REQUIRED");
    }
    if (scheduleMode === "scheduled" && !scheduledFor) {
      return fail("Choose a valid scheduled date and time.", 400, "SCHEDULE_REQUIRED");
    }

    const repository = new OrderRepository();
    const restaurant = await repository.restaurant(restaurantId);
    if (!restaurant) {
      return fail("Restaurant is currently unavailable.", 404, "RESTAURANT_UNAVAILABLE");
    }

    if (!restaurant.active || (fulfillmentType === "delivery" && (typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number"))) {
      return fail("Restaurant is not accepting online delivery orders right now.", 409, "RESTAURANT_NOT_ACCEPTING_DELIVERY");
    }
    const lines = await repository.resolveOrderLines(restaurantId, fulfillmentType, requestedLines);
    if (!lines) return fail("One or more menu items are unavailable. Review your cart and try again.", 422, "MENU_ITEM_UNAVAILABLE");

    const deliveryPoint = hasCoordinates ? { lat: deliveryGeo.lat as number, lng: deliveryGeo.lng as number } : undefined;
    const distanceKm = fulfillmentType === "delivery" && deliveryPoint
      ? haversineKm(
          deliveryPoint,
          { lat: restaurant.latitude as number, lng: restaurant.longitude as number },
        )
      : 0;
    const deliveryRadiusKm = restaurant.deliveryRadiusKm ?? 0;
    if (fulfillmentType === "delivery" && deliveryPoint && (!deliveryRadiusKm || distanceKm > deliveryRadiusKm)) {
      return fail("This address is outside the restaurant delivery radius.", 422, "DELIVERY_OUT_OF_RANGE", { distanceKm, deliveryRadiusKm });
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
      return fail(schedule.error, 422, "SCHEDULE_UNAVAILABLE");
    }

    const now = new Date();
    const orderId = repository.newOrderId();
    const deliveryAddress = fulfillmentType === "delivery" ? body.deliveryAddress?.trim() : undefined;
    const deliveryPlaceId = body.deliveryPlaceId?.trim();
    const offerCode = body.offerCode?.trim().toUpperCase();
    const subtotal = money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
    const offerValidation = await repository.validateOffer({ restaurantId, offerCode, subtotal, fulfillmentType, lines });
    if (!offerValidation.ok) {
      return fail(offerValidation.error, 422, "OFFER_INVALID");
    }
    const discount = offerValidation.discount ?? money(body.discount);
    const tax = money((subtotal - discount) * 0.05);
    const configuredDeliveryFee = Number(restaurant.deliverySettings?.baseFee ?? 39);
    const freeDeliveryAbove = Number(restaurant.deliverySettings?.freeDeliveryAbove ?? 499);
    const deliveryFee = fulfillmentType !== "delivery" || offerValidation.freeDelivery || subtotal > freeDeliveryAbove
      ? 0
      : money(configuredDeliveryFee);
    const total = Math.max(0, money(subtotal - discount + deliveryFee + tax));
    const campaign = cleanCampaign(body.campaign);
    const campaignReservation = campaign ? await reserveCampaign(restaurantId, campaign, requestedLines, total, session.uid) : null;
    if (campaign && !campaignReservation?.ok) return fail(campaignReservation?.error || "This campaign is no longer available. View today's menu for current items.", 409, campaignReservation?.code || "CAMPAIGN_UNAVAILABLE");
    const order = stripUndefined({
      id: orderId,
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
      foodStatus: "new",
      lines,
      subtotal,
      discount,
      tax,
      deliveryFee,
      total,
      paymentStatus: "pending",
      statusHistory: [{ status: "new", foodStatus: "new", paymentStatus: "pending", at: now, by: session.uid }],
      preparedBy: "",
      servedBy: "",
      completedBy: "",
      printedCount: 0,
      lastPrintedAt: null,
      deliveryOtp: orderId.slice(-4),
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
      ...(campaign ? { campaignCode: campaign, source: "WhatsApp" } : {}),
    }) as OrderDoc;

    const address = order.deliveryAddress && order.deliveryGeo ? (() => {
      const addressId = `${session.uid}-default`;
      return {
        id: addressId,
        customerId: session.uid,
        tenantId: order.tenantId,
        restaurantId: order.restaurantId,
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
      };
    })() : undefined;
    let savedOrder;
    try { savedOrder = await repository.create(order, address); }
    catch (error) { if (campaignReservation?.ok) await rollbackCampaign(campaignReservation); throw error; }
    await new AuditRepository().record({
      tenantId: order.tenantId,
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      userId: session.uid,
      role: session.role,
      action: "order_create",
      module: "orders",
      entityId: order.id,
      after: { fulfillmentType, scheduleMode, total: order.total, status: order.status },
    });

    return NextResponse.json({
      ok: true,
      orderId: savedOrder.id,
      verificationId: savedOrder.verificationId,
      distanceKm,
      deliveryRadiusKm,
      status: savedOrder.status,
    }, { status: 201 });
  } catch (error) {
    productionLogger.warn("orders.create_failed", { errorName: safeErrorName(error), reason: error instanceof Error ? error.message : String(error) });
    return fail("Unable to connect to the restaurant. Please try again in a moment.", 500, "ORDER_CREATE_FAILED");
  }
}

async function reserveCampaign(restaurantId: string, slug: string, requestedLines: OrderLineDoc[], revenue: number, customerId: string) {
  const db = adminDb(); const publicRef = db.collection("publicMarketingCampaigns").doc(`${restaurantId}:${slug}`); const quantity = requestedLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  try {
    return await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(publicRef); if (!snapshot.exists) return { ok: false as const, error: "This campaign was updated or removed. Open today's menu to continue.", code: "CAMPAIGN_UPDATED" };
      const data = snapshot.data() as MarketingCampaign & { items?: Array<{ name?: string }>; campaignId?: string }; const privateRef = data.campaignId ? db.collection("marketingCampaigns").doc(data.campaignId) : null; const privateSnapshot = privateRef ? await transaction.get(privateRef) : null;
      const availability = campaignAvailability(data); if (!availability.orderable) return { ok: false as const, error: `${availability.message} View today's available menu below.`, code: availability.state === "sold-out" ? "CAMPAIGN_SOLD_OUT" : availability.state === "scheduled" || availability.state === "coming-soon" ? "CAMPAIGN_NOT_OPEN" : "CAMPAIGN_EXPIRED" };
      const names = (data.items ?? []).map((item) => String(item.name || "").trim().toLowerCase()); if (requestedLines.some((line) => !names.some((name) => String(line.name || "").trim().toLowerCase().startsWith(name)))) return { ok: false as const, error: "The menu changed after this campaign was shared. Review today's menu before ordering.", code: "CAMPAIGN_MENU_UPDATED" };
      const nextOrders = (data.orderCount ?? 0) + 1; const nextQuantity = (data.quantityOrdered ?? 0) + quantity;
      if (data.maximumOrders && nextOrders > data.maximumOrders) return { ok: false as const, error: "This special has reached its maximum number of orders. Try today's best sellers instead.", code: "CAMPAIGN_SOLD_OUT" };
      if (data.maximumQuantity && nextQuantity > data.maximumQuantity) return { ok: false as const, error: "Only a smaller quantity remains for this special. Refresh the campaign and adjust your cart.", code: "CAMPAIGN_QUANTITY_LIMIT" };
      transaction.update(publicRef, { orderCount: nextOrders, quantityOrdered: nextQuantity, updatedAt: new Date().toISOString() });
      if (privateRef) { const customerHash = createHash("sha256").update(`${restaurantId}:${customerId}`).digest("hex").slice(0, 20); const seen = Array.isArray(privateSnapshot?.data()?.customerHashes) && privateSnapshot.data()!.customerHashes.includes(customerHash); transaction.set(privateRef, { orderCount: FieldValue.increment(1), quantityOrdered: FieldValue.increment(quantity), "metrics.orders": FieldValue.increment(1), "metrics.revenue": FieldValue.increment(revenue), ...(seen ? { "metrics.repeatCustomers": FieldValue.increment(1) } : { customerHashes: FieldValue.arrayUnion(customerHash) }), updatedAt: new Date().toISOString() }, { merge: true }); }
      return { ok: true as const, publicRef, privateRef, quantity, revenue };
    });
  } catch { return { ok: false as const, error: "Campaign availability could not be confirmed. Wait a moment and try again.", code: "CAMPAIGN_CHECK_UNAVAILABLE" }; }
}

async function rollbackCampaign(reservation: { publicRef: FirebaseFirestore.DocumentReference; privateRef: FirebaseFirestore.DocumentReference | null; quantity: number; revenue: number }) { const batch = adminDb().batch(); batch.set(reservation.publicRef, { orderCount: FieldValue.increment(-1), quantityOrdered: FieldValue.increment(-reservation.quantity) }, { merge: true }); if (reservation.privateRef) batch.set(reservation.privateRef, { orderCount: FieldValue.increment(-1), quantityOrdered: FieldValue.increment(-reservation.quantity), "metrics.orders": FieldValue.increment(-1), "metrics.revenue": FieldValue.increment(-reservation.revenue) }, { merge: true }); await batch.commit().catch(() => undefined); }
function cleanCampaign(value?: string) { const clean = String(value || "").toLowerCase(); return /^[a-z0-9-]{1,80}$/.test(clean) ? clean : ""; }

function fail(error: string, status: number, code: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, code, ...details }, { status });
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
  if (!isScheduledForOpenSlot(input.restaurant, input.scheduledFor)) {
    return { ok: false as const, error: "Choose a time inside the restaurant's operating hours." };
  }

  const cutoffAt = new Date(input.scheduledFor.getTime() - settings.cutoffMinutes * 60_000);
  const scheduledSlotId = buildSlotId(input.restaurantId, input.scheduledFor, slotMinutes);
  const reservedOrders = await new OrderRepository().countScheduledOrdersForSlot(scheduledSlotId);
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

function buildSlotId(restaurantId: string, scheduledFor: Date, slotMinutes: number) {
  const rounded = new Date(scheduledFor);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / slotMinutes) * slotMinutes, 0, 0);
  return `${restaurantId}-${rounded.toISOString()}`;
}

function isScheduledForOpenSlot(restaurant: RestaurantDoc, scheduledFor: Date) {
  const schedule = restaurant.operatingHoursSchedule;
  if (!schedule?.length || restaurant.operatingHoursPreference === "not-specified") return false;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const day = days[(scheduledFor.getDay() + 6) % 7];
  const daySchedule = schedule.find((entry) => entry.day === day);
  if (!daySchedule?.open) return false;
  const minutes = scheduledFor.getHours() * 60 + scheduledFor.getMinutes();
  const prepMinutes = restaurant.scheduling?.minPrepMinutes ?? 30;
  return daySchedule.slots.some((slot) => {
    const start = scheduleTimeMinutes(slot.start);
    const end = scheduleTimeMinutes(slot.end);
    const latest = end > start ? end - prepMinutes : end;
    if (end > start) return minutes >= start && minutes <= latest;
    return minutes >= start || minutes <= latest;
  });
}

function scheduleTimeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return (hours || 0) * 60 + (minutes || 0);
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
