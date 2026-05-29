import { existsSync, readFileSync } from "node:fs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sarva-food-app";
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sarva-food-app.firebasestorage.app";
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const serviceAccountPath = "service-account-key.json";
const serviceAccount = existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

const app = getApps()[0] || initializeApp({
  credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : serviceAccount?.client_email && serviceAccount?.private_key
      ? cert({
        projectId: serviceAccount.project_id ?? projectId,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      })
      : applicationDefault(),
  projectId: serviceAccount?.project_id ?? projectId,
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
const launchRestaurantIds = new Set(["cafe-al-arab-thanisandra", "falak-leela-bhartiya"]);
const relatedCollections = [
  "restaurants",
  "branches",
  "menus",
  "menuCategories",
  "menuItems",
  "dineInMenus",
  "parcelMenus",
  "deliveryMenus",
  "offers",
  "orders",
  "customerOrders",
  "customerReviews",
  "deliveryZones",
];

const summary = {
  mode: apply ? "apply" : "dry-run",
  launchRestaurantIds: Array.from(launchRestaurantIds),
  restaurantsScanned: 0,
  restaurantsMarked: 0,
  relatedDocsMarked: 0,
};

const restaurantSnapshot = await db.collection("restaurants").get();
const staleRestaurantIds = [];

for (const doc of restaurantSnapshot.docs) {
  summary.restaurantsScanned += 1;
  const data = doc.data();
  const slug = data.slug || data.id || doc.id;
  if (launchRestaurantIds.has(slug) || launchRestaurantIds.has(doc.id)) continue;
  staleRestaurantIds.push(slug);
  summary.restaurantsMarked += 1;
  if (apply) {
    await doc.ref.set(softDeletePayload(), { merge: true });
  }
}

for (const restaurantId of staleRestaurantIds) {
  for (const collectionName of relatedCollections.filter((name) => name !== "restaurants")) {
    const snapshot = await db.collection(collectionName).where("restaurantId", "==", restaurantId).limit(500).get();
    summary.relatedDocsMarked += snapshot.size;
    if (!apply) continue;
    for (const doc of snapshot.docs) {
      await doc.ref.set(softDeletePayload(), { merge: true });
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
if (!apply) {
  console.log("Dry run only. Re-run with --apply to soft-delete non-launch restaurants and related records.");
}

function softDeletePayload() {
  return {
    active: false,
    isDeleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: "launch-cleanup",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "launch-cleanup",
  };
}
