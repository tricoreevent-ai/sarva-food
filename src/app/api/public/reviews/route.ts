import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { parseFirestoreDateMillis } from "@/lib/firestore-date";
import { getSessionFromRequest } from "@/lib/server-auth";
import { logPublicDataError } from "@/lib/server/public-firestore";
import { notifyPublicDatabaseFailure } from "@/lib/server/public-outage-alert";
import { resolveTenantId } from "@/lib/tenant";
import type { OrderDoc, ReviewDoc } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
};

type ReviewRequestBody = {
  restaurantId?: string;
  menuItemId?: string;
  menuItemName?: string;
  orderId?: string;
  rating?: number;
  comment?: string;
  imageUrls?: string[];
  anonymous?: boolean;
};

type ReviewPatchBody = {
  reviewId?: string;
  action?: "reply" | "report" | "moderate";
  reply?: string;
  status?: ReviewDoc["status"];
  moderationNote?: string;
};

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const menuItemId = request.nextUrl.searchParams.get("menuItemId") ?? undefined;
    const manageScope = request.nextUrl.searchParams.get("scope") === "manage";
    const session = manageScope ? await getSessionFromRequest(request) : null;
    const canManage = Boolean(session && ["owner", "manager", "admin"].includes(session.role));
    if (manageScope && !canManage) {
      return NextResponse.json({ data: [], summary: { averageRating: 0, ratingCount: 0 }, error: "Forbidden" }, { status: 403 });
    }
    if (!restaurantId && !canManage) {
      return NextResponse.json({ data: [], summary: { averageRating: 0, ratingCount: 0 } }, { headers: CACHE_HEADERS });
    }

    const tenantId = restaurantId ? resolveTenantId(restaurantId) : undefined;
    if (canManage && session && session.role !== "admin" && tenantId && !session.restaurantIds.includes(tenantId)) {
      return NextResponse.json({ data: [], summary: { averageRating: 0, ratingCount: 0 }, error: "Forbidden" }, { status: 403 });
    }

    let reviewsQuery = tenantId
      ? adminDb().collection("customerReviews").where("restaurantId", "==", tenantId).limit(100)
      : adminDb().collection("customerReviews").limit(100);

    if (!canManage) {
      reviewsQuery = reviewsQuery.where("status", "==", "published");
    }

    if (menuItemId) {
      reviewsQuery = reviewsQuery.where("menuItemId", "==", menuItemId);
    }

    const snapshot = await withTimeout(reviewsQuery.get(), 4_500, "reviews");
    const reviews = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as ReviewDoc)
      .filter((review) => !review.isDeleted && review.verifiedOrder && (canManage || review.status === "published"))
      .sort((first, second) => dateMillis(second.createdAt) - dateMillis(first.createdAt));
    const ratingCount = reviews.length;
    const averageRating = ratingCount
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount) * 10) / 10
      : 0;
    const statsSnapshot = tenantId && !menuItemId
      ? await adminDb().collection("restaurant_stats").doc(tenantId).get().catch(() => null)
      : null;
    const stats = statsSnapshot?.exists ? statsSnapshot.data() : null;

    return NextResponse.json(
      {
        data: reviews.map(toPublicReview),
        summary: stats
          ? {
              averageRating: Number(stats.averageRating ?? averageRating),
              ratingCount: Number(stats.totalReviews ?? ratingCount),
            }
          : { averageRating, ratingCount },
      },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    logPublicDataError("reviews", error);
    void notifyPublicDatabaseFailure("reviews", error);
    return NextResponse.json({ data: [], summary: { averageRating: 0, ratingCount: 0 }, error: "Unable to load reviews." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ ok: false, error: "Sign in with a customer account to review." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ReviewRequestBody;
    const restaurantId = normalizeId(body.restaurantId);
    const tenantId = restaurantId ? resolveTenantId(restaurantId) : "";
    const orderId = normalizeId(body.orderId);
    const menuItemId = normalizeId(body.menuItemId);
    const rating = Number(body.rating);
    const comment = String(body.comment ?? "").trim();

    if (!tenantId || !orderId || !Number.isFinite(rating) || rating < 1 || rating > 5 || comment.length < 3) {
      return NextResponse.json({ ok: false, error: "Review requires restaurant, completed order, rating, and comment." }, { status: 400 });
    }

    const order = await findVerifiedOrder(session.uid, tenantId, orderId);
    if (!order || !isReviewableOrder(order, menuItemId)) {
      return NextResponse.json({ ok: false, error: "Reviews are allowed only for delivered orders and purchased items." }, { status: 403 });
    }

    const now = new Date();
    const reviewId = safeDocId(`${session.uid}-${tenantId}-${menuItemId || "restaurant"}-${orderId}`);
    const existing = await adminDb().collection("customerReviews").doc(reviewId).get();
    if (existing.exists && Date.now() - dateMillis(existing.data()?.createdAt) > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: "Reviews can be edited for 24 hours after posting." }, { status: 409 });
    }
    const doc: ReviewDoc = {
      id: reviewId,
      tenantId,
      restaurantId: tenantId,
      branchId: order.branchId,
      menuItemId: menuItemId || undefined,
      menuItemName: body.menuItemName?.trim() || purchasedItemName(order, menuItemId),
      orderId,
      customerId: session.uid,
      customerName: body.anonymous ? "Anonymous verified customer" : order.customerName || "Verified customer",
      rating: Math.round(rating),
      comment,
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.filter((url) => typeof url === "string" && url.trim()).slice(0, 5) : [],
      verifiedOrder: true,
      status: "published",
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb().collection("customerReviews").doc(reviewId).set(doc, { merge: true });
    await persistRestaurantReviewAndStats(doc);
    return NextResponse.json({ ok: true, data: toPublicReview(doc) });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to save review right now." }, { status: 500 });
  }
}

