import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { normalizeIndiaPhone } from "@/lib/phone-verification";
import { PhoneVerificationError, PhoneVerificationRepository } from "@/repositories/phone-verification-repository";
import { TableRepository } from "@/repositories/table-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  const deviceId = request.nextUrl.searchParams.get("deviceId") ?? "";
  const repository = new TableRepository();
  const state = sessionId ? await repository.publicSessionState(token, sessionId, deviceId).catch((error) => error) : null;
  if (state instanceof Error) return NextResponse.json({ error: state.message }, { status: 404 });
  const table = state?.table ?? await repository.resolveQr(token);
  if (!table) return NextResponse.json({ error: "This QR code is invalid, disabled, or expired." }, { status: 404 });
  const [restaurant, settings] = await Promise.all([
    adminDb().collection("restaurants").doc(table.restaurantId).get(),
    adminDb().collection("restaurantSettings").doc(table.restaurantId).get(),
  ]);
  const restaurantData = restaurant.data() ?? {};
  return NextResponse.json({
    data: {
      restaurant: {
        id: table.restaurantId,
        name: restaurantData.name ?? restaurantData.displayName ?? "Restaurant",
        logo: restaurantData.logoPath ?? restaurantData.logo ?? "",
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        active: restaurantData.active !== false,
      },
      table: {
        tableNumber: table.tableNumber,
        name: table.name ?? table.tableNumber,
        seats: table.seats,
        floor: table.floor,
        section: table.section,
        qrOrderingEnabled: table.qrOrderingEnabled !== false,
        currentSessionId: table.currentSessionId ?? "",
        sessionStatus: table.sessionStatus ?? "none",
        sessionExpiresAt: table.sessionExpiresAt,
      },
      settings: normalizeQrSettings(settings.data()),
      session: state ? {
        sessionId: state.sessionId ?? "",
        status: state.reason ?? table.sessionStatus ?? "none",
        expiresAt: state.expiresAt ?? table.sessionExpiresAt,
        lastActivity: state.lastActivity ?? table.lastActivity,
        recoverable: state.recoverable,
        events: state.events ?? [],
        requests: state.requests ?? [],
      } : null,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    token?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    guestCount?: number;
    deviceId?: string;
    lat?: number;
    lng?: number;
    phoneVerificationToken?: string;
  };
  if (!body.token || !body.customerName?.trim() || !body.customerPhone?.trim()) {
    return NextResponse.json({ error: "Name and mobile number are required." }, { status: 400 });
  }
  const customerPhone = normalizeIndiaPhone(body.customerPhone);
  if (!customerPhone) return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  const table = await new TableRepository().resolveQr(body.token);
  if (!table) return NextResponse.json({ error: "This QR code is invalid, disabled, or expired." }, { status: 404 });
  const [restaurant, settingsDoc] = await Promise.all([
    adminDb().collection("restaurants").doc(table.restaurantId).get(),
    adminDb().collection("restaurantSettings").doc(table.restaurantId).get(),
  ]);
  const settings = normalizeQrSettings(settingsDoc.data());
  const restaurantData = restaurant.data() ?? {};
  const deviceId = body.deviceId || request.headers.get("user-agent") || "browser";
  if (!settings.enabled) return NextResponse.json({ error: "QR ordering is disabled for this restaurant." }, { status: 403 });
  if (tooManyRecentSessionAttempts(table.sessionEvents)) {
    return NextResponse.json({ error: "Too many QR session attempts. Please ask the restaurant team to help." }, { status: 429 });
  }
  if (table.currentSessionId && table.sessionStatus === "active" && table.deviceId && table.deviceId !== deviceId && toMillis(table.sessionExpiresAt) > Date.now()) {
    return NextResponse.json({ error: "This table session is already active on another device. Please ask the waiter to restart it." }, { status: 409 });
  }
  const currentExpiry = toMillis(table.sessionExpiresAt);
  if (!settings.allowMultipleCustomers && table.currentSessionId && table.sessionStatus === "active" && currentExpiry > Date.now()) {
    return NextResponse.json({ error: "This table already has an active session. Ask the waiter to join or start a separate order." }, { status: 409 });
  }
  if (restaurantData.active === false) return NextResponse.json({ error: "Restaurant is not accepting QR orders right now." }, { status: 409 });
  const gpsOk = !settings.geofence || settings.gpsRadiusMeters <= 0 || hasValidGps(body, restaurantData, settings.gpsRadiusMeters);
  if (!gpsOk) return NextResponse.json({ error: "You need to be near the restaurant table to start QR ordering." }, { status: 403 });
  if (settings.otpRequired) {
    try {
      await new PhoneVerificationRepository().verify({
        token: body.phoneVerificationToken ?? "",
        phone: customerPhone,
        context: "qr-ordering",
        deviceId,
        consume: true,
      });
    } catch (error) {
      const status = error instanceof PhoneVerificationError ? error.status : 428;
      return NextResponse.json({ step: "otp", error: "Mobile verification is required." }, { status });
    }
  }
  const session = await new TableRepository().createSession(body.token, {
    customerName: body.customerName.trim(),
    customerPhone,
    customerEmail: body.customerEmail?.trim(),
    guestCount: Math.max(1, Math.min(20, Number(body.guestCount ?? 1) || 1)),
    deviceId,
    verifiedLocation: gpsOk,
    verifiedPhone: !settings.otpRequired || Boolean(body.phoneVerificationToken),
    sessionMinutes: settings.sessionTimeoutMinutes,
    idleMinutes: settings.idleTimeoutMinutes,
  });
  return NextResponse.json({ data: session });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    action?: "refresh" | "resume" | "extend" | "end" | "update-customer" | "replace-device";
    token?: string;
    sessionId?: string;
    deviceId?: string;
    newDeviceId?: string;
    customerName?: string;
    customerEmail?: string;
    guestCount?: number;
    minutes?: number;
  };
  if (!body.token || !body.sessionId || !body.action) {
    return NextResponse.json({ error: "Valid session action is required." }, { status: 400 });
  }
  const deviceId = body.deviceId || request.headers.get("user-agent") || "browser";
  const repository = new TableRepository();
  const result = await (body.action === "refresh"
    ? repository.refreshSession(body.token, body.sessionId, deviceId)
    : body.action === "resume"
      ? repository.resumeSession(body.token, body.sessionId, deviceId)
      : body.action === "extend"
        ? repository.extendPublicSession(body.token, body.sessionId, deviceId, Number(body.minutes ?? 15))
        : body.action === "end"
          ? repository.endPublicSession(body.token, body.sessionId, deviceId)
          : body.action === "replace-device"
            ? repository.updateSession(body.token, body.sessionId, deviceId, { deviceId: body.newDeviceId || deviceId })
            : repository.updateSession(body.token, body.sessionId, deviceId, {
                customerName: body.customerName,
                customerEmail: body.customerEmail,
                guestCount: Number(body.guestCount),
              })).catch((error) => error);
  if (result instanceof Error) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }
  return NextResponse.json({ data: result });
}

