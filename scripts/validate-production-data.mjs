import { existsSync, readFileSync } from "node:fs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const serviceAccountPath = "service-account-key.json";
const serviceAccount = !clientEmail && !privateKey && existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

if (!projectId) {
  throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
}

const app = getApps()[0] || initializeApp({
  credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : serviceAccount
      ? cert(serviceAccount)
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

const requiredTenantCollections = [
  "restaurants",
  "branches",
  "menus",
  "menuItems",
  "deliveryMenus",
  "dineInMenus",
  "parcelMenus",
  "offers",
  "orders",
  "cateringRequests",
  "callbackRequests",
];

const errors = [];
const warnings = [];

const restaurants = await getCollection("restaurants");
const branches = await getCollection("branches");
const users = await getCollection("users");
const menus = await getCollection("menus");
const menuItems = await getCollection("menuItems");

const restaurantIds = new Set(restaurants.map((item) => item.id));
const branchIds = new Set(branches.map((item) => item.id));
const userIds = new Set(users.map((item) => item.id));

for (const restaurant of restaurants) {
  if (!restaurant.tenantId) errors.push(`restaurants/${restaurant.id} missing tenantId`);
  if (!restaurant.ownerId && !restaurant.ownerIds?.length) errors.push(`restaurants/${restaurant.id} missing ownerId/ownerIds`);
  if (!restaurant.branchId && !restaurant.primaryBranchId) errors.push(`restaurants/${restaurant.id} missing branchId/primaryBranchId`);
  const ownerIds = [restaurant.ownerId, ...(restaurant.ownerIds ?? [])].filter(Boolean);
  if (ownerIds.length && !ownerIds.some((ownerId) => userIds.has(ownerId))) warnings.push(`restaurants/${restaurant.id} owner user not found in users collection`);
  const restaurantBranchId = restaurant.branchId ?? restaurant.primaryBranchId;
  if (restaurantBranchId && !branchIds.has(restaurantBranchId)) errors.push(`restaurants/${restaurant.id} references missing branch ${restaurantBranchId}`);
}

for (const user of users) {
  if (user.role === "owner" && !user.restaurantIds?.length && !user.tenantId) {
    errors.push(`users/${user.id} owner has no restaurantIds or tenantId`);
  }
}

for (const branch of branches) {
  if (!branch.tenantId) errors.push(`branches/${branch.id} missing tenantId`);
  if (!branch.restaurantId || !restaurantIds.has(branch.restaurantId)) errors.push(`branches/${branch.id} references missing restaurant`);
}

for (const collectionName of requiredTenantCollections) {
  const docs = await getCollection(collectionName);
  for (const item of docs) {
    if (!item.tenantId) errors.push(`${collectionName}/${item.id} missing tenantId`);
    if (["menus", "menuItems", "deliveryMenus", "dineInMenus", "parcelMenus", "offers", "orders", "cateringRequests", "callbackRequests"].includes(collectionName)) {
      if (!item.restaurantId) errors.push(`${collectionName}/${item.id} missing restaurantId`);
      if (item.restaurantId && !restaurantIds.has(item.restaurantId)) errors.push(`${collectionName}/${item.id} references missing restaurant ${item.restaurantId}`);
    }
  }
}

for (const restaurant of restaurants) {
  const restaurantMenuItems = menuItems.filter((item) => item.restaurantId === restaurant.id);
  const channelCounts = {
    dineIn: restaurantMenuItems.filter((item) => item.menuVisibility?.["dine-in"] !== false && item.channelConfig?.["dine-in"]?.visible !== false).length,
    parcel: restaurantMenuItems.filter((item) => item.menuVisibility?.parcel !== false && item.channelConfig?.parcel?.visible !== false).length,
    delivery: restaurantMenuItems.filter((item) => item.menuVisibility?.delivery !== false && item.channelConfig?.delivery?.visible !== false).length,
  };
  if (!channelCounts.dineIn || !channelCounts.parcel || !channelCounts.delivery) {
    errors.push(`restaurants/${restaurant.id} does not have all three active menu channels`);
  }
  const menusForRestaurant = menus.filter((item) => item.restaurantId === restaurant.id);
  for (const menuType of ["dine-in", "parcel", "delivery"]) {
    if (!menusForRestaurant.some((item) => item.menuType === menuType || item.channels?.includes(menuType))) {
      errors.push(`restaurants/${restaurant.id} missing ${menuType} menu document`);
    }
  }
}

const summary = {
  restaurants: restaurants.length,
  branches: branches.length,
  users: users.length,
  menuItems: menuItems.length,
  errors,
  warnings,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  process.exit(1);
}

async function getCollection(name) {
  const snapshot = await db.collection(name).limit(2000).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => item.isDeleted !== true && !String(item.id).startsWith("_"));
}
