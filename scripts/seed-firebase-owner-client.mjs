import { existsSync } from "node:fs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const { initializeApp } = await import("firebase/app");
const {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} = await import("firebase/auth");
const {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} = await import("firebase/firestore");

const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
if (!password) {
  throw new Error("Set BOOTSTRAP_OWNER_PASSWORD for this one-time client seed.");
}

const restaurantId = "test-owner";
const branchId = "br-indiranagar";
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);
const email = "owner@sarva.test";

let credential;
let signInError;
try {
  credential = await signInWithEmailAndPassword(auth, email, password);
  console.log(`Signed in bootstrap owner: ${email}`);
} catch (error) {
  signInError = error;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: "Test Owner" });
    console.log(`Created bootstrap owner: ${email}`);
  } catch (createError) {
    if (createError?.code === "auth/email-already-in-use") {
      throw new Error(`Bootstrap owner ${email} exists, but sign-in failed with ${signInError?.code ?? "unknown-auth-error"}. Reset the Firebase Auth password or provide Admin credentials to set the profile without client sign-in.`);
    }
    throw createError;
  }
}

const uid = credential.user.uid;
const now = serverTimestamp();
const userProfile = {
  id: uid,
  uid,
  email,
  displayName: credential.user.displayName || "Test Owner",
  role: "owner",
  active: true,
  restaurantIds: [restaurantId],
  branchIds: [branchId],
  permissions: ["pos", "kds", "billing", "reports", "accounting", "inventory", "loyalty", "settings", "employees", "diagnostics"],
  createdAt: now,
  updatedAt: now,
};

await setDoc(doc(db, "users", uid), userProfile, { merge: true });
console.log(`Mapped Firestore owner profile: users/${uid}`);

const rolePermissions = {
  owner: userProfile.permissions,
  admin: [...userProfile.permissions, "platform"],
  manager: ["pos", "kds", "billing", "reports", "inventory", "loyalty", "employees"],
  cashier: ["pos", "billing", "loyalty"],
  waiter: ["pos", "kds"],
  chef: ["kds"],
  accountant: ["reports", "accounting"],
  "inventory-manager": ["inventory", "reports"],
  "delivery-staff": ["delivery", "orders"],
};

const requiredCollections = [
  "users", "roles", "restaurants", "branches", "tables", "orders", "orderItems", "kitchenOrders",
  "menuCategories", "menuItems", "deliveryMenus", "dineInMenus", "customers", "loyaltyCustomers",
  "accountingEntries", "expenses", "inventory", "inventoryTransactions", "purchaseOrders", "suppliers",
  "reports", "printerProfiles", "receiptTemplates", "offers", "coupons", "settings", "notifications",
  "staffActivityLogs", "paymentTransactions", "deliveryAgents", "customerAddresses",
];

const menuItems = [
  ["menu-chicken-shawarma-roll", "Chicken Shawarma Roll", "cat-shawarma", "Shawarma", 220, 12],
  ["menu-al-faham-half", "Al Faham Chicken Half", "cat-grill", "Grills", 360, 18],
  ["menu-chicken-mandi", "Chicken Mandi", "cat-mandi", "Mandi", 540, 20],
  ["menu-falafel-pita", "Falafel Pita", "cat-shawarma", "Shawarma", 180, 10],
  ["menu-baklava", "Baklava", "cat-desserts", "Desserts", 140, 8],
  ["menu-mint-lime", "Mint Lime", "cat-beverages", "Beverages", 90, 5],
];

const batch = writeBatch(db);

for (const [role, permissions] of Object.entries(rolePermissions)) {
  batch.set(doc(db, "roles", role), { id: role, restaurantId, role, permissions, branchRestrictions: role === "admin" ? [] : [branchId], createdAt: now, updatedAt: now }, { merge: true });
}

