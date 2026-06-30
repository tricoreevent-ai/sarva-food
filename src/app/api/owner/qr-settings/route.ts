import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { AuditRepository } from "@/repositories/audit-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type QrOrderingSettings = {
  enabled: boolean;
  gpsRadiusMeters: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  otpRequired: boolean;
  wifiValidation: boolean;
  wifiSsid: string;
  allowMultipleCustomers: boolean;
  allowParcel: boolean;
  allowDineIn: boolean;
  guestCheckout: boolean;
  geofence: boolean;
  tips: boolean;
  feedback: boolean;
  qrLogo: string;
  rotation: "manual" | "daily" | "weekly";
};

const defaults: QrOrderingSettings = {
  enabled: true,
  gpsRadiusMeters: 50,
  sessionTimeoutMinutes: 45,
  idleTimeoutMinutes: 10,
  otpRequired: false,
  wifiValidation: false,
  wifiSsid: "",
  allowMultipleCustomers: true,
  allowParcel: true,
  allowDineIn: true,
  guestCheckout: true,
  geofence: true,
  tips: false,
  feedback: true,
  qrLogo: "",
  rotation: "manual",
};

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const snapshot = await adminDb().collection("restaurantSettings").doc(scope.tenantId).get();
  return NextResponse.json({ data: { ...defaults, ...(snapshot.data()?.qrOrdering ?? {}) } });
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { settings?: Partial<QrOrderingSettings>; restaurantId?: string };
  const scope = tenantScope(access.session, body.restaurantId);
  const settings = sanitize(body.settings ?? {});
  await adminDb().collection("restaurantSettings").doc(scope.tenantId).set({
    tenantId: scope.tenantId,
    restaurantId: scope.tenantId,
    qrOrdering: settings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "qr_ordering_settings", module: "settings", after: settings });
  return NextResponse.json({ data: settings });
}

function sanitize(input: Partial<QrOrderingSettings>) {
  return {
    ...defaults,
    enabled: input.enabled !== false,
    gpsRadiusMeters: clamp(input.gpsRadiusMeters, 0, 500, defaults.gpsRadiusMeters),
    sessionTimeoutMinutes: clamp(input.sessionTimeoutMinutes, 10, 240, defaults.sessionTimeoutMinutes),
    idleTimeoutMinutes: clamp(input.idleTimeoutMinutes, 3, 60, defaults.idleTimeoutMinutes),
    otpRequired: input.otpRequired === true,
    wifiValidation: input.wifiValidation === true,
    wifiSsid: String(input.wifiSsid ?? "").trim(),
    allowMultipleCustomers: input.allowMultipleCustomers !== false,
    allowParcel: input.allowParcel !== false,
    allowDineIn: input.allowDineIn !== false,
    guestCheckout: input.guestCheckout !== false,
    geofence: input.geofence !== false,
    tips: input.tips === true,
    feedback: input.feedback !== false,
    qrLogo: String(input.qrLogo ?? "").trim(),
    rotation: input.rotation === "daily" || input.rotation === "weekly" ? input.rotation : "manual",
  };
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
