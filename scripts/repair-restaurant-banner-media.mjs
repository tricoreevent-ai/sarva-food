import { existsSync, readFileSync } from "node:fs";
import { assertProductionFirestoreAllowed, productionFirestorePlan } from "./lib/production-firestore-guard.mjs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sarva-food-app";
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const serviceAccountPath = "service-account-key.json";
const serviceAccount = existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

const restaurantId = process.argv[2] || "cafe-al-arab-thanisandra";

assertProductionFirestoreAllowed(productionFirestorePlan({
  name: "repair-restaurant-banner-media",
  projectId: serviceAccount?.project_id ?? projectId,
  reads: 1,
  writes: 1,
  details: [`repairs restaurants/${restaurantId} banner fields`],
}));

const app = getApps()[0] || initializeApp({
  credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : serviceAccount?.client_email && serviceAccount?.private_key
      ? cert(serviceAccount)
      : applicationDefault(),
  projectId: serviceAccount?.project_id ?? projectId,
});

const db = getFirestore(app);
const restaurantRef = db.collection("restaurants").doc(restaurantId);
const snapshot = await restaurantRef.get();

if (!snapshot.exists) {
  throw new Error(`Restaurant not found: ${restaurantId}`);
}

const restaurant = snapshot.data() ?? {};
const cleanBannerPaths = Array.from(new Set(
  (restaurant.coverImagePaths ?? [])
    .filter(Boolean)
    .filter((path) => path !== restaurant.logoPath),
));
const fallbackBanner = restaurant.coverImagePath || restaurant.imagePath;
const nextBannerPaths = cleanBannerPaths.length ? cleanBannerPaths : [fallbackBanner].filter(Boolean);

await restaurantRef.update({
  coverImagePath: nextBannerPaths.includes(restaurant.coverImagePath)
    ? restaurant.coverImagePath
    : nextBannerPaths[0] ?? "",
  coverImagePaths: nextBannerPaths,
  updatedAt: FieldValue.serverTimestamp(),
});

console.log(`Repaired ${restaurantId}: ${nextBannerPaths.length} customer banner(s).`);

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
