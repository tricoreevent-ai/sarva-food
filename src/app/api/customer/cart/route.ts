import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoredCartLine = Record<string, unknown> & {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  restaurantSlug?: string;
};

type CartPayload = {
  items?: StoredCartLine[];
  offerCode?: string;
  updatedAt?: unknown;
};

const CART_COLLECTION = "user_carts";
const MAX_CART_LINES = 75;

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  const snapshot = await adminDb().collection(CART_COLLECTION).doc(session.uid).get();
  const data = snapshot.data() as CartPayload | undefined;
  return NextResponse.json({
    data: {
      items: sanitizeCartLines(data?.items ?? []),
      offerCode: typeof data?.offerCode === "string" ? data.offerCode : "",
      updatedAt: dateToIso(data?.updatedAt),
    },
  }, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer");
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CartPayload;
  const items = sanitizeCartLines(body.items ?? []);
  const offerCode = typeof body.offerCode === "string" ? body.offerCode.trim().toUpperCase() : "";
  const now = new Date();

  await adminDb().collection(CART_COLLECTION).doc(session.uid).set({
    id: session.uid,
    customerId: session.uid,
    items,
    offerCode,
    restaurantSlug: items[0]?.restaurantSlug ?? "",
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
  }, { merge: true });

  return NextResponse.json({ ok: true, itemCount: items.length }, { headers: NO_STORE_HEADERS });
}

function sanitizeCartLines(items: StoredCartLine[]) {
  return items
    .slice(0, MAX_CART_LINES)
    .filter((item) => typeof item.id === "string" && typeof item.name === "string" && Number.isFinite(Number(item.price)))
    .map((item) => ({
      ...item,
      quantity: Math.max(1, Math.min(99, Math.round(Number(item.quantity ?? 1)))),
      price: Number(item.price),
    }));
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0",
};

function dateToIso(value: unknown) {
  return parseFirestoreDateIso(value) ?? null;
}
