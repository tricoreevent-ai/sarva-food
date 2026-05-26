import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { slugifyCategory } from "@/lib/default-app-categories";
import { getSessionFromRequest } from "@/lib/server-auth";
import type { AppCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CategoryRequest = {
  category?: Partial<AppCategory>;
  categories?: Partial<AppCategory>[];
};

export async function GET() {
  const snapshot = await adminDb().collection("appCategories").limit(200).get();
  const categories = snapshot.docs
    .map((doc) => {
      const data = doc.data() as AppCategory & { imagePath?: string };
      return { ...data, id: doc.id, image: data.image ?? data.imagePath } as AppCategory;
    })
    .filter((item) => !("isDeleted" in item) || !(item as AppCategory & { isDeleted?: boolean }).isDeleted)
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => ({}))) as CategoryRequest;
  const categories = body.categories ?? (body.category ? [body.category] : []);
  if (!categories.length) {
    return NextResponse.json({ error: "Category data is required." }, { status: 400 });
  }

  const batch = adminDb().batch();
  const saved: AppCategory[] = [];
  categories.forEach((input, index) => {
    const name = String(input.name ?? "").trim();
    if (!name) return;
    const slug = slugifyCategory(input.slug || name);
    const id = input.id || slug;
    const payload = sanitize({
      name,
      slug,
      imagePath: input.image,
      image: input.image,
      icon: input.icon,
      sortOrder: Number(input.sortOrder) || index + 1,
      active: input.active !== false,
      colorTheme: input.colorTheme,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      isDeleted: false,
    });
    batch.set(adminDb().collection("appCategories").doc(id), payload, { merge: true });
    saved.push({
      id,
      name,
      slug,
      image: input.image,
      icon: input.icon,
      sortOrder: Number(input.sortOrder) || index + 1,
      active: input.active !== false,
      colorTheme: input.colorTheme,
    });
  });

  if (!saved.length) {
    return NextResponse.json({ error: "At least one category name is required." }, { status: 400 });
  }

  await batch.commit();
  return NextResponse.json({ ok: true, categories: saved });
}

export async function DELETE(request: NextRequest) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Category id is required." }, { status: 400 });
  }
  await adminDb().collection("appCategories").doc(id).set({
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
