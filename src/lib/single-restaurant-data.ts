import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import type {
  Cuisine,
  InventoryItem,
  MenuCategory,
  MenuItem,
  Offer,
  OperatingHoursDay,
  OwnerBusinessProfile,
  PosTable,
  Restaurant,
  RestaurantBranch,
  StaffMember,
  TaxSettings,
} from "@/lib/types";
import type { MenuDoc, OfferDoc, RestaurantDoc } from "@/types/firebase";

export const SINGLE_OWNER_EMAIL = "owner@sarva.test";
export const SINGLE_OWNER_ID = "test-owner";
export const SINGLE_OWNER_NAME = "Test Owner";
export const SINGLE_RESTAURANT_NAME = "Test Owner";
export const SINGLE_RESTAURANT_DISPLAY_NAME = "Cafe Al Arab";
export const SINGLE_RESTAURANT_SLUG = DEFAULT_RESTAURANT_ID;
export const SINGLE_PRIMARY_BRANCH_ID = DEFAULT_BRANCH_ID;

export const singleCuisineOptions = [
  "Arabic",
  "Middle Eastern",
  "Grill",
  "Biryani",
  "Desserts",
  "Beverages",
];

export const singleOperatingHours: OperatingHoursDay[] = [
  { day: "Monday", open: true, slots: [{ start: "11:00", end: "23:00" }] },
  { day: "Tuesday", open: true, slots: [{ start: "11:00", end: "23:00" }] },
  { day: "Wednesday", open: true, slots: [{ start: "11:00", end: "23:00" }] },
  { day: "Thursday", open: true, slots: [{ start: "11:00", end: "23:00" }] },
  { day: "Friday", open: true, slots: [{ start: "11:00", end: "23:30" }] },
  { day: "Saturday", open: true, slots: [{ start: "11:00", end: "23:30" }] },
  { day: "Sunday", open: true, slots: [{ start: "11:00", end: "23:00" }] },
];

export function formatOperatingHours(schedule = singleOperatingHours) {
  const openDays = schedule.filter((day) => day.open && day.slots.length > 0);
  if (!openDays.length) return "Not specified";
  const firstSlot = openDays[0]?.slots[0];
  const allSame = openDays.every((day) =>
    day.slots.length === 1 &&
    day.slots[0]?.start === firstSlot?.start &&
    day.slots[0]?.end === firstSlot?.end,
  );
  if (openDays.length === 7 && allSame && firstSlot) {
    return `Daily ${firstSlot.start} - ${firstSlot.end}`;
  }
  return openDays
    .map((day) => `${day.day.slice(0, 3)} ${day.slots.map((slot) => `${slot.start}-${slot.end}`).join(", ")}`)
    .join("; ");
}

export const singleOwnerBusinessProfile: OwnerBusinessProfile = {
  hotelName: SINGLE_RESTAURANT_DISPLAY_NAME,
  logo: "/icons/sarva-icon.svg",
  coverImage: "/images/fallback-restaurant.svg",
  businessAddress: "12 Mosque Road, Frazer Town, Bengaluru, Karnataka 560005",
  googleMapLocation: "https://www.google.com/maps?q=12.9984,77.6150",
  latitude: 12.9984,
  longitude: 77.615,
  mapboxPlaceId: "sarva-test-owner-cafe-al-arab",
  locationVerified: true,
  cuisineType: singleCuisineOptions.join(", "),
  cuisineTypes: singleCuisineOptions,
  phoneNumber: "+91 98765 43210",
  whatsappNumber: "+91 98765 43210",
  supportEmail: SINGLE_OWNER_EMAIL,
  cateringPhoneNumber: "+91 98765 43210",
  cateringWhatsappNumber: "+91 98765 43210",
  cateringEmail: "catering@cafealarab.test",
  emergencySupportNumber: "+91 98765 43210",
  operatingHours: formatOperatingHours(singleOperatingHours),
  operatingHoursSchedule: singleOperatingHours,
  operatingHoursPreference: "specified",
  deliveryRadiusKm: 7,
  gstDetails: "",
  fssaiLicense: "",
  diningAvailable: true,
  cloudKitchen: false,
  reviewStatus: "pending_review",
  completed: true,
};