function normalizeQrSettings(data?: FirebaseFirestore.DocumentData) {
  const qr = typeof data?.qrOrdering === "object" && data.qrOrdering ? data.qrOrdering as Record<string, unknown> : {};
  return {
    enabled: qr.enabled !== false,
    gpsRadiusMeters: Number(qr.gpsRadiusMeters ?? 50),
    sessionTimeoutMinutes: Number(qr.sessionTimeoutMinutes ?? 45),
    idleTimeoutMinutes: Number(qr.idleTimeoutMinutes ?? 10),
    otpRequired: qr.otpRequired === true,
    allowMultipleCustomers: qr.allowMultipleCustomers !== false,
    allowParcel: qr.allowParcel !== false,
    allowDineIn: qr.allowDineIn !== false,
    geofence: qr.geofence !== false,
  };
}

function hasValidGps(input: { lat?: number; lng?: number }, restaurant: FirebaseFirestore.DocumentData, radiusMeters: number) {
  if (typeof input.lat !== "number" || typeof input.lng !== "number" || typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number") return false;
  return haversineMeters({ lat: input.lat, lng: input.lng }, { lat: restaurant.latitude, lng: restaurant.longitude }) <= radiusMeters;
}

function haversineMeters(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const radius = 6371000;
  const dLat = degrees(second.lat - first.lat);
  const dLng = degrees(second.lng - first.lng);
  const lat1 = degrees(first.lat);
  const lat2 = degrees(second.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function degrees(value: number) {
  return value * Math.PI / 180;
}

function toMillis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return Date.parse(value);
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function tooManyRecentSessionAttempts(events: unknown) {
  if (!Array.isArray(events)) return false;
  const windowStart = Date.now() - 15 * 60_000;
  return events.filter((event) => {
    if (!event || typeof event !== "object") return false;
    const row = event as { type?: string; at?: string };
    return ["session_created", "session_joined"].includes(row.type ?? "") && Date.parse(row.at ?? "") >= windowStart;
  }).length >= 12;
}
