import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  newIssueMessage,
  sanitizePatch,
  sortIssues,
  supportIssueCategories,
  supportIssuePatch,
  supportIssuePriorities,
  supportIssueTargets,
  supportIssueToJson,
} from "@/lib/server/support-issues";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  restaurantId: z.string().trim().min(1),
  restaurantSlug: z.string().trim().min(1),
  restaurantName: z.string().trim().min(1),
  target: z.enum(supportIssueTargets),
  category: z.enum(supportIssueCategories),
  priority: z.enum(supportIssuePriorities),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(2000),
  customerName: z.string().trim().max(120).optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  customerPhone: z.string().trim().max(30).optional(),
  orderId: z.string().trim().max(80).optional(),
});

const replySchema = z.object({
  issueId: z.string().trim().min(1),
  message: z.string().trim().min(2).max(2000),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer").catch(() => null);
  if (!session) return NextResponse.json({ error: "Customer sign in is required." }, { status: 403 });

  const snapshot = await adminDb().collection("supportIssues").where("customerId", "==", session.uid).limit(100).get();
  const data = sortIssues(snapshot.docs.map((doc) => supportIssueToJson(doc.id, doc.data())));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer").catch(() => null);
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: supportIssueValidationMessage(parsed.error) }, { status: 400 });

  const db = adminDb();
  const restaurant = await findRestaurantDoc(parsed.data.restaurantId, parsed.data.restaurantSlug);
  const restaurantData = restaurant?.data() as { ownerId?: string; ownerIds?: string[]; contact?: { supportEmail?: string }; ownerProfile?: { businessEmail?: string } } | undefined;
  const restaurantId = restaurant?.id || parsed.data.restaurantSlug || parsed.data.restaurantId;
  const ownerIds = Array.from(new Set([restaurantData?.ownerId, ...(restaurantData?.ownerIds ?? [])].filter(Boolean)));
  const ref = db.collection("supportIssues").doc();
  const customerName = parsed.data.customerName || "Customer";
  const initialMessage = newIssueMessage({
    body: parsed.data.description,
    actor: "customer",
    authorId: session?.uid,
    authorName: customerName,
  });

  await ref.set(sanitizePatch({
    id: ref.id,
    restaurantId,
    restaurantSlug: parsed.data.restaurantSlug,
    restaurantName: parsed.data.restaurantName,
    ownerIds,
    ownerEmail: restaurantData?.ownerProfile?.businessEmail || restaurantData?.contact?.supportEmail,
    customerId: session?.uid,
    customerName,
    customerEmail: parsed.data.customerEmail,
    customerPhone: parsed.data.customerPhone,
    orderId: parsed.data.orderId,
    target: parsed.data.target,
    category: parsed.data.category,
    priority: parsed.data.priority,
    subject: parsed.data.subject,
    status: parsed.data.target === "admin" ? "waiting_admin" : "waiting_owner",
    messages: [initialMessage],
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: "customer",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: session?.uid || "guest",
  }));

  return NextResponse.json({ ok: true, issueId: ref.id });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request, "customer").catch(() => null);
  if (!session) return NextResponse.json({ error: "Customer sign in is required." }, { status: 403 });

  const parsed = replySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Reply message is required." }, { status: 400 });

  const ref = adminDb().collection("supportIssues").doc(parsed.data.issueId);
  const snapshot = await ref.get();
  const issue = snapshot.data() as { customerId?: string; target?: string } | undefined;
  if (!snapshot.exists || issue?.customerId !== session.uid) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

  await ref.set({
    ...supportIssuePatch(session, parsed.data.message, "customer"),
    status: issue.target === "admin" ? "waiting_admin" : "waiting_owner",
  }, { merge: true });
  return NextResponse.json({ ok: true });
}

async function findRestaurantDoc(restaurantId: string, restaurantSlug: string) {
  const db = adminDb();
  const candidates = Array.from(new Set([restaurantId, restaurantSlug].filter(Boolean)));
  for (const id of candidates) {
    const snapshot = await db.collection("restaurants").doc(id).get();
    if (snapshot.exists) return snapshot;
  }
  const slugMatch = await db.collection("restaurants").where("slug", "==", restaurantSlug).limit(1).get();
  return slugMatch.docs[0] ?? null;
}

function supportIssueValidationMessage(error: z.ZodError) {
  const fields = error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
  if (fields.includes("description")) return "Details must be at least 5 characters.";
  if (fields.includes("subject")) return "Subject must be at least 3 characters.";
  if (fields.includes("customerEmail")) return "Enter a valid email address or leave email empty.";
  return "Issue details are incomplete.";
}
