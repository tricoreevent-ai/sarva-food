import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { defaultAppCuisines, slugifyCuisine } from "@/lib/default-app-cuisines";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { AppCuisine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CuisineRequest = {
  cuisine?: Partial<AppCuisine>;
  cuisines?: Partial<AppCuisine>[];
};

export async function GET() {
  const snapshot = await adminDb().collection("appCuisines").limit(200).get();
  const persistedCuisines = snapshot.docs
    .map((doc) => {
      const data = doc.data() as AppCuisine & { imagePath?: string; isDeleted?: boolean };
      return { ...data, image: data.image ?? data.imagePath, id: doc.id } as AppCuisine & { isDeleted?: boolean };
    });
  const deletedSlugs = new Set(
    persistedCuisines
      .filter((item) => item.isDeleted)
      .flatMap((item) => [item.id, item.slug].filter(Boolean)),
  );
  const cuisines = Array.from(new Map([
    ...defaultAppCuisines
      .filter((item) => !deletedSlugs.has(item.id) && !deletedSlugs.has(item.slug))
      .map((item) => [item.slug, item] as const),
    ...persistedCuisines
      .filter((item) => !item.isDeleted)
      .map((item) => [item.slug, item] as const),
  ]).values())
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0) || first.name.localeCompare(second.name));

  return NextResponse.json({
    cuisines,
  });
}

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => ({}))) as CuisineRequest;
  const cuisines = body.cuisines ?? (body.cuisine ? [body.cuisine] : []);
  if (!cuisines.length) {
    return NextResponse.json({ error: "Cuisine data is required." }, { status: 400 });
  }

  const batch = adminDb().batch();
  const saved: AppCuisine[] = [];
  cuisines.forEach((input, index) => {
    const name = String(input.name ?? "").trim();
    if (!name) return;
    const slug = slugifyCuisine(input.slug || name);
    const id = input.id || slug;
    const sortOrder = Number(input.sortOrder) || index + 1;
    const payload = sanitize({
      name,
      slug,
      imagePath: input.image?.trim(),
      icon: input.icon?.trim(),
      color: input.color?.trim(),
      sortOrder,
      active: input.active !== false,
      description: input.description?.trim(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      isDeleted: false,
    });
    batch.set(adminDb().collection("appCuisines").doc(id), payload, { merge: true });
    saved.push({
      id,
      name,
      slug,
      image: input.image?.trim(),
      icon: input.icon?.trim(),
      color: input.color?.trim(),
      sortOrder,
      active: input.active !== false,
      description: input.description?.trim(),
    });
  });

  if (!saved.length) {
    return NextResponse.json({ error: "At least one cuisine name is required." }, { status: 400 });
  }

  await batch.commit();
  return NextResponse.json({ ok: true, cuisines: saved });
}

export async function DELETE(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Cuisine id is required." }, { status: 400 });
  }
  await adminDb().collection("appCuisines").doc(id).set({
    active: false,
    isDeleted: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return NextResponse.json({ ok: true, id });
}

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }
  return null;
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
