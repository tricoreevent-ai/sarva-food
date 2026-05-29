import { existsSync, readFileSync } from "node:fs";

for (const envFile of [".env", ".env.local"]) {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

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
const auth = getAuth(app);
const now = FieldValue.serverTimestamp();
const restaurantId = "cafe-al-arab-thanisandra";
const branchId = "br-cafe-al-arab-thanisandra";
const rolePermissions = {
  owner: ["pos", "kds", "billing", "reports", "accounting", "inventory", "loyalty", "settings", "employees", "diagnostics"],
  admin: ["pos", "kds", "billing", "reports", "accounting", "inventory", "loyalty", "settings", "employees", "diagnostics", "platform"],
  manager: ["pos", "kds", "billing", "reports", "inventory", "loyalty", "employees"],
  cashier: ["pos", "billing", "loyalty"],
  waiter: ["pos", "kds"],
  chef: ["kds"],
  accountant: ["reports", "accounting"],
  "inventory-manager": ["inventory", "reports"],
  "delivery-staff": ["delivery", "orders"],
};

const seedUsers = [
  { uid: "dinucd@gmail.com", email: "dinucd@gmail.com", displayName: "Platform Admin", role: "admin", password: "password123" },
  { uid: "divakdi@gmail.com", email: "divakdi@gmail.com", displayName: "Test Owner", role: "owner", password: "password123" },
  { uid: "test-manager", email: "manager@sarva.test", displayName: "Test Manager", role: "manager", password: "password123" },
  { uid: "test-cashier", email: "cashier@sarva.test", displayName: "Test Cashier", role: "cashier", password: "password123" },
  { uid: "test-chef", email: "chef@sarva.test", displayName: "Test Chef", role: "chef", password: "password123" },
  { uid: "test-waiter", email: "waiter@sarva.test", displayName: "Test Waiter", role: "waiter", password: "password123" },
  { uid: "test-delivery", email: "delivery@sarva.test", displayName: "Test Delivery Partner", role: "delivery-staff", password: "password123" },
];

const resolvedUsers = [];
for (const seedUser of seedUsers) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(seedUser.email);
    console.log(`Auth user exists: ${seedUser.email}`);
  } catch {
    if (seedUser.existingOnly) {
      console.warn(`Skipping optional bootstrap owner ${seedUser.email}. Set BOOTSTRAP_OWNER_PASSWORD for one run if the seeder should create it.`);
      continue;
    }
    userRecord = await auth.createUser({
      uid: seedUser.uid,
      email: seedUser.email,
      emailVerified: true,
      password: seedUser.password,
      displayName: seedUser.displayName,
      disabled: false,
    });
    console.log(`Created auth user: ${seedUser.email}`);
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    role: seedUser.role,
    restaurantIds: [restaurantId],
    branchIds: [branchId],
  });

  resolvedUsers.push({ ...seedUser, uid: userRecord.uid });
}

let demoCustomerRecord;
try {
  demoCustomerRecord = await auth.getUserByEmail("demo@sarva.test");
  console.log("Auth user exists: demo@sarva.test");
} catch {
  demoCustomerRecord = await auth.createUser({
    uid: "demo-customer",
    email: "demo@sarva.test",
    emailVerified: true,
    password: "password123",
    displayName: "Demo Customer",
    disabled: false,
  });
  console.log("Created auth user: demo@sarva.test");
}
await auth.setCustomUserClaims(demoCustomerRecord.uid, { role: "customer" });

const menuCategories = [
  { id: "cat-starters", name: "Starters", sortOrder: 1 },
  { id: "cat-biryani", name: "Biryani", sortOrder: 2 },
  { id: "cat-beverages", name: "Beverages", sortOrder: 3 },
  { id: "cat-desserts", name: "Desserts", sortOrder: 4 },
];

