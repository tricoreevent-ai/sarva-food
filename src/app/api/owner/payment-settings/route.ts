import { NextResponse, type NextRequest } from "next/server";
import {
  assertRazorpayUsable,
  createRazorpayClient,
  getOwnerRazorpayRuntimeSettings,
  getOwnerRazorpaySettings,
  restaurantPaymentGatewayNotConfigured,
  resetOwnerRazorpaySettings,
  saveOwnerRazorpaySettings,
} from "@/lib/server/owner-payment-settings";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "read");
  if (access.error) return access.error;
  const data = await getOwnerRazorpaySettings(access.session, request.nextUrl.searchParams.get("restaurantId"));
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const data = await saveOwnerRazorpaySettings(access.session, body);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const access = await requireOwnerFeature(request, "settings", "update");
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({})) as { action?: string; restaurantId?: string };

  if (body.action === "reset") {
    const data = await resetOwnerRazorpaySettings(access.session, body.restaurantId);
    return NextResponse.json({ data });
  }

  if (body.action === "test") {
    try {
      const settings = await getOwnerRazorpayRuntimeSettings(access.session, body.restaurantId);
      assertRazorpayUsable(settings);
      await createRazorpayClient(settings).orders.all({ count: 1 });
      return NextResponse.json({ ok: true, mode: settings.mode, message: "Payment gateway is configured successfully." });
    } catch (error) {
      if (error instanceof Error && error.message === restaurantPaymentGatewayNotConfigured) {
        return NextResponse.json({ error: restaurantPaymentGatewayNotConfigured }, { status: 422 });
      }
      return NextResponse.json({ error: "Payment gateway is unavailable. Check the key id, secret, mode, and account status." }, { status: 422 });
    }
  }

  return NextResponse.json({ error: "Unsupported payment settings action." }, { status: 400 });
}