async function persistRestaurantReviewAndStats(review: ReviewDoc) {
  const db = adminDb();
  const restaurantReviewRef = db
    .collection("restaurants")
    .doc(review.restaurantId)
    .collection("reviews")
    .doc(review.id);
  const statsRef = db.collection("restaurant_stats").doc(review.restaurantId);

  await db.runTransaction(async (transaction) => {
    const [previousSnapshot, statsSnapshot] = await Promise.all([
      transaction.get(restaurantReviewRef),
      transaction.get(statsRef),
    ]);
    const previous = previousSnapshot.exists ? previousSnapshot.data() : null;
    const previousRating = typeof previous?.rating === "number" ? previous.rating : undefined;
    const currentStats = statsSnapshot.exists ? statsSnapshot.data() ?? {} : {};
    const distribution = normalizeDistribution(currentStats.ratingDistribution);
    let totalReviews = Number(currentStats.totalReviews ?? 0);
    let ratingSum = Number(currentStats.ratingSum ?? (Number(currentStats.averageRating ?? 0) * totalReviews));

    if (previousRating) {
      const previousKey = String(previousRating) as RatingKey;
      distribution[previousKey] = Math.max(0, (distribution[previousKey] ?? 0) - 1);
      ratingSum -= previousRating;
    } else {
      totalReviews += 1;
    }
    const nextKey = String(review.rating) as RatingKey;
    distribution[nextKey] = (distribution[nextKey] ?? 0) + 1;
    ratingSum += review.rating;

    const averageRating = totalReviews ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;
    transaction.set(restaurantReviewRef, {
      customerId: review.customerId,
      customerName: review.customerName,
      orderId: review.orderId,
      rating: review.rating,
      review: review.comment,
      images: review.imageUrls ?? [],
      verifiedPurchase: true,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }, { merge: true });
    transaction.set(statsRef, {
      averageRating,
      totalReviews,
      ratingDistribution: distribution,
      ratingSum,
      updatedAt: review.updatedAt,
    }, { merge: true });
  });
}

