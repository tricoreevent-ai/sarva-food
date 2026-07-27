"use client";

import { collection, getDocs, limit, query, where, type Firestore } from "firebase/firestore";
import { getFirebaseApp, getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";

type AuditInput = {
  restaurantId?: string;
  restaurantSlug?: string;
  ownerId?: string;
};

type QueryField = "restaurantId" | "restaurantSlug" | "slug" | "tenantId" | "ownerId";

const menuCollections = ["menuItems", "menus", "restaurant_menus", "items", "foodItems"];
const categoryCollections = ["menuCategories", "categories", "restaurant_categories"];
const auditedKeys = new Set<string>();

export function runDataConsistencyAudit(input: AuditInput) {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined" || !isFirebaseConfigured) return;

  const restaurantId = input.restaurantId || input.restaurantSlug || "";
  const key = `${restaurantId}:${input.ownerId ?? ""}`;
  if (!restaurantId || auditedKeys.has(key)) return;
  auditedKeys.add(key);

  window.setTimeout(() => {
    void runAudit(input).catch((error) => {
      console.warn("[Food Gedi data audit] audit failed.", error instanceof Error ? error.name : typeof error);
    });
  }, 800);
}

async function runAudit(input: AuditInput) {
  const db = getFirebaseDb();
  const env = {
    projectId: getFirebaseApp().options.projectId ?? "unknown",
    emulator: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS ?? "false",
    host: window.location.host,
  };
  const restaurantIds = unique([input.restaurantId, input.restaurantSlug]);
  const ownerIds = unique([input.ownerId]);

  const [menus, categories] = await Promise.all([
    auditCollections(db, menuCollections, restaurantIds, ownerIds),
    auditCollections(db, categoryCollections, restaurantIds, ownerIds),
  ]);

  console.groupCollapsed("[Food Gedi data audit] restaurant/customer data consistency");
  console.info("environment", env);
  console.info("restaurant", input);
  console.table(menus.map((entry) => ({
    collection: entry.collectionName,
    field: entry.field,
    count: entry.count,
    sampleNames: entry.sampleNames.join(", "),
    sampleImages: entry.sampleImages.join(", "),
  })));
  console.table(categories.map((entry) => ({
    collection: entry.collectionName,
    field: entry.field,
    count: entry.count,
    sampleNames: entry.sampleNames.join(", "),
  })));
  console.groupEnd();
}

async function auditCollections(db: Firestore, collectionNames: string[], restaurantIds: string[], ownerIds: string[]) {
  const entries = [
    ...restaurantIds.flatMap((value) => buildQueries(collectionNames, ["restaurantId", "restaurantSlug", "slug", "tenantId"], value)),
    ...ownerIds.flatMap((value) => buildQueries(collectionNames, ["ownerId"], value)),
  ];
  const rows = await Promise.all(entries.map((entry) => readAuditQuery(db, entry.collectionName, entry.field, entry.value)));
  return rows.filter((entry) => entry.count > 0);
}

function buildQueries(collectionNames: string[], fields: QueryField[], value: string) {
  return collectionNames.flatMap((collectionName) => fields.map((field) => ({ collectionName, field, value })));
}

async function readAuditQuery(db: Firestore, collectionName: string, field: QueryField, value: string) {
  try {
    const snapshot = await getDocs(query(collection(db, collectionName), where(field, "==", value), limit(25)));
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));
    return {
      collectionName,
      field,
      count: snapshot.size,
      sampleNames: docs.map((doc) => String(doc.name ?? doc.title ?? doc.id)).slice(0, 5),
      sampleImages: docs.flatMap((doc) => imageFields(doc)).slice(0, 5),
    };
  } catch {
    return { collectionName, field, count: 0, sampleNames: [], sampleImages: [] };
  }
}

function imageFields(doc: Record<string, unknown>) {
  return [
    doc.image,
    doc.imageUrl,
    doc.imagePath,
    doc.thumbnail,
    doc.primaryImage,
    ...(Array.isArray(doc.imagePaths) ? doc.imagePaths : []),
    ...(Array.isArray(doc.gallery) ? doc.gallery : []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.slice(0, 80));
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
