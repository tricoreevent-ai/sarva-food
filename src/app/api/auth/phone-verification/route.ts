import { NextResponse, type NextRequest } from "next/server";
import { PhoneVerificationError, PhoneVerificationRepository } from "@/repositories/phone-verification-repository";
import type { PhoneVerificationContext } from "@/lib/phone-verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    idToken?: string;
    phone?: string;
    context?: PhoneVerificationContext;
    deviceId?: string;
  };
  try {
    if (!body.idToken || !body.phone || !isPhoneVerificationContext(body.context)) {
      throw new PhoneVerificationError("Mobile verification is required.");
    }
    const data = await new PhoneVerificationRepository().record({
      idToken: body.idToken,
      phone: body.phone,
      context: body.context,
      deviceId: body.deviceId,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof PhoneVerificationError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof PhoneVerificationError ? error.message : "Mobile verification failed." },
      { status },
    );
  }
}

function isPhoneVerificationContext(value: unknown): value is PhoneVerificationContext {
  return ["customer-login", "customer-registration", "qr-ordering", "customer-profile", "waiter-login", "delivery-login"].includes(String(value));
}