batch.set(doc(db, "restaurants", restaurantId), {
  id: restaurantId,
  name: "Cafe Al Arab",
  slug: restaurantId,
  active: true,
  approved: true,
  gstin: "29AABCT1234A1Z5",
  phone: "+919876543210",
  address: "12 100 Feet Road, Indiranagar, Bengaluru",
  latitude: 12.9719,
  longitude: 77.6412,
  deliveryRadiusKm: 7,
  cuisine: ["Arabic", "Shawarma", "Grills"],
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(doc(db, "branches", branchId), { id: branchId, restaurantId, name: "Cafe Al Arab Main Branch", address: "12 100 Feet Road, Indiranagar, Bengaluru", latitude: 12.9719, longitude: 77.6412, deliveryRadiusKm: 7, active: true, createdAt: now, updatedAt: now }, { merge: true });

for (const table of ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08"]) {
  batch.set(doc(db, "tables", table), { id: table, restaurantId, branchId, number: table, status: table === "T03" ? "occupied" : "available", seats: table === "T08" ? 6 : 4, assignedWaiterId: uid, createdAt: now, updatedAt: now }, { merge: true });
}

for (const [id, name, sortOrder] of [["cat-shawarma", "Shawarma", 1], ["cat-mandi", "Mandi", 2], ["cat-grill", "Grills", 3], ["cat-desserts", "Desserts", 4], ["cat-beverages", "Beverages", 5]]) {
  batch.set(doc(db, "menuCategories", id), { id, restaurantId, branchId, name, enabled: true, sortOrder, createdAt: now, updatedAt: now }, { merge: true });
}

for (const [id, name, categoryId, category, price, parcelCharge] of menuItems) {
  const payload = { id, restaurantId, branchId, name, categoryId, category, price, gstPercent: 5, parcelCharge, available: true, dineInPrice: price, parcelPrice: price + parcelCharge, deliveryPrice: price + parcelCharge + 15, modifiers: ["regular", "less spicy"], addOns: [], createdAt: now, updatedAt: now };
  batch.set(doc(db, "menuItems", id), payload, { merge: true });
  batch.set(doc(db, "dineInMenus", id), { ...payload, menuType: "dine-in" }, { merge: true });
  batch.set(doc(db, "deliveryMenus", id), { ...payload, menuType: "delivery" }, { merge: true });
}

for (const item of [
  ["inv-dosa-batter", "Dosa batter", 18, "kg", 5],
  ["inv-paneer", "Paneer", 7, "kg", 2],
  ["inv-basmati-rice", "Basmati rice", 32, "kg", 8],
  ["inv-chicken", "Chicken", 12, "kg", 4],
  ["inv-milk", "Milk", 22, "litre", 8],
]) {
  const [id, itemName, quantity, unit, reorderLevel] = item;
  batch.set(doc(db, "inventory", id), { id, restaurantId, branchId, itemName, quantity, unit, reorderLevel, supplierId: "sup-fresh-farms", createdAt: now, updatedAt: now }, { merge: true });
  batch.set(doc(db, "inventoryTransactions", `opening-${id}`), { id: `opening-${id}`, restaurantId, branchId, inventoryId: id, type: "opening-stock", quantity, unit, createdBy: uid, createdAt: now, updatedAt: now }, { merge: true });
}

batch.set(doc(db, "suppliers", "sup-fresh-farms"), { id: "sup-fresh-farms", restaurantId, branchId, name: "Fresh Farms Bengaluru", phone: "+918888880001", category: "Vegetables", paymentTerms: "7 days", active: true, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "customers", "cust-aanya"), { id: "cust-aanya", restaurantId, name: "Aanya Rao", phone: "+919900001111", normalizedPhone: "9900001111", email: "aanya@example.com", loyaltyPoints: 420, lifetimeValue: 8650, totalOrders: 18, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "customerAddresses", "addr-aanya-home"), { id: "addr-aanya-home", restaurantId, customerId: "cust-aanya", label: "Home", address: "Indiranagar 12th Main, Bengaluru", latitude: 12.9716, longitude: 77.6414, placeId: "mapbox.demo.indiranagar", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "loyaltyCustomers", "cust-aanya"), { id: "cust-aanya", restaurantId, name: "Aanya Rao", phone: "+919900001111", email: "aanya@example.com", loyaltyPoints: 420, points: 420, tier: "Gold", totalOrders: 18, clv: 8650, lifetimeValue: 8650, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "orders", "order-pos-1001"), { id: "order-pos-1001", restaurantId, branchId, customerId: "cust-aanya", customerName: "Aanya Rao", customerPhone: "+919900001111", channel: "pos", orderType: "dine-in", tableNumber: "T03", status: "completed", lines: [{ menuItemId: "menu-chicken-shawarma-roll", name: "Chicken Shawarma Roll", price: 220, quantity: 2 }, { menuItemId: "menu-mint-lime", name: "Mint Lime", price: 90, quantity: 2 }], subtotal: 620, discount: 0, tax: 31, deliveryFee: 0, total: 651, paymentStatus: "paid", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "orderItems", "order-pos-1001-item-1"), { id: "order-pos-1001-item-1", restaurantId, branchId, orderId: "order-pos-1001", menuItemId: "menu-chicken-shawarma-roll", name: "Chicken Shawarma Roll", quantity: 2, price: 220, gstPercent: 5, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "kitchenOrders", "DIN-T03-260522-001"), { id: "DIN-T03-260522-001", restaurantId, branchId, orderType: "dine-in", source: "pos", tableNumber: "T03", customerName: "Aanya Rao", customerPhone: "+919900001111", waiterId: uid, waiterName: "Test Owner", status: "new", lines: [{ menuItemId: "menu-al-faham-half", name: "Al Faham Chicken Half", price: 360, quantity: 1 }], total: 378, priority: "normal", etaMinutes: 12, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "accountingEntries", "acc-sales-1001"), { id: "acc-sales-1001", restaurantId, branchId, type: "income", category: "sales income", amount: 567, gst: 27, paymentMode: "upi", approvalStatus: "approved", createdBy: uid, notes: "POS order order-pos-1001", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "expenses", "exp-opening-stock"), { id: "exp-opening-stock", restaurantId, branchId, category: "ingredient purchase", amount: 12450, gst: 592.86, paymentMode: "upi", approvalStatus: "approved", createdBy: uid, notes: "Opening stock purchase", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "purchaseOrders", "po-opening-stock"), { id: "po-opening-stock", restaurantId, branchId, supplierId: "sup-fresh-farms", status: "received", total: 12450, items: [{ inventoryId: "inv-dosa-batter", quantity: 18, unitCost: 75 }], createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "reports", "report-today-sales"), { id: "report-today-sales", restaurantId, branchId, type: "sales-summary", grossSales: 567, gst: 27, orderCount: 1, from: now, to: now, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "printerProfiles", "printer-billing-80mm"), { id: "printer-billing-80mm", restaurantId, branchId, name: "Billing thermal printer", type: "billing", paperWidth: "80mm", connection: "browser", status: "test", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "receiptTemplates", "receipt-standard-80mm"), { id: "receipt-standard-80mm", restaurantId, branchId, name: "Standard 80mm receipt", paperWidth: "80mm", compactMode: false, premiumMode: true, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "offers", "offer-lunch10"), { id: "offer-lunch10", restaurantId, code: "LUNCH10", title: "Weekday lunch 10%", discountType: "percentage", discountValue: 10, active: true, startsAt: now, endsAt: now, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "coupons", "coupon-gold-50"), { id: "coupon-gold-50", restaurantId, customerId: "cust-aanya", code: "GOLD50", value: 50, status: "available", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "settings", `settings-${restaurantId}-map`), { id: `settings-${restaurantId}-map`, restaurantId, branchId, mapsEnabled: true, deliveryRadiusKm: 7, tax: { gstPercent: 5, parcelCharge: 12 }, mapDefaults: { latitude: 12.9719, longitude: 77.6412, zoom: 14, country: "in" }, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "notifications", "notif-kitchen-new"), { id: "notif-kitchen-new", restaurantId, branchId, targetRole: "chef", title: "New kitchen ticket received", body: "Table T03 has a new live kitchen ticket.", read: false, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "staffActivityLogs", "activity-owner-client-seed"), { id: "activity-owner-client-seed", restaurantId, branchId, userId: uid, action: "seeded production backend with owner login", module: "firebase", createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "paymentTransactions", "pay-order-pos-1001"), { id: "pay-order-pos-1001", restaurantId, branchId, orderId: "order-pos-1001", method: "upi", status: "captured", subtotal: 540, tax: 27, total: 567, createdAt: now, updatedAt: now }, { merge: true });
batch.set(doc(db, "deliveryAgents", "agent-ravi"), { id: "agent-ravi", restaurantId, branchId, name: "Ravi Kumar", phone: "+919900002222", active: true, currentStatus: "available", createdAt: now, updatedAt: now }, { merge: true });

for (const collectionName of requiredCollections) {
  batch.set(doc(db, collectionName, "_collectionHealth"), { id: "_collectionHealth", restaurantId, branchId, seeded: true, hidden: true, createdAt: now, updatedAt: now }, { merge: true });
}

await batch.commit();
console.log(`Client-auth production seed completed for ${restaurantId}.`);