export const singleRestaurant: Restaurant = {
  id: SINGLE_RESTAURANT_SLUG,
  tenantId: DEFAULT_TENANT_ID,
  ownerId: SINGLE_OWNER_ID,
  branchId: SINGLE_PRIMARY_BRANCH_ID,
  ownerIds: [SINGLE_OWNER_ID],
  name: SINGLE_RESTAURANT_NAME,
  displayName: SINGLE_RESTAURANT_DISPLAY_NAME,
  slug: SINGLE_RESTAURANT_SLUG,
  cuisine: singleCuisineOptions.join(", "),
  location: "Frazer Town, Bengaluru",
  rating: 4.7,
  deliveryTime: "30-40 min",
  priceForTwo: 650,
  image: "/images/fallback-restaurant.svg",
  isOpen: true,
  tags: ["Cafe Al Arab", "Arabic", "Grill", "Biryani"],
  instagramHandle: "cafealarab.test",
  latitude: singleOwnerBusinessProfile.latitude,
  longitude: singleOwnerBusinessProfile.longitude,
  deliveryRadiusKm: singleOwnerBusinessProfile.deliveryRadiusKm,
  approved: true,
  reviewCount: 1,
  deliveryFee: 39,
  minPrice: 80,
  maxPrice: 520,
  foodTypes: ["veg", "nonveg"],
  popularItems: ["Chicken Shawarma Plate", "Mutton Mandi", "Falafel Wrap"],
  categoryTags: ["Arabic", "Grill", "Desserts", "Beverages"],
  offerCodes: [],
  searchKeywords: ["test owner", "cafe al arab", "arabic", "mandi", "shawarma", "biryani"],
  contact: {
    phone: singleOwnerBusinessProfile.phoneNumber,
    whatsapp: singleOwnerBusinessProfile.whatsappNumber ?? singleOwnerBusinessProfile.phoneNumber,
    supportEmail: singleOwnerBusinessProfile.supportEmail ?? SINGLE_OWNER_EMAIL,
    callbackEnabled: true,
  },
  ownerProfile: {
    businessPhone: singleOwnerBusinessProfile.phoneNumber,
    businessWhatsapp: singleOwnerBusinessProfile.whatsappNumber ?? singleOwnerBusinessProfile.phoneNumber,
    businessEmail: SINGLE_OWNER_EMAIL,
    cateringPhone: singleOwnerBusinessProfile.cateringPhoneNumber ?? singleOwnerBusinessProfile.phoneNumber,
    cateringWhatsapp: singleOwnerBusinessProfile.cateringWhatsappNumber ?? singleOwnerBusinessProfile.phoneNumber,
    cateringEmail: singleOwnerBusinessProfile.cateringEmail ?? SINGLE_OWNER_EMAIL,
    emergencyPhone: singleOwnerBusinessProfile.emergencySupportNumber ?? singleOwnerBusinessProfile.phoneNumber,
  },
  deliverySettings: {
    radiusKm: singleOwnerBusinessProfile.deliveryRadiusKm,
    baseFee: 39,
    freeDeliveryAbove: 699,
    maxOrdersPerSlot: 12,
    deliverySlotMinutes: 30,
  },
  scheduling: {
    enabled: true,
    minPrepMinutes: 30,
    cutoffMinutes: 45,
    slotMinutes: 30,
    maxOrdersPerSlot: 12,
    dineInReservationEnabled: true,
    parcelSchedulingEnabled: true,
    deliverySchedulingEnabled: true,
  },
  advancedFeatures: {
    preorder: true,
    festivalMenus: true,
    limitedTimeMenus: true,
    comboBuilder: true,
    subscriptionMeals: false,
    recurringLunchPlans: false,
    groupOrdering: true,
    officeOrdering: true,
    splitPayments: true,
    familyCartSharing: true,
  },
};

export const singleBranch: RestaurantBranch = {
  id: SINGLE_PRIMARY_BRANCH_ID,
  tenantId: DEFAULT_TENANT_ID,
  name: "Cafe Al Arab Main Branch",
  restaurantSlug: SINGLE_RESTAURANT_SLUG,
  address: singleOwnerBusinessProfile.businessAddress,
  phone: singleOwnerBusinessProfile.phoneNumber,
  managerId: SINGLE_OWNER_ID,
};

