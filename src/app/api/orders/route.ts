import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import { resolveTenantId } from "@/lib/tenant";
import { OrderRepository } from "@/repositories/order-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { productionLogger, safeErrorName } from "@/lib/server/production-logger";
import type { OrderDoc, OrderLineDoc, RestaurantDoc } from "@/types/firebase";

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
    const requestedLines = Array.isArray(body.lines) ? body.lines.filter(isValidLine) : [];
    const deliveryGeo = body.deliveryGeo;
    const hasCoordinates = typeof deliveryGeo?.lat === "number" && typeof deliveryGeo.lng === "number";

    if (!restaurantId || !requestedLines.length || !body.customerName?.trim() || !body.customerPhone?.trim()) {
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

    const repository = new OrderRepository();
    const restaurant = await repository.restaurant(restaurantId);
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: "Restaurant is not available." }, { status: 404 });
    }

    if (!restaurant.active || (fulfillmentType === "delivery" && (typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number"))) {
      return NextResponse.json({ ok: false, error: "Restaurant is not accepting delivery orders." }, { status: 409 });
    }
    const lines = await repository.resolveOrderLines(restaurantId, fulfillmentType, requestedLines);
    if (!lines) return NextResponse.json({ ok: false, error: "One or more menu items are unavailable or invalid." }, { status: 422 });

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
    const orderId = repository.newOrderId();
    const deliveryAddress = fulfillmentType === "delivery" ? body.deliveryAddress?.trim() : undefined;
    const deliveryPlaceId = body.deliveryPlaceId?.trim();
    const offerCode = body.offerCode?.trim().toUpperCase();
    const subtotal = money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
    const offerValidation = await repository.validateOffer({ restaurantId, offerCode, subtotal, fulfillmentType, lines });
    if (!offerValidation.ok) {
      return NextResponse.json({ ok: false, error: offerValidation.error }, { status: 422 });
    }
    const discount = offerValidation.discount ?? money(body.discount);
    const tax = money((subtotal - discount) * 0.05);
    const configuredDeliveryFee = Number(restaurant.deliverySettings?.baseFee ?? 39);
    const freeDeliveryAbove = Number(restaurant.deliverySettings?.freeDeliveryAbove ?? 499);
    const deliveryFee = fulfillmentType !== "delivery" || offerValidation.freeDelivery || subtotal > freeDeliveryAbove
      ? 0
      : money(configuredDeliveryFee);
    const total = Math.max(0, money(subtotal - discount + deliveryFee + tax));
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
    await repository.create(order, address);
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
      orderId: order.id,
      distanceKm,
      deliveryRadiusKm,
      status: order.status,
    }, { status: 201 });
  } catch (error) {
    productionLogger.warn("orders.create_failed", { errorName: safeErrorName(error) });
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
