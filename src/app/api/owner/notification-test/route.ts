import { NextResponse, type NextRequest } from "next/server";
import { sendTenantPushNotification } from "@/lib/server/push-notifications";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { tenantScope } from "@/repositories/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { restaurantId?: string };
  const scope = tenantScope(access.session, body.restaurantId);
  const result = await sendTenantPushNotification(scope, {
    type: "notification_test",
    title: "Nammude notification test",
    message: "Owner push delivery is working on this device.",
    priority: "normal",
    link: "/owner/settings?tab=notifications",
    audience: ["owner"],
    sound: "bell",
  }).catch(() => null);

  if (!result) return NextResponse.json({ error: "Firebase push delivery failed. Check Messaging and server credentials." }, { status: 502 });
  if (!result.successCount) return NextResponse.json({ error: "No registered owner device accepted the test notification.", ...result }, { status: 422 });
  return NextResponse.json({ ok: true, ...result });
}
