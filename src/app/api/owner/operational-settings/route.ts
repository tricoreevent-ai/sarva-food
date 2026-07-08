import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { tenantScope } from "@/repositories/shared";
import { AuditRepository } from "@/repositories/audit-repository";
import { normalizeOperationalSettings } from "@/lib/order-delay-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let access = await requireOwnerFeature(request, "settings", "read");
  if (access.error) access = await requireOwnerFeature(request, "kitchen", "read");
  if (access.error) access = await requireOwnerFeature(request, "orders", "read");
  if (access.error) return access.error;
  const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
  const snapshot = await adminDb().collection("restaurantSettings").doc(scope.tenantId).get();
  const data = snapshot.data() as { operationalSettings?: unknown } | undefined;
  return NextResponse.json({ data: normalizeOperationalSettings(data?.operationalSettings) });
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { settings?: unknown; restaurantId?: string };
  const scope = tenantScope(access.session, body.restaurantId);
  const settings = normalizeOperationalSettings(body.settings);
  await adminDb().collection("restaurantSettings").doc(scope.tenantId).set({
    tenantId: scope.tenantId,
    restaurantId: scope.tenantId,
    operationalSettings: settings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await new AuditRepository().record({
    tenantId: scope.tenantId,
    restaurantId: scope.tenantId,
    userId: access.session.uid,
    role: access.session.role,
    action: "operational_settings",
    module: "settings",
    after: settings,
  });
  return NextResponse.json({ data: settings });
}
