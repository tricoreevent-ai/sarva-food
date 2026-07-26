import { existsSync } from "node:fs";
import { assertProductionFirestoreAllowed, productionFirestorePlan } from "./lib/production-firestore-guard.mjs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

if (!projectId) {
  throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
}

assertProductionFirestoreAllowed(productionFirestorePlan({
  name: `firestore-production-cleanup:${apply ? "apply" : "dry-run"}`,
  projectId,
  reads: 40_000,
  writes: apply ? 40_000 : 0,
  details: [
    "40 tenant collections with limit(1000), plus restaurant duplicate scan",
    "apply mode may soft-delete or patch matching documents",
  ],
}));

const app = getApps()[0] || initializeApp({
  credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault(),
  projectId,
  storageBucket,
});

function normalizePrivateKey(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

const db = getFirestore(app);
const actor = "production-cleanup";

const tenantIsolatedCollections = [
  "orders",
  "tables",
  "kitchenOrders",
  "kotPrintQueue",
  "printers",
  "printerProfiles",
  "employees",
  "users",
  "payroll",
  "accounting",
  "accountingEntries",
  "accountingTransactions",
  "expenses",
  "expenseEntries",
  "inventory",
  "inventoryItems",
  "inventoryTransactions",
  "menus",
  "menuItems",
  "parcelMenus",
  "deliveryMenus",
  "dineInMenus",
  "menuCategories",
  "modifierGroups",
  "reports",
  "customers",
  "customerAddresses",
  "customerLoyalty",
  "loyaltyAccounts",
  "loyaltyCustomers",
  "offers",
  "campaigns",
  "notifications",
  "cateringRequests",
  "callbackRequests",
  "roles",
  "permissions",
  "branches",
  "restaurants",
];

const branchScopedCollections = new Set([
  "orders",
  "tables",
  "kitchenOrders",
  "kotPrintQueue",
  "printers",
  "printerProfiles",
  "employees",
  "payroll",
  "accounting",
  "accountingEntries",
  "accountingTransactions",
  "expenses",
  "expenseEntries",
  "inventory",
  "inventoryItems",
  "inventoryTransactions",
  "menus",
  "menuItems",
  "parcelMenus",
  "deliveryMenus",
  "dineInMenus",
  "menuCategories",
  "modifierGroups",
  "reports",
  "notifications",
  "cateringRequests",
  "callbackRequests",
]);

const obviousGarbagePattern = /\b(test|demo|dummy|fake|placeholder|sample)\b/i;

function containsGarbageMarker(data) {
  const haystack = [
    data.id,
    data.name,
    data.title,
    data.code,
    data.email,
    data.phone,
    data.address,
    data.placeId,
    data.ownerEmail,
  ].filter(Boolean).join(" ");

  return obviousGarbagePattern.test(haystack)
    || String(data.email ?? "").endsWith("@example.com")
    || String(data.id ?? "").startsWith("_collectionHealth")
    || String(data.placeId ?? "").startsWith("mapbox.demo");
}

function metadataPatch(data, collectionName) {
  const restaurantId = data.restaurantId || data.tenantId;
  const patch = {};
  if (!data.tenantId && restaurantId) patch.tenantId = restaurantId;
  if (branchScopedCollections.has(collectionName) && !data.branchId && data.primaryBranchId) patch.branchId = data.primaryBranchId;
  if (!data.createdBy) patch.createdBy = actor;
  if (!data.updatedBy) patch.updatedBy = actor;
  if (!data.updatedAt) patch.updatedAt = FieldValue.serverTimestamp();
  if (!("isDeleted" in data)) patch.isDeleted = false;
  return patch;
}

async function softDelete(ref) {
  if (!apply) return;
  await ref.set({
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: actor,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor,
  }, { merge: true });
}

async function updateMetadata(ref, patch) {
  if (!apply || !Object.keys(patch).length) return;
  await ref.set(patch, { merge: true });
}

const summary = {
  mode: apply ? "apply" : "dry-run",
  scanned: 0,
  metadataPatches: 0,
  garbageDeletes: 0,
  duplicateRestaurantDeletes: 0,
  collections: {},
};

for (const collectionName of tenantIsolatedCollections) {
  const snapshot = await db.collection(collectionName).limit(1000).get();
  summary.collections[collectionName] = snapshot.size;

  for (const doc of snapshot.docs) {
    const data = { id: doc.id, ...doc.data() };
    summary.scanned += 1;

    if (containsGarbageMarker(data)) {
      summary.garbageDeletes += 1;
      console.log(`[garbage] ${collectionName}/${doc.id}`);
      await softDelete(doc.ref);
      continue;
    }

    const patch = metadataPatch(data, collectionName);
    if (Object.keys(patch).length) {
      summary.metadataPatches += 1;
      console.log(`[metadata] ${collectionName}/${doc.id}`, patch);
      await updateMetadata(doc.ref, patch);
    }
  }
}

const restaurantSnapshot = await db.collection("restaurants").limit(1000).get();
const restaurantGroups = new Map();
for (const doc of restaurantSnapshot.docs) {
  const data = { id: doc.id, ...doc.data() };
  if (data.isDeleted) continue;
  const key = String(data.slug || data.name || doc.id).trim().toLowerCase();
  if (!key) continue;
  const group = restaurantGroups.get(key) ?? [];
  group.push({ ref: doc.ref, id: doc.id, data });
  restaurantGroups.set(key, group);
}

for (const [key, group] of restaurantGroups.entries()) {
  if (group.length <= 1) continue;
  const sorted = group.sort((first, second) => {
    const firstTime = first.data.updatedAt?.toMillis?.() ?? first.data.createdAt?.toMillis?.() ?? 0;
    const secondTime = second.data.updatedAt?.toMillis?.() ?? second.data.createdAt?.toMillis?.() ?? 0;
    return secondTime - firstTime;
  });
  const [, ...duplicates] = sorted;
  for (const duplicate of duplicates) {
    summary.duplicateRestaurantDeletes += 1;
    console.log(`[duplicate-restaurant] ${key}: ${duplicate.id}`);
    await softDelete(duplicate.ref);
  }
}

console.log(JSON.stringify(summary, null, 2));
if (!apply) {
  console.log("Dry-run only. Re-run with --apply after reviewing the output.");
}
