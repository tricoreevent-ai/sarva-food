import { existsSync, readFileSync } from "node:fs";
import { assertProductionFirestoreAllowed, productionFirestorePlan } from "./lib/production-firestore-guard.mjs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sarva-food-app";
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const serviceAccountPath = "service-account-key.json";
const serviceAccount = existsSync(serviceAccountPath)
  ? JSON.parse(readFileSync(serviceAccountPath, "utf8"))
  : null;

const apply = process.argv.includes("--apply");

assertProductionFirestoreAllowed(productionFirestorePlan({
  name: `repair-cafe-owner-menu:${apply ? "apply" : "dry-run"}`,
  projectId: serviceAccount?.project_id ?? projectId,
  reads: 2_500,
  writes: apply ? 500 : 0,
  deletes: apply ? 500 : 0,
  details: [
    "scans users, ownerProfiles, menus, and alias-matched menu documents",
    "apply mode repairs Cafe owner/menu records",
  ],
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
const auth = getAuth(app);
const restaurantId = process.env.REPAIR_RESTAURANT_ID || "cafe-al-arab-thanisandra";
const ownerEmail = (process.env.REPAIR_OWNER_EMAIL || "divakdi@gmail.com").trim().toLowerCase();
const ownerName = process.env.REPAIR_OWNER_NAME || "Le Babu";
const branchId = `br-${restaurantId}`;
const aliases = [restaurantId, "cafe-al-arab-ul", "cafe-al-arab-ul-thanisandra", "cafe-al-arab"];
const now = FieldValue.serverTimestamp();
const categories = [
  { id: `${restaurantId}-cat-meals`, name: "Meals", sortOrder: 10 },
  { id: `${restaurantId}-cat-seafood`, name: "Seafood", sortOrder: 20 },
  { id: `${restaurantId}-cat-biryani`, name: "Biryani", sortOrder: 30 },
  { id: `${restaurantId}-cat-curry`, name: "Kerala Curries", sortOrder: 40 },
  { id: `${restaurantId}-cat-breads`, name: "Breads & Combos", sortOrder: 50 },
];
const menuItems = [
  menu("kerala-meals-fish-fry", "Kerala Meals with Fish Fry", "Meals", "Traditional Kerala rice meals with fish fry, sambar, rasam, thoran, pickle, and curd.", 199, 220, 240, "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80", false, ["meals", "fish fry", "lunch", "kerala"], 10),
  menu("ayila-fish-fry", "Ayila Fish Fry", "Seafood", "Kerala-style mackerel fry marinated with chilli, turmeric, pepper, and curry leaves.", 199, 209, 229, "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80", false, ["seafood", "fish fry", "ayila"], 20),
  menu("karimeen-pollichathu", "Karimeen Pollichathu", "Seafood", "Pearl spot fish wrapped and roasted with Kerala masala, coconut oil, and banana leaf aroma.", 360, 380, 399, "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=900&q=80", false, ["seafood", "karimeen", "banana leaf"], 30),
  menu("malabar-chicken-biryani", "Malabar Chicken Biryani", "Biryani", "Short-grain rice layered with chicken masala, fried onions, cashew, raisins, and boiled egg.", 229, 249, 269, "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=900&q=80", false, ["biryani", "malabar", "chicken"], 40),
  menu("beef-coconut-fry", "Kerala Beef Coconut Fry", "Kerala Curries", "Slow-cooked beef tossed with roasted coconut slices, shallots, black pepper, and curry leaves.", 280, 300, 320, "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80", false, ["beef", "kerala", "coconut fry"], 50),
  menu("appam-chicken-stew", "Appam with Chicken Stew", "Breads & Combos", "Soft appam served with mild coconut milk chicken stew and whole spices.", 210, 220, 240, "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=900&q=80", false, ["appam", "stew", "chicken"], 60),
  menu("parotta-beef-curry", "Kerala Parotta with Beef Curry", "Breads & Combos", "Layered Kerala parotta paired with peppery beef curry and curry leaves.", 240, 260, 280, "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80", false, ["parotta", "beef curry", "combo"], 70),
];
const authUser = await auth.getUserByEmail(ownerEmail).catch(() => null);

const users = await db.collection("users").get();
const ownerProfiles = await db.collection("ownerProfiles").get();
const matchingUsers = users.docs.filter((doc) => isCafeOwnerDoc(doc.data()));
const matchingOwnerProfiles = ownerProfiles.docs.filter((doc) => isCafeOwnerDoc(doc.data()));
const canonicalUserId = pickCanonicalUserId(matchingUsers, authUser?.uid);
const canonicalUserRef = db.collection("users").doc(canonicalUserId);
const duplicateUsers = matchingUsers.filter((doc) => doc.id !== canonicalUserId);
const duplicateOwnerProfiles = matchingOwnerProfiles.filter((doc) => doc.id !== canonicalUserId);
const canonicalMenuIds = new Set(menuItems.map((item) => item.id));
const cafeMenuDocs = await collectCafeDocs(["menus"]);
const obsoleteMenus = cafeMenuDocs.filter((doc) => !canonicalMenuIds.has(doc.id));
const legacyMenuDocs = await collectCafeDocs(["menuItems", "dineInMenus", "parcelMenus", "deliveryMenus"]);
const writes = [];

set(canonicalUserRef, {
  id: canonicalUserId,
  uid: canonicalUserId,
  displayName: ownerName,
  email: ownerEmail,
  role: "owner",
  roleId: "owner",
  tenantId: restaurantId,
  tenantIds: [restaurantId],
  restaurantIds: [restaurantId],
  branchIds: [branchId],
  active: true,
  isDeleted: false,
  updatedAt: now,
}, { merge: true });

set(db.collection("ownerProfiles").doc(canonicalUserId), {
  id: canonicalUserId,
  uid: canonicalUserId,
  displayName: ownerName,
  ownerName,
  email: ownerEmail,
  businessEmail: ownerEmail,
  tenantId: restaurantId,
  tenantIds: [restaurantId],
  restaurantIds: [restaurantId],
  branchIds: [branchId],
  active: true,
  isDeleted: false,
  updatedAt: now,
}, { merge: true });

for (const duplicate of [...duplicateUsers, ...duplicateOwnerProfiles]) del(duplicate.ref);
for (const doc of [...obsoleteMenus, ...legacyMenuDocs]) del(doc.ref);

set(db.collection("restaurants").doc(restaurantId), {
  id: restaurantId,
  tenantId: restaurantId,
  slug: restaurantId,
  name: "Cafe Al Arab UL",
  displayName: "Cafe Al Arab UL",
  ownerId: canonicalUserId,
  ownerIds: [canonicalUserId],
  ownerEmail,
  primaryBranchId: branchId,
  branchId,
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

for (const category of categories) {
  set(db.collection("menuCategories").doc(category.id), {
    ...category,
    tenantId: restaurantId,
    restaurantId,
    ownerId: canonicalUserId,
    ownerEmail,
    branchId,
    active: true,
    isDeleted: false,
    updatedAt: now,
  }, { merge: true });
}

for (const item of menuItems) {
  set(db.collection("menus").doc(item.id), {
    ...item,
    tenantId: restaurantId,
    restaurantId,
    ownerId: canonicalUserId,
    ownerEmail,
    branchId,
    imagePaths: [item.imagePath],
    available: true,
    soldOut: false,
    isDeleted: false,
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
    channelConfig: {
      "dine-in": { visible: true, available: true, price: item.dineInPrice, taxRate: 5, packingCharge: 0 },
      parcel: { visible: true, available: true, price: item.parcelPrice, taxRate: 5, packingCharge: 0 },
      delivery: { visible: true, available: true, price: item.deliveryPrice, taxRate: 5, packingCharge: 0 },
    },
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

console.log(JSON.stringify({
  apply,
  projectId: serviceAccount?.project_id ?? projectId,
  authUid: authUser?.uid ?? null,
  canonicalUserId,
  ownerEmail,
  restaurantId,
  duplicateUsers: duplicateUsers.map((doc) => doc.id),
  duplicateOwnerProfiles: duplicateOwnerProfiles.map((doc) => doc.id),
  obsoleteMenus: obsoleteMenus.map((doc) => doc.id),
  legacyMenuDocs: legacyMenuDocs.map((doc) => doc.ref.path),
  canonicalMenuIds: [...canonicalMenuIds],
}, null, 2));

if (!apply) {
  console.log("Dry run only. Re-run with --apply to write changes.");
  process.exit(0);
}

await commitWrites(writes);
const finalMenus = (await db.collection("menus").where("tenantId", "==", restaurantId).get()).docs
  .map((doc) => ({ id: doc.id, ...doc.data() }))
  .filter((item) => !item.isDeleted)
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

console.log(JSON.stringify({
  applied: true,
  ownerId: canonicalUserId,
  menuCount: finalMenus.length,
  menuNames: finalMenus.map((item) => item.name),
}, null, 2));

function isCafeOwnerDoc(data) {
  const email = String(data.email || data.businessEmail || "").trim().toLowerCase();
  const ids = new Set([data.tenantId, data.restaurantId, ...(data.tenantIds ?? []), ...(data.restaurantIds ?? [])].filter(Boolean));
  const ownsCafe = aliases.some((alias) => ids.has(alias));
  return email === ownerEmail || (ownsCafe && String(data.role || data.roleId || "").toLowerCase().includes("owner"));
}

function pickCanonicalUserId(docs, authUid) {
  if (authUid) return authUid;
  const byEmailAndRestaurant = docs.find((doc) => {
    const data = doc.data();
    return String(data.email || "").trim().toLowerCase() === ownerEmail && (data.restaurantIds ?? []).includes(restaurantId);
  });
  return byEmailAndRestaurant?.id ?? docs.find((doc) => String(doc.data().email || "").trim().toLowerCase() === ownerEmail)?.id ?? docs[0]?.id ?? restaurantId;
}

async function collectCafeDocs(collections) {
  const map = new Map();
  await Promise.all(collections.flatMap((collectionName) =>
    ["tenantId", "restaurantId"].flatMap((field) =>
      aliases.map((alias) =>
        db.collection(collectionName).where(field, "==", alias).get().then((snapshot) => {
          snapshot.docs.forEach((doc) => map.set(doc.ref.path, doc));
        }),
      ),
    ),
  ));
  return [...map.values()];
}

function set(ref, data, options) {
  writes.push({ type: "set", ref, data, options });
}

function del(ref) {
  writes.push({ type: "delete", ref });
}

async function commitWrites(items) {
  for (let index = 0; index < items.length; index += 450) {
    const batch = db.batch();
    for (const item of items.slice(index, index + 450)) {
      if (item.type === "delete") batch.delete(item.ref);
      else batch.set(item.ref, item.data, item.options);
    }
    await batch.commit();
  }
}

function normalizePrivateKey(value) {
  if (!value) return undefined;
  return value.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
}

function menu(slug, name, category, description, dineInPrice, parcelPrice, deliveryPrice, imagePath, isVeg, keywords, sortOrder) {
  return {
    id: `${restaurantId}-${slug}`,
    categoryId: `${restaurantId}-cat-${categorySlug(category)}`,
    category,
    name,
    description,
    longDescription: description,
    price: dineInPrice,
    dineInPrice,
    parcelPrice,
    deliveryPrice,
    taxRate: 5,
    packingCharge: 0,
    imagePath,
    isVeg,
    foodType: isVeg ? "veg" : "nonveg",
    prepTime: "15 min",
    tags: sortOrder <= 30 ? ["bestseller"] : [],
    badges: [category],
    searchKeywords: [name.toLowerCase(), category.toLowerCase(), ...keywords],
    sortOrder,
  };
}

function categorySlug(category) {
  return {
    Meals: "meals",
    Seafood: "seafood",
    Biryani: "biryani",
    "Kerala Curries": "curry",
    "Breads & Combos": "breads",
  }[category];
}