function normalizeDistribution(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    "1": Number(input["1"] ?? 0),
    "2": Number(input["2"] ?? 0),
    "3": Number(input["3"] ?? 0),
    "4": Number(input["4"] ?? 0),
    "5": Number(input["5"] ?? 0),
  } satisfies Record<RatingKey, number>;
}

type RatingKey = "1" | "2" | "3" | "4" | "5";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !["owner", "manager", "admin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as ReviewPatchBody;
    const reviewId = normalizeId(body.reviewId);
    if (!reviewId) {
      return NextResponse.json({ ok: false, error: "Review id is required." }, { status: 400 });
    }

    const ref = adminDb().collection("customerReviews").doc(reviewId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ ok: false, error: "Review not found." }, { status: 404 });
    }

    const review = { id: snapshot.id, ...snapshot.data() } as ReviewDoc;
    if (session.role !== "admin" && !session.restaurantIds.includes(review.restaurantId)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    if (body.action === "reply") {
      const message = String(body.reply ?? "").trim();
      if (!message) {
        return NextResponse.json({ ok: false, error: "Reply message is required." }, { status: 400 });
      }
      await ref.set({
        ownerReply: { message, repliedAt: now, repliedBy: session.uid },
        updatedAt: now,
      }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "report") {
      await ref.set({
        status: "reported",
        reportCount: (review.reportCount ?? 0) + 1,
        updatedAt: now,
      }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "moderate" && session.role === "admin") {
      const status = body.status;
      if (!status || !["published", "pending", "hidden", "reported"].includes(status)) {
        return NextResponse.json({ ok: false, error: "Valid moderation status is required." }, { status: 400 });
      }
      await ref.set({
        status,
        moderationNote: body.moderationNote?.trim(),
        updatedAt: now,
      }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid review action." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to update review right now." }, { status: 500 });
  }
}

async function findVerifiedOrder(customerId: string, restaurantId: string, orderId: string) {
  const db = adminDb();
  const snapshots = await Promise.all([
    db.collection("orders").doc(orderId).get(),
    db.collection("customerOrders").doc(orderId).get(),
  ]);
  const orderSnapshot = snapshots.find((snapshot) => snapshot.exists);
  if (!orderSnapshot) return null;
  const order = { id: orderSnapshot.id, ...orderSnapshot.data() } as OrderDoc;
  if (order.customerId !== customerId || order.restaurantId !== restaurantId) return null;
  return order;
}

function isReviewableOrder(order: OrderDoc, menuItemId?: string) {
  if (!["delivered", "completed"].includes(order.status)) return false;
  if (!menuItemId) return true;
  return order.lines.some((line) => line.menuItemId === menuItemId);
}

function purchasedItemName(order: OrderDoc, menuItemId?: string) {
  if (!menuItemId) return undefined;
  return order.lines.find((line) => line.menuItemId === menuItemId)?.name;
}

function toPublicReview(review: ReviewDoc) {
  return {
    id: review.id,
    restaurantSlug: review.restaurantId,
    menuItemId: review.menuItemId,
    menuItemName: review.menuItemName,
    orderId: review.orderId,
    customerId: review.customerId,
    customerName: review.customerName,
    rating: review.rating,
    comment: review.comment,
    imageUrls: review.imageUrls ?? [],
    verifiedOrder: review.verifiedOrder,
    ownerReply: review.ownerReply
      ? {
          message: review.ownerReply.message,
          repliedAt: dateIso(review.ownerReply.repliedAt),
          repliedBy: review.ownerReply.repliedBy,
        }
      : undefined,
    status: review.status,
    reportCount: review.reportCount ?? 0,
    createdAt: dateIso(review.createdAt),
    updatedAt: dateIso(review.updatedAt),
  };
}

function normalizeId(value?: string) {
  return String(value ?? "").trim();
}

function safeDocId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 180);
}

function dateMillis(value: unknown) {
  return parseFirestoreDateMillis(value);
}

function dateIso(value: unknown) {
  const millis = dateMillis(value);
  return millis ? new Date(millis).toISOString() : new Date().toISOString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}