const appCategorySeeds = [
  ["Biryani", "rice-bowl", "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=640&q=80", "#ef4444"],
  ["Meals", "utensils", "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=640&q=80", "#f97316"],
  ["Pizza", "pizza", "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=80", "#f59e0b"],
  ["Burger", "sandwich", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80", "#84cc16"],
  ["Shawarma", "wrap", "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=640&q=80", "#22c55e"],
  ["Grill", "flame", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=640&q=80", "#14b8a6"],
  ["Chinese", "bowl", "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=640&q=80", "#06b6d4"],
  ["South Indian", "dosa", "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=640&q=80", "#3b82f6"],
  ["North Indian", "curry", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=640&q=80", "#6366f1"],
  ["Arabic", "kebab", "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=640&q=80", "#8b5cf6"],
  ["Juices", "glass-water", "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=640&q=80", "#d946ef"],
  ["Desserts", "cake-slice", "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80", "#ec4899"],
  ["Ice Cream", "ice-cream", "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=640&q=80", "#ef4444"],
  ["Cakes", "cake", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=640&q=80", "#f97316"],
  ["Tea & Coffee", "coffee", "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80", "#f59e0b"],
  ["Sandwich", "sandwich", "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=640&q=80", "#84cc16"],
  ["Rolls", "wrap", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=640&q=80", "#22c55e"],
  ["Momos", "dumpling", "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=640&q=80", "#14b8a6"],
  ["Tandoor", "flame-kindling", "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=80", "#06b6d4"],
  ["Seafood", "fish", "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=640&q=80", "#3b82f6"],
  ["Kebabs", "skewer", "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=640&q=80", "#6366f1"],
  ["Healthy", "salad", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80", "#8b5cf6"],
  ["Breakfast", "sunrise", "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=640&q=80", "#d946ef"],
  ["Street Food", "store", "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=80", "#ec4899"],
];

const menuItems = [
  {
    id: "menu-paneer-tikka",
    name: "Charcoal Paneer Tikka",
    categoryId: "cat-starters",
    category: "Starters",
    price: 260,
    description: "Smoky paneer tikka with peppers, onions, mint chutney, and lemon.",
    imagePath: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 12,
    foodType: "veg",
    isVeg: true,
    modifiers: ["mint chutney", "less spice", "extra char"],
    addOns: [{ id: "addon-extra-paneer", name: "Extra paneer", price: 70 }],
    recipe: [{ inventoryId: "inv-paneer", quantity: 0.18 }, { inventoryId: "inv-tomato-gravy", quantity: 0.05 }],
    sortOrder: 1,
  },
  {
    id: "menu-pepper-chicken",
    name: "Kerala Pepper Chicken",
    categoryId: "cat-starters",
    category: "Starters",
    price: 310,
    description: "Boneless chicken tossed with crushed pepper, curry leaves, and coconut oil.",
    imagePath: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 18,
    foodType: "nonveg",
    isVeg: false,
    modifiers: ["mild", "medium", "spicy"],
    addOns: [],
    recipe: [{ inventoryId: "inv-chicken", quantity: 0.22 }],
    sortOrder: 2,
  },
  {
    id: "menu-chicken-biryani",
    name: "Hyderabadi Chicken Dum Biryani",
    categoryId: "cat-biryani",
    category: "Biryani",
    price: 340,
    description: "Long-grain rice and marinated chicken slow-cooked with saffron and fried onions.",
    imagePath: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 20,
    foodType: "nonveg",
    isVeg: false,
    modifiers: ["raita", "salna", "extra spicy"],
    addOns: [{ id: "addon-boiled-egg", name: "Boiled egg", price: 30 }],
    recipe: [{ inventoryId: "inv-basmati-rice", quantity: 0.22 }, { inventoryId: "inv-chicken", quantity: 0.25 }],
    sortOrder: 3,
  },
  {
    id: "menu-veg-biryani",
    name: "Subz Dum Biryani",
    categoryId: "cat-biryani",
    category: "Biryani",
    price: 290,
    description: "Fragrant vegetable dum biryani layered with mint, saffron, and caramelized onions.",
    imagePath: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 18,
    foodType: "veg",
    isVeg: true,
    modifiers: ["raita", "salna", "extra spicy"],
    addOns: [],
    recipe: [{ inventoryId: "inv-basmati-rice", quantity: 0.22 }],
    sortOrder: 4,
  },
  {
    id: "menu-filter-coffee",
    name: "Degree Filter Coffee",
    categoryId: "cat-beverages",
    category: "Beverages",
    price: 90,
    description: "South Indian filter coffee brewed strong and finished with frothy milk.",
    imagePath: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 5,
    foodType: "veg",
    isVeg: true,
    modifiers: ["strong", "less sugar"],
    addOns: [],
    recipe: [{ inventoryId: "inv-coffee-decoction", quantity: 0.06 }, { inventoryId: "inv-milk", quantity: 0.12 }],
    sortOrder: 5,
  },
  {
    id: "menu-elaneer-payasam",
    name: "Elaneer Payasam",
    categoryId: "cat-desserts",
    category: "Desserts",
    price: 160,
    description: "Tender coconut payasam served chilled with roasted cashew crumble.",
    imagePath: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    gstPercent: 5,
    parcelCharge: 8,
    foodType: "veg",
    isVeg: true,
    modifiers: ["chilled", "no garnish"],
    addOns: [],
    recipe: [{ inventoryId: "inv-coconut-milk", quantity: 0.15 }],
    sortOrder: 6,
  },
];

const inventoryItems = [
  { id: "inv-dosa-batter", itemName: "Dosa batter", quantity: 18, unit: "kg", reorderLevel: 5, supplierId: "sup-fresh-farms", costPerUnit: 75 },
  { id: "inv-potato-masala", itemName: "Potato masala", quantity: 9, unit: "kg", reorderLevel: 3, supplierId: "sup-fresh-farms", costPerUnit: 60 },
  { id: "inv-paneer", itemName: "Paneer", quantity: 7, unit: "kg", reorderLevel: 2, supplierId: "sup-dairy", costPerUnit: 310 },
  { id: "inv-basmati-rice", itemName: "Basmati rice", quantity: 32, unit: "kg", reorderLevel: 8, supplierId: "sup-rice-mill", costPerUnit: 120 },
  { id: "inv-chicken", itemName: "Chicken", quantity: 12, unit: "kg", reorderLevel: 4, supplierId: "sup-poultry", costPerUnit: 220 },
  { id: "inv-coffee-decoction", itemName: "Coffee decoction", quantity: 6, unit: "litre", reorderLevel: 2, supplierId: "sup-dairy", costPerUnit: 180 },
  { id: "inv-milk", itemName: "Milk", quantity: 22, unit: "litre", reorderLevel: 8, supplierId: "sup-dairy", costPerUnit: 54 },
  { id: "inv-tomato-gravy", itemName: "Tomato makhani gravy", quantity: 11, unit: "kg", reorderLevel: 4, supplierId: "sup-fresh-farms", costPerUnit: 95 },
  { id: "inv-coconut-milk", itemName: "Tender coconut milk", quantity: 5, unit: "litre", reorderLevel: 2, supplierId: "sup-fresh-farms", costPerUnit: 160 },
];

const suppliers = [
  { id: "sup-fresh-farms", name: "Fresh Farms Bengaluru", phone: "+918888880001", category: "Vegetables", paymentTerms: "7 days" },
  { id: "sup-dairy", name: "Nandi Dairy Supply", phone: "+918888880002", category: "Dairy", paymentTerms: "weekly" },
  { id: "sup-rice-mill", name: "Kaveri Rice Mill", phone: "+918888880003", category: "Grains", paymentTerms: "15 days" },
  { id: "sup-poultry", name: "City Poultry", phone: "+918888880004", category: "Meat", paymentTerms: "cash" },
];

const thanisandraDeliveryLocation = {
  label: "Thanisandra Main Road",
  address: "Thanisandra Main Road 114, 560077 Bengaluru, India",
  latitude: 13.0559,
  longitude: 77.6325,
};

const offerStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
const offerEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

const thanisandraRestaurantSeeds = [
  {
    id: "itminaan-biryani-thanisandra",
    name: "Itminaan Biryani - Thanisandra",
    location: "Opposite Elements Mall, Thanisandra Main Road",
    address: "135/1 Gowramma Complex, Opposite Elements Mall, Thanisandra Main Road, Bengaluru 560077",
    latitude: 13.0452,
    longitude: 77.6258,
    deliveryRadiusKm: 7,
    cuisine: ["Biryani", "North Indian", "Fast food"],
    imagePath: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=1200&q=80",
    rating: 3.8,
    reviewCount: 42,
    deliveryTime: "24-32 min",
    etaMinutes: 24,
    priceForTwo: 500,
    deliveryFee: 35,
    offer: { code: "DUM15", title: "15% off dum biryani", discountType: "percentage", discountValue: 15, minimumOrder: 399 },
    tags: ["Dum biryani", "Family packs", "Offers available", "Chicken biryani"],
    menus: [
      ["slow-cooked-dum-chicken-biryani", "Slow Cooked Dum Chicken Biryani", "Biryani", 329, false, "nonveg", "Layered dum biryani with tender chicken, saffron rice, salan, and raita.", "popular"],
      ["paneer-dum-biryani", "Paneer Dum Biryani", "Biryani", 299, true, "veg", "Paneer cubes and long grain rice sealed with mild spices.", "veg"],
      ["galouti-kebab", "Galouti Kebab", "Kebab", 249, false, "nonveg", "Soft minced kebabs with roomali-style bread.", "bestseller"],
      ["phirni-cup", "Matka Phirni", "Desserts", 99, true, "veg", "Chilled rice phirni finished with pistachio.", "dessert"],
    ],
  },
  {
    id: "sharief-bhai-biryani-thanisandra",
    name: "Sharief Bhai Biryani Thanisandra",
    location: "Thanisandra Main Road",
    address: "Thanisandra Main Road, Bengaluru, Karnataka",
    latitude: 13.0525,
    longitude: 77.627,
    deliveryRadiusKm: 7,
    cuisine: ["Biryani", "Mughlai", "Kebab"],
    imagePath: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=1200&q=80",
    rating: 4.2,
    reviewCount: 118,
    deliveryTime: "28-36 min",
    etaMinutes: 28,
    priceForTwo: 700,
    deliveryFee: 39,
    offer: { code: "SHARIEF100", title: "Flat ₹100 off family pack", discountType: "flat", discountValue: 100, minimumOrder: 799 },
    tags: ["Mutton biryani", "Kebab", "Family packs", "Offers available"],
    menus: [
      ["mutton-dum-biryani", "Mutton Dum Biryani", "Biryani", 399, false, "nonveg", "Aromatic rice and slow-cooked mutton with salan.", "popular"],
      ["chicken-seekh-kebab", "Chicken Seekh Kebab", "Kebab", 289, false, "nonveg", "Charred seekh kebabs with onion and mint.", "bestseller"],
      ["veg-shahi-biryani", "Veg Shahi Biryani", "Biryani", 279, true, "veg", "Vegetable biryani with fried onion and raita.", "veg"],
      ["double-ka-meetha", "Double Ka Meetha", "Desserts", 139, true, "veg", "Hyderabadi bread pudding with nuts.", "dessert"],
    ],
  },
  {
    id: "maayaa-biryani-thanisandra",
    name: "Maayaa Biryani",
    location: "Rachenahalli Main Road, Thanisandra",
    address: "Saroj Paradise, Rachenahalli Main Road, Sinthan Nagar, Thanisandra, Bengaluru 560077",
    latitude: 13.058,
    longitude: 77.6296,
    deliveryRadiusKm: 5.5,
    cuisine: ["Biryani", "Street Food", "Seafood"],
    imagePath: "https://images.unsplash.com/photo-1630851840633-f96999247032?auto=format&fit=crop&w=1200&q=80",
    rating: 4.0,
    reviewCount: 64,
    deliveryTime: "25-34 min",
    etaMinutes: 25,
    priceForTwo: 450,
    deliveryFee: 29,
    offer: { code: "MAAYAFISH", title: "Seafood combo 12% off", discountType: "percentage", discountValue: 12, minimumOrder: 349 },
    tags: ["Fish fry", "Chicken biryani", "Street food", "Offers available"],
    menus: [
      ["andhra-chicken-biryani", "Andhra Chicken Biryani", "Biryani", 289, false, "nonveg", "Spicy chicken biryani with mirchi salan.", "popular"],
      ["fish-fry-meal", "Fish Fry Meal", "Seafood", 349, false, "nonveg", "Fried seer fish with rice, curry, and salad.", "bestseller"],
      ["egg-biryani", "Egg Biryani", "Biryani", 219, false, "egg", "Egg biryani with masala gravy and raita.", "egg"],
      ["gobi-manchurian", "Gobi Manchurian", "Street Food", 169, true, "veg", "Crisp cauliflower tossed in Indo-Chinese sauce.", "veg"],
    ],
  },
  {
    id: "cafe-al-arab-thanisandra",
    name: "Cafe Al Arab UL",
    location: "Avalahalli, Thanisandra Main Road",
    address: "Thanisandra Main Road, Avalahalli, Yelahanka, Bengaluru 560064",
    latitude: 13.064,
    longitude: 77.6312,
    deliveryRadiusKm: 6,
    cuisine: ["Arabic", "Shawarma", "Grills"],
    imagePath: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=80",
    coverImages: [
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
    ],
    rating: 4.1,
    reviewCount: 89,
    deliveryTime: "30-40 min",
    etaMinutes: 30,
    priceForTwo: 650,
    deliveryFee: 45,
    offer: { code: "ARABIC20", title: "20% off grilled platters", discountType: "percentage", discountValue: 20, minimumOrder: 599 },
    tags: ["Shawarma", "Al faham", "Mandi", "Offers available"],
    menus: [
      ["chicken-shawarma-roll", "Chicken Shawarma Roll", "Shawarma", 149, false, "nonveg", "Juicy chicken shawarma with garlic sauce.", "popular"],
      ["alfaham-half", "Al Faham Chicken Half", "Grills", 379, false, "nonveg", "Charcoal grilled chicken with kuboos and dips.", "bestseller"],
      ["chicken-mandi", "Chicken Mandi", "Mandi", 429, false, "nonveg", "Arabic rice with grilled chicken and mandi spice.", "popular"],
      ["falafel-pita", "Falafel Pita", "Shawarma", 159, true, "veg", "Falafel, salad, tahini, and pickles in pita.", "veg"],
    ],
  },
  {
    id: "desi-chef-thanisandra",
    name: "Desi Chef",
    location: "Devin Paradise Enclave, Thanisandra Main Road",
    address: "Thanisandra Main Road, Devin Paradise Enclave, Bengaluru 560064",
    latitude: 13.0587,
    longitude: 77.6345,
    deliveryRadiusKm: 6.5,
    cuisine: ["Pure Veg", "North Indian", "Street Food"],
    imagePath: "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=1200&q=80",
    rating: 4.4,
    reviewCount: 150,
    deliveryTime: "22-30 min",
    etaMinutes: 22,
    priceForTwo: 400,
    deliveryFee: 25,
    offer: { code: "VEG50", title: "Flat ₹50 off pure veg orders", discountType: "flat", discountValue: 50, minimumOrder: 299 },
    tags: ["Pure veg", "Paneer", "Chaat", "Offers available"],
    menus: [
      ["paneer-butter-masala", "Paneer Butter Masala", "North Indian", 249, true, "veg", "Paneer simmered in rich tomato makhani gravy.", "popular"],
      ["veg-biryani-raita", "Veg Biryani with Raita", "Biryani", 219, true, "veg", "Comforting veg biryani with cool raita.", "veg"],
      ["rajma-chawal-bowl", "Rajma Chawal Bowl", "Meals", 179, true, "veg", "Kidney beans curry over steamed rice.", "bestseller"],
      ["aloo-tikki-chaat", "Aloo Tikki Chaat", "Street Food", 139, true, "veg", "Crisp tikki with chutneys, curd, and sev.", "snack"],
    ],
  },
  {
    id: "verve-coffee-lounge-thanisandra",
    name: "Verve Coffee Lounge",
    location: "Near Manyata Embassy Business Park",
    address: "2nd Floor, 132 Thanisandra Main Road, Near Manyata Embassy Business Park, Bengaluru 560077",
    latitude: 13.0415,
    longitude: 77.6249,
    deliveryRadiusKm: 4.5,
    cuisine: ["Cafe", "Coffee", "Continental"],
    imagePath: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    rating: 4.0,
    reviewCount: 37,
    deliveryTime: "20-28 min",
    etaMinutes: 20,
    priceForTwo: 550,
    deliveryFee: 29,
    offer: { code: "COFFEE99", title: "Coffee and snack at ₹99 off", discountType: "flat", discountValue: 99, minimumOrder: 399 },
    tags: ["Coffee", "Sandwich", "Pasta", "Offers available"],
    menus: [
      ["cappuccino", "Cappuccino", "Coffee", 149, true, "veg", "Fresh espresso with velvety steamed milk.", "popular"],
      ["peri-peri-paneer-sandwich", "Peri Peri Paneer Sandwich", "Sandwiches", 229, true, "veg", "Grilled paneer sandwich with peri peri spread.", "veg"],
      ["chicken-club-sandwich", "Chicken Club Sandwich", "Sandwiches", 269, false, "nonveg", "Triple-layer chicken sandwich with fries.", "bestseller"],
      ["alfredo-penne", "Alfredo Penne", "Pasta", 299, true, "veg", "Creamy white sauce penne with herbs.", "pasta"],
    ],
  },
  {
    id: "zed-the-baker-jakkur",
    name: "Zed The Baker",
    location: "Bhartiya Mall, Jakkur",
    address: "Ground Floor, Bhartiya Mall, Thanisandra Main Road, Jakkur, Bengaluru 560064",
    latitude: 13.0823,
    longitude: 77.6416,
    deliveryRadiusKm: 8,
    cuisine: ["Bakery", "Desserts", "Pizza"],
    imagePath: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    rating: 4.3,
    reviewCount: 210,
    deliveryTime: "32-42 min",
    etaMinutes: 32,
    priceForTwo: 750,
    deliveryFee: 49,
    offer: { code: "BAKE20", title: "20% off cakes and bakes", discountType: "percentage", discountValue: 20, minimumOrder: 499 },
    tags: ["Bakery", "Cake", "Croissant", "Pizza", "Offers available"],
    menus: [
      ["butter-croissant", "Butter Croissant", "Bakery", 159, true, "veg", "Flaky butter croissant baked fresh.", "popular"],
      ["chocolate-truffle-slice", "Chocolate Truffle Slice", "Desserts", 189, true, "veg", "Dense chocolate truffle pastry slice.", "bestseller"],
      ["sourdough-margherita", "Sourdough Margherita Pizza", "Pizza", 399, true, "veg", "Sourdough crust with mozzarella and basil.", "pizza"],
      ["chicken-sausage-puff", "Chicken Sausage Puff", "Bakery", 169, false, "nonveg", "Buttery puff filled with spiced chicken sausage.", "snack"],
    ],
  },
  {
    id: "juice-park-nagawara",
    name: "Juice Park Nagawara",
    location: "Thanisandra Main Road, Nagawara",
    address: "Shop 4, Opposite Poorvika Mobiles, Thanisandra Main Road, Nagawara, Bengaluru",
    latitude: 13.0386,
    longitude: 77.6221,
    deliveryRadiusKm: 4.5,
    cuisine: ["Juices", "Shakes", "Snacks"],
    imagePath: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=1200&q=80",
    rating: 4.1,
    reviewCount: 76,
    deliveryTime: "18-25 min",
    etaMinutes: 18,
    priceForTwo: 220,
    deliveryFee: 20,
    offer: { code: "JUICE2", title: "Buy 2 coolers, save 10%", discountType: "percentage", discountValue: 10, minimumOrder: 199 },
    tags: ["Juice", "Milkshake", "Fresh fruit", "Offers available"],
    menus: [
      ["watermelon-mint-juice", "Watermelon Mint Juice", "Fresh Juices", 99, true, "vegan", "Fresh watermelon with mint and lime.", "popular"],
      ["mango-milkshake", "Mango Milkshake", "Milkshakes", 139, true, "veg", "Thick mango shake with chilled milk.", "bestseller"],
      ["dry-fruit-lassi", "Dry Fruit Lassi", "Lassi", 159, true, "veg", "Sweet lassi blended with nuts.", "cooler"],
      ["masala-fries", "Masala Fries", "Snacks", 119, true, "veg", "Crispy fries tossed with house masala.", "snack"],
    ],
  },
  {
    id: "falak-leela-bhartiya",
    name: "Falak - The Leela Bhartiya City",
    location: "The Leela Bhartiya City, Kannuru",
    address: "The Leela Bhartiya City, Thanisandra Main Road, Kannuru, Bengaluru 560064",
    latitude: 13.084,
    longitude: 77.6424,
    deliveryRadiusKm: 9,
    cuisine: ["Awadhi", "North Indian", "Kebab"],
    imagePath: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    coverImages: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1400&q=80",
    ],
    rating: 4.6,
    reviewCount: 332,
    deliveryTime: "38-50 min",
    etaMinutes: 38,
    priceForTwo: 2400,
    deliveryFee: 59,
    offer: { code: "FALAK300", title: "Flat ₹300 off royal dinners", discountType: "flat", discountValue: 300, minimumOrder: 1800 },
    tags: ["Awadhi", "Kebab", "Premium", "Offers available"],
    menus: [
      ["nalli-nihari", "Nalli Nihari", "Awadhi", 799, false, "nonveg", "Slow-cooked lamb shank gravy with kulcha.", "popular"],
      ["murgh-malai-kebab", "Murgh Malai Kebab", "Kebab", 649, false, "nonveg", "Creamy chicken kebab cooked in tandoor.", "bestseller"],
      ["subz-galouti", "Subz Galouti", "Kebab", 499, true, "veg", "Vegetarian galouti kebab with ulte tawa paratha.", "veg"],
      ["zafrani-phirni", "Zafrani Phirni", "Desserts", 299, true, "veg", "Saffron phirni with pistachio.", "dessert"],
    ],
  },
  {
    id: "quattro-all-day-dining",
    name: "Quattro - All Day Dining",
    location: "The Leela Bhartiya City",
    address: "The Leela Bhartiya City, 6/2 Thanisandra Main Road, Kannuru, Bengaluru 560064",
    latitude: 13.0844,
    longitude: 77.6426,
    deliveryRadiusKm: 8,
    cuisine: ["Continental", "Indian", "Cafe"],
    imagePath: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80",
    rating: 4.2,
    reviewCount: 128,
    deliveryTime: "36-48 min",
    etaMinutes: 36,
    priceForTwo: 1800,
    deliveryFee: 59,
    offer: { code: "QUATTRO15", title: "15% off all-day dining", discountType: "percentage", discountValue: 15, minimumOrder: 1200 },
    tags: ["Continental", "Breakfast", "Pasta", "Offers available"],
    menus: [
      ["classic-caesar-salad", "Classic Caesar Salad", "Salads", 429, true, "veg", "Crunchy romaine with parmesan and croutons.", "veg"],
      ["grilled-chicken-steak", "Grilled Chicken Steak", "Continental", 699, false, "nonveg", "Grilled chicken steak with pepper sauce.", "popular"],
      ["mushroom-risotto", "Mushroom Risotto", "Continental", 549, true, "veg", "Creamy mushroom risotto with parmesan.", "bestseller"],
      ["berry-pancake-stack", "Berry Pancake Stack", "Breakfast", 399, true, "veg", "Fluffy pancakes with berry compote.", "breakfast"],
    ],
  },
  {
    id: "nandhini-deluxe-nagavara",
    name: "Nandhini Deluxe Andhra - Nagavara",
    location: "Nagavara, Thanisandra Main Road",
    address: "5th Block, MS Ramaiah North City, Nagavara, Thanisandra Main Road, Bengaluru 560045",
    latitude: 13.0399,
    longitude: 77.6235,
    deliveryRadiusKm: 6,
    cuisine: ["Andhra", "Biryani", "Meals"],
    imagePath: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
    rating: 4.0,
    reviewCount: 150,
    deliveryTime: "27-36 min",
    etaMinutes: 27,
    priceForTwo: 700,
    deliveryFee: 39,
    offer: { code: "ANDHRA75", title: "Flat ₹75 off Andhra meals", discountType: "flat", discountValue: 75, minimumOrder: 499 },
    tags: ["Andhra meals", "Biryani", "Spicy", "Offers available"],
    menus: [
      ["andhra-meals", "Andhra Veg Meals", "Meals", 229, true, "veg", "Rice, dal, sambar, rasam, poriyal, curd, and pickle.", "veg"],
      ["gongura-chicken", "Gongura Chicken", "Andhra Specials", 349, false, "nonveg", "Chicken cooked with tangy gongura leaves.", "popular"],
      ["andhra-mutton-biryani", "Andhra Mutton Biryani", "Biryani", 429, false, "nonveg", "Spicy mutton biryani with raita.", "bestseller"],
      ["chilli-paneer", "Chilli Paneer", "Starters", 239, true, "veg", "Paneer tossed in green chilli and onions.", "snack"],
    ],
  },
  {
    id: "blueberry-restobar-nagavara",
    name: "Blueberry RestoBar",
    location: "Nagavara, Thanisandra Main Road",
    address: "Thanisandra Main Road, 5th Block, MS Ramaiah North City, Nagavara, Bengaluru 560045",
    latitude: 13.0405,
    longitude: 77.6237,
    deliveryRadiusKm: 5.5,
    cuisine: ["Kerala", "Seafood", "Multi-cuisine"],
    imagePath: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    rating: 4.3,
    reviewCount: 95,
    deliveryTime: "31-42 min",
    etaMinutes: 31,
    priceForTwo: 900,
    deliveryFee: 45,
    offer: { code: "MALABAR15", title: "15% off Kerala specials", discountType: "percentage", discountValue: 15, minimumOrder: 699 },
    tags: ["Kerala", "Parotta", "Seafood", "Offers available"],
    menus: [
      ["kerala-parotta-chicken-curry", "Kerala Parotta with Chicken Curry", "Kerala", 329, false, "nonveg", "Layered parotta served with peppery chicken curry.", "popular"],
      ["fish-nirvana", "Fish Nirvana", "Seafood", 499, false, "nonveg", "Fish simmered in coconut milk and curry leaves.", "bestseller"],
      ["appam-veg-stew", "Appam with Veg Stew", "Kerala", 269, true, "veg", "Soft appam with coconut vegetable stew.", "veg"],
      ["prawns-roast", "Malabar Prawns Roast", "Seafood", 549, false, "nonveg", "Prawns roasted with shallots and coastal spices.", "seafood"],
    ],
  },
];

const launchRestaurantSeedIds = new Set([
  "cafe-al-arab-thanisandra",
  "falak-leela-bhartiya",
]);
const launchRestaurantSeeds = thanisandraRestaurantSeeds.filter((restaurant) => launchRestaurantSeedIds.has(restaurant.id));

const requiredCollections = [
  "tenants", "branches", "users", "roles", "permissions", "restaurants", "menus", "menuCategories",
  "orders", "orderItems", "kitchenOrders", "tables", "customers", "loyaltyAccounts",
  "customerProfiles", "customerOrders", "customerLoyalty", "loyaltyCustomers", "inventoryItems",
  "inventory", "inventoryTransactions", "purchaseEntries", "purchaseOrders", "expenseEntries",
  "expenses", "accountingTransactions", "accountingEntries", "suppliers", "reports",
  "printerProfiles", "receiptTemplates", "offers", "coupons", "socialPosts", "deliveryZones",
  "settings", "notifications", "staffActivityLogs", "paymentTransactions", "deliveryAgents",
  "customerAddresses", "printerProfiles",
];

const batch = db.batch();

batch.set(db.collection("tenants").doc(restaurantId), {
  id: restaurantId,
  tenantId: restaurantId,
  name: "Cafe Al Arab UL",
  plan: "growth",
  status: "active",
  ownerEmail: "divakdi@gmail.com",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

for (const user of resolvedUsers) {
  batch.set(db.collection("users").doc(user.uid), {
    id: user.uid,
    uid: user.uid,
    tenantId: restaurantId,
    tenantIds: [restaurantId],
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    active: true,
    restaurantIds: [restaurantId],
    branchIds: [branchId],
    permissions: rolePermissions[user.role] ?? [],
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

for (const [name, icon, image, colorTheme] of appCategorySeeds) {
  const id = safeSeedId(name);
  batch.set(db.collection("appCategories").doc(id), {
    id,
    name,
    slug: id,
    imagePath: image,
    image,
    icon,
    sortOrder: appCategorySeeds.findIndex((item) => item[0] === name) + 1,
    active: true,
    colorTheme,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

batch.set(db.collection("appSettings").doc("cms"), {
  appName: "Sarva Food",
  homepage: {
    title: "Craving something delicious?",
    subtitle: "Order Arabic grills, biryani, meals, pizza, burgers, juices, and desserts from verified nearby restaurants.",
    visible: true,
  },
  banners: [
    {
      id: "homepage-arabic-grills",
      title: "Authentic Arabic flavours, made with love",
      subtitle: "Shawarma, mandi, Al Faham, grills, and family platters near Thanisandra.",
      imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Explore Arabic",
      ctaHref: "/restaurants?query=arabic",
      visible: true,
      sortOrder: 1,
    },
    {
      id: "homepage-biryani-meals",
      title: "Biryani and meals for every mood",
      subtitle: "Find dum biryani, Kerala meals, Andhra meals, and quick lunch combos.",
      imageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Order now",
      ctaHref: "/restaurants?query=biryani",
      visible: true,
      sortOrder: 2,
    },
  ],
  sponsoredAds: [
    {
      id: "homepage-falak-offer",
      title: "Flat ₹300 off royal dinners",
      subtitle: "Use FALAK300 on Falak favourites above the minimum order.",
      imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Use FALAK300",
      ctaHref: "/restaurant/falak-leela-bhartiya",
      visible: true,
      sortOrder: 1,
    },
  ],
  announcements: [
    {
      id: "homepage-location-ready",
      title: "Thanisandra delivery is live",
      subtitle: "Cafe Al Arab UL and Falak are ready for online orders.",
      imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "See restaurants",
      ctaHref: "/restaurants?query=thanisandra",
      visible: true,
      sortOrder: 1,
    },
  ],
  disclaimer: "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.",
  footer: {
    visible: true,
    note: "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.",
  },
  legalPages: {
    terms: "Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. Sarva Food acts only as a technology platform connecting customers and restaurants.",
    privacy: "Sarva Food uses account, location, cart, and order data only to operate food discovery, ordering, support, and safety workflows.",
  },
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("users").doc(demoCustomerRecord.uid), {
  id: demoCustomerRecord.uid,
  uid: demoCustomerRecord.uid,
  email: "demo@sarva.test",
  displayName: "Demo Customer",
  role: "customer",
  roleId: "customer",
  active: true,
  tenantIds: [],
  restaurantIds: [],
  branchIds: [],
  permissions: ["customer:profile", "customer:orders"],
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("customerProfiles").doc(demoCustomerRecord.uid), {
  id: demoCustomerRecord.uid,
  uid: demoCustomerRecord.uid,
  email: "demo@sarva.test",
  displayName: "Demo Customer",
  emailVerified: true,
  active: true,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

for (const [role, permissions] of Object.entries(rolePermissions)) {
  batch.set(db.collection("roles").doc(role), {
    id: role,
    tenantId: restaurantId,
    restaurantId,
    role,
    permissions,
    branchRestrictions: role === "admin" ? [] : [branchId],
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  batch.set(db.collection("permissions").doc(role), {
    id: role,
    tenantId: restaurantId,
    branchId,
    role,
    permissions,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

batch.set(db.collection("restaurants").doc(restaurantId), {
  id: restaurantId,
  tenantId: restaurantId,
  name: "Cafe Al Arab UL",
  displayName: "Cafe Al Arab UL",
  slug: restaurantId,
  ownerIds: resolvedUsers.filter((user) => user.role === "owner").map((user) => user.uid),
  ownerId: resolvedUsers.find((user) => user.role === "owner")?.uid ?? "divakdi@gmail.com",
  branchId,
  primaryBranchId: branchId,
  active: true,
  approved: true,
  profileComplete: true,
  publicListingEnabled: true,
  gstin: "29AABCT1234A1Z5",
  phone: "+919900030001",
  location: "Avalahalli, Thanisandra Main Road",
  address: "Thanisandra Main Road, Avalahalli, Yelahanka, Bengaluru 560064",
  latitude: 13.064,
  longitude: 77.6312,
  deliveryRadiusKm: 6,
  cuisine: ["Arabic", "Shawarma", "Grills"],
  imagePath: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
  coverImagePath: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
  coverImagePaths: [
    "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
  ],
  rating: 4.1,
  reviewCount: 89,
  deliveryTime: "30-40 min",
  etaMinutes: 30,
  priceForTwo: 650,
  tags: ["Shawarma", "Al faham", "Mandi", "Offers available"],
  contact: {
    phone: "+919900030001",
    whatsapp: "+919900030001",
    supportEmail: "cafe-al-arab-thanisandra@sarva.example",
    callbackEnabled: true,
  },
  ownerProfile: {
    businessPhone: "+919900030001",
    businessWhatsapp: "+919900030001",
    businessEmail: "cafe-al-arab-thanisandra@sarva.example",
    cateringPhone: "+919900130001",
    cateringWhatsapp: "+919900130001",
    cateringEmail: "catering.cafe-al-arab@sarva.example",
    emergencyPhone: "+919900230001",
  },
  deliverySettings: {
    radiusKm: 6,
    baseFee: 45,
    freeDeliveryAbove: 499,
    maxOrdersPerSlot: 8,
    deliverySlotMinutes: 30,
  },
  scheduling: {
    enabled: true,
    minPrepMinutes: 30,
    cutoffMinutes: 45,
    slotMinutes: 30,
    maxOrdersPerSlot: 8,
    dineInReservationEnabled: true,
    parcelSchedulingEnabled: true,
    deliverySchedulingEnabled: true,
  },
  advancedFeatures: {
    preorder: true,
    festivalMenus: true,
    limitedTimeMenus: true,
    comboBuilder: true,
    subscriptionMeals: true,
    recurringLunchPlans: true,
    groupOrdering: true,
    officeOrdering: true,
    splitPayments: true,
    familyCartSharing: true,
  },
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("branches").doc(branchId), {
  id: branchId,
  tenantId: restaurantId,
  restaurantId,
  name: "Cafe Al Arab UL - Thanisandra",
  address: "Thanisandra Main Road, Avalahalli, Yelahanka, Bengaluru 560064",
  latitude: 13.064,
  longitude: 77.6312,
  deliveryRadiusKm: 6,
  phone: "+919900030001",
  active: true,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

const primaryOwnerId = resolvedUsers.find((user) => user.role === "owner")?.uid ?? "divakdi@gmail.com";
batch.set(db.collection("ownerProfiles").doc(primaryOwnerId), {
  id: primaryOwnerId,
  ownerId: primaryOwnerId,
  tenantId: restaurantId,
  restaurantId,
  branchId,
  ownerName: "Test Owner",
  hotelName: "Cafe Al Arab UL",
  logo: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1690000000/sarva/cafe-al-arab-logo.png",
  coverImage: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
  coverImages: [
    "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
  ],
  businessAddress: "Thanisandra Main Road, Avalahalli, Yelahanka, Bengaluru 560064",
  googleMapLocation: "https://www.google.com/maps?q=13.064,77.6312",
  latitude: 13.064,
  longitude: 77.6312,
  mapboxPlaceId: "sarva-cafe-al-arab-ul-thanisandra",
  locationVerified: true,
  cuisineType: "Arabic, Shawarma, Grills",
  cuisineTypes: ["Arabic", "Shawarma", "Grills"],
  gstDetails: "29AABCC1234A1Z5",
  phoneNumber: "+919900030001",
  whatsappNumber: "+919900030001",
  supportEmail: "cafe-al-arab-thanisandra@sarva.example",
  cateringPhoneNumber: "+919900130001",
  cateringWhatsappNumber: "+919900130001",
  cateringEmail: "catering.cafe-al-arab@sarva.example",
  emergencySupportNumber: "+919900230001",
  operatingHours: "10:30 AM - 11:30 PM",
  operatingHoursPreference: "specified",
  operatingHoursSchedule: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({ day, open: true, slots: [{ start: "10:30", end: "23:30" }] })),
  deliveryRadiusKm: 6,
  deliveryCharge: 45,
  minimumOrder: 149,
  freeDeliveryThreshold: 499,
  fssaiLicense: "11223344556677",
  diningAvailable: true,
  cloudKitchen: false,
  reviewStatus: "approved",
  completed: true,
  updatedAt: now,
  createdAt: now,
}, { merge: true });

batch.set(db.collection("menus").doc("menu-default"), {
  id: "menu-default",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  name: "All day menu",
  active: true,
  channels: ["dine-in", "delivery", "parcel"],
  createdAt: now,
  updatedAt: now,
}, { merge: true });

for (const menuType of ["dine-in", "parcel", "delivery"]) {
  batch.set(db.collection("menus").doc(`menu-${restaurantId}-${menuType}`), {
    id: `menu-${restaurantId}-${menuType}`,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    name: `${menuType} menu`,
    menuType,
    active: true,
    available: true,
    channels: [menuType],
    sortOrder: menuType === "dine-in" ? 1 : menuType === "parcel" ? 2 : 3,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

for (const table of ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08"]) {
  batch.set(db.collection("tables").doc(table), {
    id: table,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    number: table,
    status: table === "T03" ? "occupied" : "available",
    seats: table.endsWith("8") ? 6 : 4,
    assignedWaiterId: "test-waiter",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

for (const category of menuCategories) {
  batch.set(db.collection("menuCategories").doc(category.id), {
    ...category,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    ownerId: resolvedUsers.find((user) => user.role === "owner")?.uid ?? "system",
    enabled: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

for (const item of menuItems) {
  const payload = {
    ...item,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    ownerId: resolvedUsers.find((user) => user.role === "owner")?.uid ?? "system",
    description: item.description,
    imagePath: item.imagePath,
    isVeg: item.isVeg,
    foodType: item.foodType,
    available: true,
    dineInPrice: item.price,
    parcelPrice: item.price + item.parcelCharge,
    deliveryPrice: item.price + item.parcelCharge + 15,
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
    channelConfig: {
      "dine-in": { visible: true, available: true, price: item.price, taxRate: 5, packingCharge: 0 },
      parcel: { visible: true, available: true, price: item.price + item.parcelCharge, taxRate: 5, packingCharge: item.parcelCharge },
      delivery: { visible: true, available: true, price: item.price + item.parcelCharge + 15, taxRate: 5, packingCharge: item.parcelCharge },
    },
    tags: item.sortOrder <= 3 ? ["popular", "bestseller"] : [],
    createdAt: now,
    updatedAt: now,
  };
  batch.set(db.collection("menuItems").doc(item.id), payload, { merge: true });
  batch.set(db.collection("dineInMenus").doc(item.id), { ...payload, menuType: "dine-in" }, { merge: true });
  batch.set(db.collection("parcelMenus").doc(item.id), { ...payload, menuType: "parcel" }, { merge: true });
  batch.set(db.collection("deliveryMenus").doc(item.id), { ...payload, menuType: "delivery" }, { merge: true });
}

for (const legacyItem of [
  { id: "menu-masala-dosa", name: "Mysore Masala Dosa", categoryId: "cat-south-indian", category: "South Indian", price: 180, parcelCharge: 12, isVeg: true, foodType: "veg" },
  { id: "menu-paneer-butter-masala", name: "Paneer Butter Masala", categoryId: "cat-north-indian", category: "North Indian", price: 290, parcelCharge: 18, isVeg: true, foodType: "veg" },
]) {
  const payload = {
    ...legacyItem,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    ownerId: resolvedUsers.find((user) => user.role === "owner")?.uid ?? "system",
    description: `${legacyItem.name} from Cafe Al Arab.`,
    available: true,
    dineInPrice: legacyItem.price,
    parcelPrice: legacyItem.price + legacyItem.parcelCharge,
    deliveryPrice: legacyItem.price + legacyItem.parcelCharge + 15,
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
    channelConfig: {
      "dine-in": { visible: true, available: true, price: legacyItem.price, taxRate: 5, packingCharge: 0 },
      parcel: { visible: true, available: true, price: legacyItem.price + legacyItem.parcelCharge, taxRate: 5, packingCharge: legacyItem.parcelCharge },
      delivery: { visible: true, available: true, price: legacyItem.price + legacyItem.parcelCharge + 15, taxRate: 5, packingCharge: legacyItem.parcelCharge },
    },
    createdAt: now,
    updatedAt: now,
  };
  batch.set(db.collection("menuItems").doc(legacyItem.id), payload, { merge: true });
  batch.set(db.collection("dineInMenus").doc(legacyItem.id), { ...payload, menuType: "dine-in" }, { merge: true });
  batch.set(db.collection("parcelMenus").doc(legacyItem.id), { ...payload, menuType: "parcel" }, { merge: true });
  batch.set(db.collection("deliveryMenus").doc(legacyItem.id), { ...payload, menuType: "delivery" }, { merge: true });
}

for (const item of inventoryItems) {
  batch.set(db.collection("inventory").doc(item.id), {
    ...item,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
  batch.set(db.collection("inventoryItems").doc(item.id), {
    ...item,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    name: item.itemName,
    currentStock: item.quantity,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
  batch.set(db.collection("inventoryTransactions").doc(`opening-${item.id}`), {
    id: `opening-${item.id}`,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    inventoryId: item.id,
    type: "opening-stock",
    quantity: item.quantity,
    unit: item.unit,
    createdBy: "test-manager",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

for (const supplier of suppliers) {
  batch.set(db.collection("suppliers").doc(supplier.id), {
    ...supplier,
    tenantId: restaurantId,
    restaurantId,
    branchId,
    active: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

batch.set(db.collection("customers").doc("cust-aanya"), {
  id: "cust-aanya",
  tenantId: restaurantId,
  restaurantId,
  name: "Aanya Rao",
  phone: "+919900001111",
  normalizedPhone: "9900001111",
  email: "aanya@example.com",
  loyaltyPoints: 420,
  lifetimeValue: 8650,
  totalOrders: 18,
  lastOrderAt: now,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("loyaltyAccounts").doc("loyalty-cust-aanya"), {
  id: "loyalty-cust-aanya",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  customerId: "cust-aanya",
  points: 420,
  tier: "Gold",
  lifetimeValue: 8650,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("customerAddresses").doc("addr-aanya-home"), {
  id: "addr-aanya-home",
  tenantId: restaurantId,
  customerId: "cust-aanya",
  restaurantId,
  label: "Home",
  address: "Indiranagar 12th Main, Bengaluru",
  latitude: 12.9716,
  longitude: 77.6414,
  placeId: "mapbox.demo.indiranagar",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("loyaltyCustomers").doc("cust-aanya"), {
  id: "cust-aanya",
  tenantId: restaurantId,
  restaurantId,
  name: "Aanya Rao",
  phone: "+919900001111",
  email: "aanya@example.com",
  loyaltyPoints: 420,
  points: 420,
  tier: "Gold",
  totalOrders: 18,
  clv: 8650,
  lifetimeValue: 8650,
  lastOrderAt: now,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("orders").doc("order-pos-1001"), {
  id: "order-pos-1001",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  customerId: "cust-aanya",
  customerName: "Aanya Rao",
  customerPhone: "+919900001111",
  channel: "pos",
  status: "completed",
  orderType: "dine-in",
  tableNumber: "T03",
  lines: [
    { menuItemId: "menu-paneer-tikka", name: "Charcoal Paneer Tikka", price: 260, quantity: 2 },
    { menuItemId: "menu-filter-coffee", name: "Degree Filter Coffee", price: 90, quantity: 2 },
  ],
  subtotal: 700,
  discount: 0,
  tax: 35,
  deliveryFee: 0,
  total: 735,
  paymentStatus: "paid",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("orderItems").doc("order-pos-1001-item-1"), {
  id: "order-pos-1001-item-1",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  orderId: "order-pos-1001",
  menuItemId: "menu-paneer-tikka",
  name: "Charcoal Paneer Tikka",
  quantity: 2,
  price: 260,
  gstPercent: 5,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("kitchenOrders").doc("kot-live-1001"), {
  id: "kot-live-1001",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  orderType: "dine-in",
  source: "pos",
  tableNumber: "T03",
  customerName: "Aanya Rao",
  customerPhone: "+919900001111",
  waiterId: "test-waiter",
  waiterName: "Test Waiter",
  status: "new",
  lines: [
    { menuItemId: "menu-paneer-butter-masala", name: "Paneer Butter Masala", price: 290, quantity: 1, notes: "medium spice" },
    { menuItemId: "menu-chicken-biryani", name: "Hyderabadi Chicken Biryani", price: 340, quantity: 1 },
  ],
  total: 661.5,
  priority: "normal",
  etaMinutes: 14,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("accountingEntries").doc("acc-sales-1001"), {
  id: "acc-sales-1001",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  type: "income",
  category: "sales income",
  amount: 735,
  gst: 35,
  paymentMode: "upi",
  approvalStatus: "approved",
  createdBy: "test-cashier",
  notes: "POS order order-pos-1001",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("accountingTransactions").doc("txn-sales-1001"), {
  id: "txn-sales-1001",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  orderId: "order-pos-1001",
  paymentMethod: "upi",
  subtotal: 700,
  taxData: { gstRate: 5, gstAmount: 35 },
  total: 735,
  type: "sale",
  timestamp: now,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("expenses").doc("exp-opening-stock"), {
  id: "exp-opening-stock",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  category: "ingredient purchase",
  amount: 12450,
  gst: 592.86,
  paymentMode: "upi",
  approvalStatus: "approved",
  createdBy: "test-manager",
  notes: "Opening stock purchase",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("expenseEntries").doc("exp-opening-stock"), {
  id: "exp-opening-stock",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  category: "ingredient purchase",
  amount: 12450,
  gst: 592.86,
  paymentMode: "upi",
  approvalStatus: "approved",
  createdBy: "test-manager",
  notes: "Opening stock purchase",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("purchaseOrders").doc("po-opening-stock"), {
  id: "po-opening-stock",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  supplierId: "sup-fresh-farms",
  status: "received",
  total: 12450,
  items: [{ inventoryId: "inv-dosa-batter", quantity: 18, unitCost: 75 }],
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("purchaseEntries").doc("purchase-opening-stock"), {
  id: "purchase-opening-stock",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  supplierId: "sup-fresh-farms",
  amount: 12450,
  gst: 592.86,
  status: "received",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("reports").doc("report-today-sales"), {
  id: "report-today-sales",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  type: "sales-summary",
  grossSales: 735,
  gst: 35,
  orderCount: 1,
  from: now,
  to: now,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("printerProfiles").doc("printer-billing-80mm"), {
  id: "printer-billing-80mm",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  name: "Billing thermal printer",
  type: "billing",
  paperWidth: "80mm",
  connection: "browser",
  status: "test",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("receiptTemplates").doc("receipt-standard-80mm"), {
  id: "receipt-standard-80mm",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  name: "Standard 80mm receipt",
  paperWidth: "80mm",
  compactMode: false,
  premiumMode: true,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("paymentTransactions").doc("pay-order-pos-1001"), {
  id: "pay-order-pos-1001",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  orderId: "order-pos-1001",
  method: "upi",
  status: "captured",
  subtotal: 700,
  tax: 35,
  total: 735,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("offers").doc("offer-lunch10"), {
  id: "offer-lunch10",
  tenantId: restaurantId,
  restaurantId,
  code: "LUNCH10",
  title: "Weekday lunch 10%",
  discountType: "percentage",
  discountValue: 10,
  minimumOrder: 499,
  active: true,
  startsAt: offerStart,
  endsAt: offerEnd,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("socialPosts").doc("social-lunch10"), {
  id: "social-lunch10",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  headline: "Lunch thali near Indiranagar",
  offerCode: "LUNCH10",
  status: "pending",
  channels: ["Instagram", "Facebook"],
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("deliveryZones").doc("zone-indiranagar-7km"), {
  id: "zone-indiranagar-7km",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  name: "Indiranagar 7km",
  radiusKm: 7,
  baseFee: 39,
  active: true,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("coupons").doc("coupon-gold-50"), {
  id: "coupon-gold-50",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  customerId: "cust-aanya",
  code: "GOLD50",
  value: 50,
  status: "available",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("settings").doc(`settings-${restaurantId}-map`), {
  id: `settings-${restaurantId}-map`,
  tenantId: restaurantId,
  restaurantId,
  branchId,
  mapsEnabled: true,
  deliveryRadiusKm: 7,
  tax: { gstPercent: 5, parcelCharge: 12 },
  mapDefaults: { latitude: 12.9719, longitude: 77.6412, zoom: 14, country: "in" },
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("notifications").doc("notif-kot-new"), {
  id: "notif-kot-new",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  targetRole: "chef",
  title: "New kitchen ticket received",
  body: "Table T03 has a new live kitchen ticket.",
  read: false,
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("staffActivityLogs").doc("activity-production-seed"), {
  id: "activity-production-seed",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  userId: resolvedUsers[0]?.uid,
  action: "seeded production backend",
  module: "firebase",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

batch.set(db.collection("deliveryAgents").doc("agent-ravi"), {
  id: "agent-ravi",
  tenantId: restaurantId,
  restaurantId,
  branchId,
  name: "Ravi Kumar",
  phone: "+919900002222",
  active: true,
  currentStatus: "available",
  createdAt: now,
  updatedAt: now,
}, { merge: true });

for (const collectionName of requiredCollections) {
  batch.set(db.collection(collectionName).doc("_collectionHealth"), {
    id: "_collectionHealth",
    tenantId: restaurantId,
    restaurantId,
    branchId,
    seeded: true,
    hidden: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

function seedThanisandraRestaurants(batchRef, ownerId) {
  batchRef.set(db.collection("customerAddresses").doc("demo-customer-thanisandra"), {
    id: "demo-customer-thanisandra",
    customerId: "demo-customer",
    label: thanisandraDeliveryLocation.label,
    address: thanisandraDeliveryLocation.address,
    fullAddress: thanisandraDeliveryLocation.address,
    geo: { lat: thanisandraDeliveryLocation.latitude, lng: thanisandraDeliveryLocation.longitude },
    latitude: thanisandraDeliveryLocation.latitude,
    longitude: thanisandraDeliveryLocation.longitude,
    placeId: "registered-monarch-serenity-thanisandra",
    verified: true,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  batchRef.set(db.collection("customerLoyalty").doc("loyalty-demo-customer"), {
    id: "loyalty-demo-customer",
    customerId: "demo-customer",
    points: 260,
    tier: "Silver",
    lifetimeValue: 2140,
    updatedAt: now,
    createdAt: now,
  }, { merge: true });

  batchRef.set(db.collection("customerCoupons").doc("coupon-demo-nearby"), {
    id: "coupon-demo-nearby",
    customerId: "demo-customer",
    code: "NEARBY100",
    title: "Flat ₹100 off nearby restaurants",
    active: true,
    status: "available",
    expiresAt: offerEnd,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  launchRestaurantSeeds.forEach((restaurant, restaurantIndex) => {
    const branchIdForRestaurant = `br-${restaurant.id}`;
    const restaurantOwnerId = restaurant.id === "cafe-al-arab-thanisandra" ? ownerId : "owner-falak-leela";
    const categories = Array.from(new Set(restaurant.menus.map((item) => item[2])));
    const popularItems = restaurant.menus.map((item) => item[1]);
    const prices = restaurant.menus.map((item) => Number(item[3]));
    const foodTypes = Array.from(new Set(restaurant.menus.map((item) => item[5])));

    batchRef.set(db.collection("tenants").doc(restaurant.id), {
      id: restaurant.id,
      tenantId: restaurant.id,
      name: `${restaurant.name} Tenant`,
      slug: restaurant.id,
      status: "active",
      ownerIds: [restaurantOwnerId],
      primaryBranchId: branchIdForRestaurant,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    batchRef.set(db.collection("restaurants").doc(restaurant.id), {
      id: restaurant.id,
      tenantId: restaurant.id,
      name: restaurant.name,
      slug: restaurant.id,
      ownerIds: [restaurantOwnerId],
      ownerId: restaurantOwnerId,
      branchId: branchIdForRestaurant,
      primaryBranchId: branchIdForRestaurant,
      active: true,
      approved: true,
      phone: `+9199000${String(30000 + restaurantIndex).slice(-5)}`,
      location: restaurant.location,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      cuisine: restaurant.cuisine,
      imagePath: restaurant.imagePath,
      coverImagePath: restaurant.coverImages?.[0] ?? restaurant.imagePath,
      coverImagePaths: restaurant.coverImages ?? [restaurant.imagePath],
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      deliveryTime: restaurant.deliveryTime,
      etaMinutes: restaurant.etaMinutes,
      priceForTwo: restaurant.priceForTwo,
      deliveryFee: restaurant.deliveryFee,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      foodTypes,
      popularItems,
      categoryTags: categories,
      offerCodes: [restaurant.offer.code],
      searchKeywords: [...restaurant.cuisine, ...restaurant.tags, ...popularItems, ...categories],
      tags: restaurant.tags,
      contact: {
        phone: `+9199000${String(30000 + restaurantIndex).slice(-5)}`,
        whatsapp: `+9199000${String(30000 + restaurantIndex).slice(-5)}`,
        supportEmail: `${restaurant.id}@sarva.example`,
        callbackEnabled: true,
      },
      ownerProfile: {
        businessPhone: `+9199000${String(30000 + restaurantIndex).slice(-5)}`,
        businessWhatsapp: `+9199000${String(30000 + restaurantIndex).slice(-5)}`,
        businessEmail: `${restaurant.id}.owner@sarva.example`,
        cateringPhone: `+9199001${String(30000 + restaurantIndex).slice(-5)}`,
        cateringWhatsapp: `+9199001${String(30000 + restaurantIndex).slice(-5)}`,
        cateringEmail: `${restaurant.id}.catering@sarva.example`,
        emergencyPhone: `+9199002${String(30000 + restaurantIndex).slice(-5)}`,
      },
      deliverySettings: {
        radiusKm: restaurant.deliveryRadiusKm,
        baseFee: restaurant.deliveryFee,
        freeDeliveryAbove: 499,
        maxOrdersPerSlot: 8,
        deliverySlotMinutes: 30,
      },
      scheduling: {
        enabled: true,
        minPrepMinutes: 30,
        cutoffMinutes: 45,
        slotMinutes: 30,
        maxOrdersPerSlot: 8,
        dineInReservationEnabled: true,
        parcelSchedulingEnabled: true,
        deliverySchedulingEnabled: true,
      },
      advancedFeatures: {
        preorder: true,
        festivalMenus: true,
        limitedTimeMenus: true,
        comboBuilder: true,
        subscriptionMeals: true,
        recurringLunchPlans: true,
        groupOrdering: true,
        officeOrdering: true,
        splitPayments: true,
        familyCartSharing: true,
      },
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    batchRef.set(db.collection("branches").doc(branchIdForRestaurant), {
      id: branchIdForRestaurant,
      tenantId: restaurant.id,
      restaurantId: restaurant.id,
      name: restaurant.location,
      address: restaurant.address,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      phone: `+9180808${String(30000 + restaurantIndex).slice(-5)}`,
      active: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    batchRef.set(db.collection("menus").doc(`menu-${restaurant.id}`), {
      id: `menu-${restaurant.id}`,
      tenantId: restaurant.id,
      restaurantId: restaurant.id,
      branchId: branchIdForRestaurant,
      name: "Delivery menu",
      active: true,
      available: true,
      channels: ["delivery", "parcel"],
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    for (const menuType of ["dine-in", "parcel", "delivery"]) {
      batchRef.set(db.collection("menus").doc(`menu-${restaurant.id}-${menuType}`), {
        id: `menu-${restaurant.id}-${menuType}`,
        tenantId: restaurant.id,
        restaurantId: restaurant.id,
        branchId: branchIdForRestaurant,
        name: `${menuType} menu`,
        menuType,
        active: true,
        available: true,
        channels: [menuType],
        sortOrder: menuType === "dine-in" ? 1 : menuType === "parcel" ? 2 : 3,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    categories.forEach((categoryName, categoryIndex) => {
      const categoryId = `${restaurant.id}-cat-${safeSeedId(categoryName)}`;
      batchRef.set(db.collection("menuCategories").doc(categoryId), {
        id: categoryId,
        tenantId: restaurant.id,
        restaurantId: restaurant.id,
        branchId: branchIdForRestaurant,
        ownerId: restaurantOwnerId,
        name: categoryName,
        sortOrder: categoryIndex + 1,
        enabled: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    });

    restaurant.menus.forEach((item, itemIndex) => {
      const [itemId, name, categoryName, price, isVeg, foodType, description, tag] = item;
      const menuId = `${restaurant.id}-${itemId}`;
      const parcelCharge = price >= 300 ? 18 : 10;
      const categoryId = `${restaurant.id}-cat-${safeSeedId(categoryName)}`;
      const payload = {
        id: menuId,
        tenantId: restaurant.id,
        restaurantId: restaurant.id,
        branchId: branchIdForRestaurant,
        ownerId: restaurantOwnerId,
        categoryId,
        category: categoryName,
        cuisineIds: restaurant.cuisine.map(safeSeedId),
        name,
        description,
        price,
        dineInPrice: price,
        parcelPrice: price + parcelCharge,
        deliveryPrice: price + parcelCharge + restaurant.deliveryFee,
        taxRate: 5,
        packingCharge: parcelCharge,
        imagePath: itemImageFor(categoryName, foodType),
        isVeg,
        foodType,
        available: true,
        menuVisibility: { "dine-in": true, parcel: true, delivery: true },
        channelConfig: {
          "dine-in": { visible: true, available: true, price, taxRate: 5, packingCharge: 0 },
          parcel: { visible: true, available: true, price: price + parcelCharge, taxRate: 5, packingCharge: parcelCharge },
          delivery: { visible: true, available: true, price: price + parcelCharge + restaurant.deliveryFee, taxRate: 5, packingCharge: parcelCharge },
        },
        tags: Array.from(new Set([tag, itemIndex < 2 ? "popular" : "", itemIndex === 1 ? "bestseller" : ""].filter(Boolean))),
        sortOrder: itemIndex + 1,
        createdAt: now,
        updatedAt: now,
      };
      batchRef.set(db.collection("menuItems").doc(menuId), payload, { merge: true });
      batchRef.set(db.collection("dineInMenus").doc(menuId), { ...payload, menuType: "dine-in" }, { merge: true });
      batchRef.set(db.collection("parcelMenus").doc(menuId), { ...payload, menuType: "parcel" }, { merge: true });
      batchRef.set(db.collection("deliveryMenus").doc(menuId), { ...payload, menuType: "delivery" }, { merge: true });
    });

    batchRef.set(db.collection("offers").doc(`offer-${restaurant.offer.code.toLowerCase()}`), {
      id: `offer-${restaurant.offer.code.toLowerCase()}`,
      tenantId: restaurant.id,
      restaurantId: restaurant.id,
      code: restaurant.offer.code,
      title: restaurant.offer.title,
      discountType: restaurant.offer.discountType,
      discountValue: restaurant.offer.discountValue,
      minimumOrder: restaurant.offer.minimumOrder,
      active: true,
      startsAt: offerStart,
      endsAt: offerEnd,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const firstItem = restaurant.menus[0];
    const secondItem = restaurant.menus[1];
    const orderDate = new Date(Date.now() - (restaurantIndex + 1) * 18 * 60 * 60 * 1000);
    const orderId = `order-demo-${restaurant.id}`;
    const subtotal = Number(firstItem[3]) + Number(secondItem[3]);
    const discount = restaurant.offer.discountType === "flat"
      ? Math.min(subtotal, restaurant.offer.discountValue)
      : Math.round(subtotal * (restaurant.offer.discountValue / 100));
    const tax = Math.round((subtotal - discount) * 0.05);
    const total = subtotal - discount + restaurant.deliveryFee + tax;
    const lines = [
      { menuItemId: `${restaurant.id}-${firstItem[0]}`, name: firstItem[1], price: Number(firstItem[3]), quantity: 1 },
      { menuItemId: `${restaurant.id}-${secondItem[0]}`, name: secondItem[1], price: Number(secondItem[3]), quantity: 1 },
    ];
    const orderPayload = {
      id: orderId,
      tenantId: restaurant.id,
      restaurantId: restaurant.id,
      branchId: branchIdForRestaurant,
      customerId: "demo-customer",
      customerName: "Demo Customer",
      customerPhone: "+919900009900",
      deliveryAddress: thanisandraDeliveryLocation.address,
      deliveryAddressLabel: thanisandraDeliveryLocation.label,
      deliveryGeo: { lat: thanisandraDeliveryLocation.latitude, lng: thanisandraDeliveryLocation.longitude },
      deliveryPlaceId: "registered-monarch-serenity-thanisandra",
      channel: "web",
      status: restaurantIndex % 3 === 0 ? "delivered" : "completed",
      orderType: "delivery",
      lines,
      offerCode: restaurant.offer.code,
      subtotal,
      discount,
      tax,
      deliveryFee: restaurant.deliveryFee,
      total,
      paymentStatus: "paid",
      deliveryOtp: String(4700 + restaurantIndex),
      createdAt: orderDate,
      updatedAt: orderDate,
    };
    batchRef.set(db.collection("orders").doc(orderId), orderPayload, { merge: true });
    batchRef.set(db.collection("customerOrders").doc(orderId), orderPayload, { merge: true });

    [firstItem, secondItem].forEach((item, reviewIndex) => {
      const reviewId = `review-${restaurant.id}-${reviewIndex + 1}`;
      const reviewDate = new Date(orderDate.getTime() + (reviewIndex + 1) * 60 * 60 * 1000);
      batchRef.set(db.collection("customerReviews").doc(reviewId), {
        id: reviewId,
        tenantId: restaurant.id,
        restaurantId: restaurant.id,
        branchId: branchIdForRestaurant,
        menuItemId: `${restaurant.id}-${item[0]}`,
        menuItemName: item[1],
        orderId,
        customerId: "demo-customer",
        customerName: reviewIndex === 0 ? "Demo Customer" : sampleReviewerName(restaurantIndex),
        rating: Math.max(3, Math.min(5, Math.round(restaurant.rating + (reviewIndex === 0 ? 0.2 : -0.1)))),
        comment: reviewCopyFor(restaurant.cuisine[0], item[1], restaurant.deliveryTime),
        imageUrls: [],
        verifiedOrder: true,
        status: "published",
        reportCount: 0,
        createdAt: reviewDate,
        updatedAt: reviewDate,
      }, { merge: true });
    });

    batchRef.set(db.collection("deliveryZones").doc(`zone-${restaurant.id}`), {
      id: `zone-${restaurant.id}`,
      tenantId: restaurant.id,
      restaurantId: restaurant.id,
      branchId: branchIdForRestaurant,
      name: `${restaurant.name} ${restaurant.deliveryRadiusKm}km`,
      radiusKm: restaurant.deliveryRadiusKm,
      baseFee: restaurant.deliveryFee,
      active: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  });
}

function safeSeedId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function itemImageFor(categoryName, foodType) {
  const key = `${categoryName} ${foodType}`.toLowerCase();
  if (key.includes("biryani")) return "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=900&q=80";
  if (key.includes("coffee")) return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80";
  if (key.includes("bakery") || key.includes("dessert")) return "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80";
  if (key.includes("juice") || key.includes("shake") || key.includes("lassi")) return "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=80";
  if (key.includes("seafood") || key.includes("fish") || key.includes("prawns")) return "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80";
  if (key.includes("veg")) return "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=900&q=80";
  return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80";
}

function sampleReviewerName(index) {
  return ["Aanya Rao", "Nikhil Menon", "Sameera Khan", "Rohit Nair", "Priya S", "Vikram M"][index % 6];
}

function reviewCopyFor(cuisine, itemName, deliveryTime) {
  if (/cafe|coffee/i.test(cuisine)) return `${itemName} arrived warm and the packaging felt cafe-fresh. Delivery was within ${deliveryTime}.`;
  if (/bakery|dessert/i.test(cuisine)) return `${itemName} was fresh, neatly packed, and still had a good texture after delivery.`;
  if (/juice/i.test(cuisine)) return `${itemName} tasted fresh, chilled, and not overly sweet. Good quick delivery.`;
  if (/kerala|seafood/i.test(cuisine)) return `${itemName} had proper coastal flavour and travelled well to Thanisandra.`;
  return `${itemName} was well packed, hot on arrival, and matched the restaurant rating.`;
}

seedThanisandraRestaurants(batch, resolvedUsers.find((user) => user.role === "owner")?.uid ?? "divakdi@gmail.com");

await batch.commit();
console.log("Firebase production backend seeded for Cafe Al Arab and Falak - The Leela Bhartiya City.");
console.log(`Bootstrap owner mapped: ${resolvedUsers[0].email} (${resolvedUsers[0].uid})`);