export const singleCuisines: Cuisine[] = singleCuisineOptions.map((name) => ({
  id: `cuisine-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  restaurantSlug: SINGLE_RESTAURANT_SLUG,
  name,
  enabled: true,
}));

export const singleMenuCategories: MenuCategory[] = [
  { id: "cat-shawarma", restaurantSlug: SINGLE_RESTAURANT_SLUG, name: "Shawarma", enabled: true, sortOrder: 1 },
  { id: "cat-mandi", restaurantSlug: SINGLE_RESTAURANT_SLUG, name: "Mandi & Biryani", enabled: true, sortOrder: 2 },
  { id: "cat-grill", restaurantSlug: SINGLE_RESTAURANT_SLUG, name: "Grill", enabled: true, sortOrder: 3 },
  { id: "cat-desserts", restaurantSlug: SINGLE_RESTAURANT_SLUG, name: "Desserts", enabled: true, sortOrder: 4 },
  { id: "cat-beverages", restaurantSlug: SINGLE_RESTAURANT_SLUG, name: "Beverages", enabled: true, sortOrder: 5 },
];

export const singleMenuItems: MenuItem[] = [
  {
    id: "menu-chicken-shawarma-plate",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Chicken Shawarma Plate",
    category: "Shawarma",
    categoryId: "cat-shawarma",
    cuisineIds: ["cuisine-arabic", "cuisine-middle-eastern"],
    description: "Grilled chicken, khubz, garlic sauce, pickles, and fries.",
    price: 240,
    dineInPrice: 230,
    parcelPrice: 240,
    deliveryPrice: 250,
    taxRate: 5,
    packingCharge: 10,
    image: "/images/fallback-food.svg",
    isVeg: false,
    foodType: "nonveg",
    isPopular: true,
    prepTime: "18 min",
    spiceLevel: "medium",
    tags: ["shawarma", "arabic"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
  {
    id: "menu-mutton-mandi",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Mutton Mandi",
    category: "Mandi & Biryani",
    categoryId: "cat-mandi",
    cuisineIds: ["cuisine-arabic", "cuisine-biryani"],
    description: "Slow-cooked mutton with fragrant mandi rice and salsa.",
    price: 520,
    dineInPrice: 500,
    parcelPrice: 520,
    deliveryPrice: 540,
    taxRate: 5,
    packingCharge: 20,
    image: "/images/fallback-food.svg",
    isVeg: false,
    foodType: "nonveg",
    isPopular: true,
    prepTime: "25 min",
    spiceLevel: "medium",
    tags: ["mandi", "rice"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
  {
    id: "menu-alfaham-half",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Al Faham Chicken Half",
    category: "Grill",
    categoryId: "cat-grill",
    cuisineIds: ["cuisine-grill", "cuisine-arabic"],
    description: "Charcoal grilled chicken with hummus, salad, and pita.",
    price: 360,
    taxRate: 5,
    packingCharge: 15,
    image: "/images/fallback-food.svg",
    isVeg: false,
    foodType: "nonveg",
    prepTime: "22 min",
    spiceLevel: "hot",
    tags: ["grill", "alfaham"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
  {
    id: "menu-falafel-wrap",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Falafel Wrap",
    category: "Shawarma",
    categoryId: "cat-shawarma",
    cuisineIds: ["cuisine-middle-eastern"],
    description: "Crisp falafel, tahini, salad, pickles, and soft pita.",
    price: 160,
    taxRate: 5,
    packingCharge: 10,
    image: "/images/fallback-food.svg",
    isVeg: true,
    foodType: "veg",
    prepTime: "12 min",
    spiceLevel: "mild",
    tags: ["veg", "falafel"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
  {
    id: "menu-baklava",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Baklava",
    category: "Desserts",
    categoryId: "cat-desserts",
    cuisineIds: ["cuisine-desserts"],
    description: "Layered pastry with nuts, honey, and rose syrup.",
    price: 140,
    taxRate: 5,
    packingCharge: 5,
    image: "/images/fallback-food.svg",
    isVeg: true,
    foodType: "veg",
    prepTime: "6 min",
    tags: ["dessert"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
  {
    id: "menu-mint-lime",
    restaurantSlug: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    name: "Mint Lime",
    category: "Beverages",
    categoryId: "cat-beverages",
    cuisineIds: ["cuisine-beverages"],
    description: "Fresh lime, mint, and chilled soda.",
    price: 90,
    taxRate: 5,
    packingCharge: 5,
    image: "/images/fallback-food.svg",
    isVeg: true,
    foodType: "veg",
    prepTime: "5 min",
    tags: ["drink"],
    menuVisibility: { "dine-in": true, parcel: true, delivery: true },
  },
];

export const singleInventoryItems: InventoryItem[] = [
  {
    id: "inv-water-500ml",
    name: "Mineral Water 500 ml",
    category: "Beverage",
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    sku: "CAA-WAT-500",
    price: 25,
    currentStock: 180,
    unit: "bottle",
    reorderLevel: 30,
    lowStockAlert: 30,
    gstApplicable: true,
    gstRate: 18,
    hsnCode: "220110",
    sellable: true,
  },
  {
    id: "inv-baklava-box",
    name: "Baklava Gift Box",
    category: "Packaged Food",
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    sku: "CAA-BAK-BOX",
    price: 399,
    currentStock: 24,
    unit: "box",
    reorderLevel: 6,
    lowStockAlert: 6,
    gstApplicable: true,
    gstRate: 5,
    hsnCode: "190590",
    sellable: true,
  },
  {
    id: "inv-date-pack",
    name: "Premium Dates Pack",
    category: "Packaged Food",
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    sku: "CAA-DAT-250",
    price: 220,
    currentStock: 42,
    unit: "pack",
    reorderLevel: 10,
    lowStockAlert: 10,
    gstApplicable: true,
    gstRate: 5,
    hsnCode: "080410",
    sellable: true,
  },
  {
    id: "inv-garlic-dip",
    name: "Garlic Dip Tub",
    category: "Condiments",
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    sku: "CAA-GAR-DIP",
    price: 80,
    currentStock: 55,
    unit: "tub",
    reorderLevel: 12,
    lowStockAlert: 12,
    gstApplicable: true,
    gstRate: 5,
    hsnCode: "210390",
    sellable: true,
  },
];

export const singlePosTables: PosTable[] = [
  { table: "T01", seats: "4", status: "Open", amount: "0" },
  { table: "T02", seats: "4", status: "Open", amount: "0" },
  { table: "T03", seats: "2", status: "Open", amount: "0" },
  { table: "T04", seats: "6", status: "Open", amount: "0" },
  { table: "T05", seats: "4", status: "Reserved", amount: "0" },
  { table: "T06", seats: "2", status: "Open", amount: "0" },
];

export const singleStaffMembers: StaffMember[] = [
  {
    id: SINGLE_OWNER_ID,
    name: SINGLE_OWNER_NAME,
    role: "owner",
    roleId: "owner",
    status: "active",
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    permissions: ["all"],
    lastActivity: "Primary owner account",
  },
];

export const singleTaxSettings: TaxSettings = {
  id: `tax-${SINGLE_RESTAURANT_SLUG}-${SINGLE_PRIMARY_BRANCH_ID}`,
  restaurantSlug: SINGLE_RESTAURANT_SLUG,
  branchId: SINGLE_PRIMARY_BRANCH_ID,
  gstEnabled: true,
  pricingMode: "inclusive",
  defaultGstRate: 5,
  cgstRate: 2.5,
  sgstRate: 2.5,
  igstRate: 0,
  serviceChargeRate: 0,
  defaultPackingCharge: 10,
  sac: "996331",
};

export const singleOffers: Offer[] = [];

function now() {
  return new Date();
}

export function createSingleRestaurantDoc(): RestaurantDoc {
  const timestamp = now();
  return {
    ...singleRestaurant,
    tenantId: DEFAULT_TENANT_ID,
    name: SINGLE_RESTAURANT_NAME,
    slug: SINGLE_RESTAURANT_SLUG,
    ownerIds: [SINGLE_OWNER_ID],
    imagePath: singleRestaurant.image,
    active: true,
    address: singleOwnerBusinessProfile.businessAddress,
    primaryBranchId: SINGLE_PRIMARY_BRANCH_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createSingleMenuDocs(): MenuDoc[] {
  const timestamp = now();
  return singleMenuItems.map((item, index) => ({
    id: item.id,
    tenantId: DEFAULT_TENANT_ID,
    restaurantId: SINGLE_RESTAURANT_SLUG,
    ownerId: SINGLE_OWNER_ID,
    branchId: SINGLE_PRIMARY_BRANCH_ID,
    categoryId: item.categoryId ?? item.category,
    cuisineIds: item.cuisineIds,
    name: item.name,
    description: item.description,
    longDescription: item.longDescription,
    price: item.price,
    dineInPrice: item.dineInPrice,
    parcelPrice: item.parcelPrice,
    deliveryPrice: item.deliveryPrice,
    taxRate: item.taxRate ?? 5,
    packingCharge: item.packingCharge ?? 0,
    imagePath: item.image,
    imagePaths: item.images,
    isVeg: item.isVeg,
    foodType: item.foodType,
    available: !item.soldOut,
    menuVisibility: item.menuVisibility,
    channelConfig: {
      "dine-in": {
        visible: item.menuVisibility?.["dine-in"] ?? true,
        available: !item.soldOut,
        price: item.dineInPrice ?? item.price,
        taxRate: item.taxRate ?? 5,
        packingCharge: 0,
      },
      parcel: {
        visible: item.menuVisibility?.parcel ?? true,
        available: !item.soldOut,
        price: item.parcelPrice ?? item.price,
        taxRate: item.taxRate ?? 5,
        packingCharge: item.packingCharge ?? 0,
      },
      delivery: {
        visible: item.menuVisibility?.delivery ?? true,
        available: !item.soldOut,
        price: item.deliveryPrice ?? item.price,
        taxRate: item.taxRate ?? 5,
        packingCharge: item.packingCharge ?? 0,
      },
    },
    tags: item.tags,
    dietaryLabels: item.dietaryLabels,
    allergenLabels: item.allergenLabels,
    recipeLinks: item.recipeLinks,
    scheduleIds: item.scheduleIds,
    sortOrder: index + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function createSingleOfferDocs(): OfferDoc[] {
  return [];
}
