import { existsSync, readFileSync } from "node:fs";

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

const app = getApps()[0] || initializeApp({
  credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : serviceAccount?.client_email && serviceAccount?.private_key
      ? cert(serviceAccount)
      : applicationDefault(),
  projectId: serviceAccount?.project_id ?? projectId,
});

const db = getFirestore(app);
const apply = process.argv.includes("--apply");
const restaurantId = process.env.REPAIR_RESTAURANT_ID || "cafe-al-arab-thanisandra";
const ownerEmail = (process.env.REPAIR_OWNER_EMAIL || "divakdi@gmail.com").trim().toLowerCase();
const ownerName = process.env.REPAIR_OWNER_NAME || "Le Babu";
const menuItemId = `${restaurantId}-meals`;
const now = FieldValue.serverTimestamp();

const users = await db.collection("users").where("email", "==", ownerEmail).get();
const ownerProfiles = await db.collection("ownerProfiles").where("email", "==", ownerEmail).get();
const canonicalUser = pickCanonicalUser(users.docs);

if (!canonicalUser) {
  throw new Error(`No users profile found for ${ownerEmail}.`);
}

const duplicateUsers = users.docs.filter((doc) => doc.id !== canonicalUser.id);
const duplicateOwnerProfiles = ownerProfiles.docs.filter((doc) => doc.id !== canonicalUser.id);

console.log(JSON.stringify({
  apply,
  canonicalUser: canonicalUser.id,
  duplicateUsers: duplicateUsers.map((doc) => doc.id),
  duplicateOwnerProfiles: duplicateOwnerProfiles.map((doc) => doc.id),
  restaurantId,
  menuItemId,
}, null, 2));

if (!apply) {
  console.log("Dry run only. Re-run with --apply to write changes.");
  process.exit(0);
}

const batch = db.batch();

batch.set(canonicalUser.ref, {
  id: canonicalUser.id,
  uid: canonicalUser.id,
  displayName: ownerName,
  email: ownerEmail,
  role: "owner",
  roleId: "owner",
  tenantId: restaurantId,
  tenantIds: [restaurantId],
  restaurantIds: [restaurantId],
  branchIds: [`br-${restaurantId}`],
  active: true,
  updatedAt: now,
}, { merge: true });

for (const duplicate of duplicateUsers) {
  batch.delete(duplicate.ref);
}

for (const duplicate of duplicateOwnerProfiles) {
  batch.delete(duplicate.ref);
}

batch.set(db.collection("restaurants").doc(restaurantId), {
  ownerId: canonicalUser.id,
  ownerIds: [canonicalUser.id],
  active: true,
  approved: true,
  profileComplete: true,
  publicListingEnabled: true,
  contact: {
    phone: "+919900030001",
    whatsapp: "+919900030001",
    supportEmail: ownerEmail,
    callbackEnabled: true,
  },
  ownerProfile: {
    businessPhone: "+919900030001",
    businessWhatsapp: "+919900030001",
    businessEmail: ownerEmail,
    cateringPhone: "+919900130001",
    cateringWhatsapp: "+919900130001",
    cateringEmail: ownerEmail,
    emergencyPhone: "+919900230001",
  },
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("menuCategories").doc(`${restaurantId}-cat-meals`), {
  id: `${restaurantId}-cat-meals`,
  tenantId: restaurantId,
  restaurantId,
  ownerId: canonicalUser.id,
  branchId: `br-${restaurantId}`,
  name: "Meals",
  sortOrder: 10,
  active: true,
  isDeleted: false,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("menus").doc(menuItemId), {
  id: menuItemId,
  tenantId: restaurantId,
  restaurantId,
  ownerId: canonicalUser.id,
  branchId: `br-${restaurantId}`,
  categoryId: `${restaurantId}-cat-meals`,
  category: "Meals",
  name: "Meals",
  description: "Kerala meals with fish fry",
  longDescription: "Kerala meals with fish fry",
  price: 199,
  dineInPrice: 199,
  parcelPrice: 220,
  deliveryPrice: 240,
  taxRate: 5,
  packingCharge: 0,
  imagePath: "/images/fallback-food.svg",
  imagePaths: ["/images/fallback-food.svg"],
  isVeg: false,
  foodType: "nonveg",
  prepTime: "10",
  available: true,
  soldOut: false,
  menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  channelConfig: {
    "dine-in": { visible: true, available: true, price: 199, taxRate: 5, packingCharge: 0 },
    parcel: { visible: true, available: true, price: 220, taxRate: 5, packingCharge: 0 },
    delivery: { visible: true, available: true, price: 240, taxRate: 5, packingCharge: 0 },
  },
  tags: ["bestseller"],
  badges: ["Meals"],
  searchKeywords: ["meals", "kerala", "fish fry", "lunch"],
  sortOrder: 10,
  isDeleted: false,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

await batch.commit();
console.log("Cafe owner/menu repair applied.");

function pickCanonicalUser(docs) {
  return docs.find((doc) => {
    const data = doc.data();
    return data.role === "owner" && Array.isArray(data.restaurantIds) && data.restaurantIds.includes(restaurantId);
  }) ?? docs[0] ?? null;
}

function normalizePrivateKey(value) {
  if (!value) return undefined;
  return value.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
}
