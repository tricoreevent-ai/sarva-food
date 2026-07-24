import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const leadSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  email: z.string().trim().email(),
  location: z.string().trim().min(2).max(160),
  cuisineType: z.string().trim().min(2).max(80),
  restaurantType: z.string().trim().max(80).optional(),
  seatsCount: z.coerce.number().int().min(0).max(1000).optional(),
  deliveryAvailable: z.boolean().optional(),
  cloudKitchen: z.boolean().optional(),
  currentPosSystem: z.string().trim().max(120).optional(),
  existingDeliveryPlatforms: z.string().trim().max(200).optional(),
  monthlyOrdersEstimate: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  website: z.string().trim().max(0).optional(),
});

export async function POST(request: NextRequest) {
  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`restaurant-lead:${clientId}`, 5, 60 * 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many registration requests." }, { status: 429 });
  }
  const payload = await request.json().catch(() => ({}));
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter valid restaurant and owner details." }, { status: 400 });
  }
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const now = FieldValue.serverTimestamp();
  const ref = await adminDb().collection("admin_restaurant_leads").add({
    ...parsed.data,
    whatsapp: parsed.data.whatsapp || parsed.data.phone,
    status: "New",
    source: "customer_footer",
    assignedTo: "",
    adminNotes: [],
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
