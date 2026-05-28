import { FieldValue } from "firebase-admin/firestore";
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = ["New", "Contacted", "Demo Scheduled", "Documents Pending", "Approved", "Rejected", "Onboarded"] as const;
const patchSchema = z.object({
  leadId: z.string().trim().min(1),
  status: z.enum(statuses).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (session instanceof NextResponse) return session;

  const snapshot = await adminDb()
    .collection("admin_restaurant_leads")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return NextResponse.json({
    data: snapshot.docs.map((doc) => serializeLead(doc.id, doc.data())),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession(request);
  if (session instanceof NextResponse) return session;

  const payload = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Lead update is invalid." }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection("admin_restaurant_leads").doc(parsed.data.leadId);
  let conversion: Record<string, unknown> | undefined;

  if (parsed.data.status === "Approved") {
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ ok: false, error: "Lead not found." }, { status: 404 });
    }
    conversion = await convertLeadToRestaurant(parsed.data.leadId, snapshot.data() ?? {}, session.uid);
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
    ...(conversion ?? {}),
  };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.assignedTo !== undefined) patch.assignedTo = parsed.data.assignedTo;
  if (parsed.data.note) {
    patch.adminNotes = FieldValue.arrayUnion({
      note: parsed.data.note,
      createdBy: session.uid,
      createdAt: new Date().toISOString(),
    });
  }

  await ref.set(patch, { merge: true });
  return NextResponse.json({ ok: true, conversion });
}

async function getAdminSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }
  return session;
}

function serializeLead(id: string, data: Record<string, unknown>) {
  return {
    id,
    ...data,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function toIso(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: () => Date };
  return typeof maybeTimestamp.toDate === "function" ? maybeTimestamp.toDate().toISOString() : String(value);
}

async function convertLeadToRestaurant(leadId: string, lead: Record<string, unknown>, adminUid: string) {
  const db = adminDb();
  const restaurantName = String(lead.restaurantName ?? "").trim();
  const ownerName = String(lead.ownerName ?? "").trim();
  const ownerEmail = String(lead.email ?? "").trim().toLowerCase();
  const phone = String(lead.phone ?? "").trim();
  const location = String(lead.location ?? "").trim();
  const cuisine = String(lead.cuisineType ?? "").trim();
  if (!restaurantName || !ownerEmail) {
    throw new Error("Lead is missing restaurant name or owner email.");
  }

  const restaurantSlug = `${slugify(restaurantName)}-${slugify(location || "restaurant")}`.slice(0, 90);
  const password = generateTemporaryPassword();
  const user = await getOrCreateOwner(ownerEmail, ownerName || ownerEmail, password);

  await db.collection("restaurants").doc(restaurantSlug).set({
    id: restaurantSlug,
    tenantId: restaurantSlug,
    name: restaurantName,
    slug: restaurantSlug,
    ownerId: user.uid,
    ownerIds: [user.uid],
    location,
    address: location,
    cuisine,
    active: true,
    approved: true,
    adminStatus: "Active",
    subscriptionPlan: "Trial",
    subscriptionStatus: "trialing",
    onboardingStatus: "not-started",
    orderingEnabled: false,
    ownerLoginEnabled: true,
    deliveryRadiusKm: 5,
    contact: {
      phone,
      whatsapp: String(lead.whatsapp ?? phone),
      supportEmail: ownerEmail,
      callbackEnabled: true,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    sourceLeadId: leadId,
  }, { merge: true });

  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    uid: user.uid,
    email: ownerEmail,
    displayName: ownerName || ownerEmail,
    phone,
    role: "owner",
    roleId: "owner",
    active: true,
    tenantId: restaurantSlug,
    tenantIds: [restaurantSlug],
    restaurantIds: [restaurantSlug],
    branchIds: [],
    forcePasswordReset: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
  }, { merge: true });

  await db.collection("onboarding_checklists").doc(restaurantSlug).set({
    id: restaurantSlug,
    restaurantId: restaurantSlug,
    ownerId: user.uid,
    leadId,
    status: "not-started",
    steps: {
      profile: false,
      menu: false,
      branding: false,
      delivery: false,
      payments: false,
      training: false,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    convertedRestaurantId: restaurantSlug,
    convertedOwnerUid: user.uid,
    generatedTemporaryPassword: password,
    credentialsEmailStatus: "created; use Send credentials if SMTP delivery is required",
    convertedAt: new Date().toISOString(),
    convertedBy: adminUid,
  };
}

async function getOrCreateOwner(email: string, displayName: string, password: string) {
  try {
    const existing = await adminAuth().getUserByEmail(email);
    await adminAuth().updateUser(existing.uid, { displayName, password, disabled: false });
    return existing;
  } catch {
    return adminAuth().createUser({
      email,
      displayName,
      password,
      disabled: false,
      emailVerified: false,
    });
  }
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "restaurant";
}

function generateTemporaryPassword() {
  return `SF-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}!`;
}
