import { existsSync, readFileSync } from "node:fs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const serviceAccountPath = "service-account-key.json";
const serviceAccount = existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

const legacyIds = [
  "cafe-al-arab-thanisandra-chicken-shawarma-roll",
  "cafe-al-arab-thanisandra-alfaham-half",
  "cafe-al-arab-thanisandra-chicken-mandi",
  "cafe-al-arab-thanisandra-falafel-pita",
  "menu-chicken-shawarma-roll",
  "menu-al-faham-half",
  "menu-chicken-mandi",
  "menu-falafel-pita",
];

const collections = ["menus", "menuItems", "dineInMenus", "parcelMenus", "deliveryMenus"];
const apply = process.argv.includes("--apply");

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
});

const db = getFirestore(app);
const matches = [];

for (const collectionName of collections) {
  for (const id of legacyIds) {
    const ref = db.collection(collectionName).doc(id);
    const snapshot = await ref.get();
    if (snapshot.exists) matches.push(ref);
  }
}

if (!matches.length) {
  console.log("No legacy seeded menu documents found.");
  process.exit(0);
}

console.log(`${apply ? "Deleting" : "Found"} ${matches.length} legacy seeded menu documents:`);
matches.forEach((ref) => console.log(`- ${ref.path}`));

if (!apply) {
  console.log("Dry run only. Re-run with --apply to delete these exact legacy seed documents.");
  process.exit(0);
}

const batch = db.batch();
matches.forEach((ref) => batch.delete(ref));
await batch.commit();
console.log("Legacy seeded menu documents deleted.");

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
