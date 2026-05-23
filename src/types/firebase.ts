import type { Timestamp } from "firebase/firestore";

export type UserRole =
  | "customer"
  | "owner"
  | "admin"
  | "manager"
  | "delivery"
  | "delivery-staff"
  | "cashier"
  | "waiter"
  | "chef"
  | "kitchen-manager"
  | "accountant"
  | "inventory-manager";

export type FirestoreDate = Timestamp | Date;

export type BaseDoc = {
  id: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: FirestoreDate | null;
  deletedBy?: string | null;
};

export type TenantDoc = BaseDoc & {
  tenantId: string;
  branchId?: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "disabled";
  ownerIds: string[];
  primaryBranchId?: string;
  subscriptionId?: string;
};

export type TenantScopedDoc = BaseDoc & {
  tenantId: string;
  restaurantId: string;
  ownerId?: string;
  branchId?: string;
};

export type UserDoc = BaseDoc & {
  uid?: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  roleId?: string;
  tenantId?: string;
  tenantIds?: string[];
  restaurantIds: string[];
  branchIds?: string[];
  permissions?: string[];
  active: boolean;
};

export type RestaurantDoc = BaseDoc & {
  tenantId: string;
  name: string;
  slug: string;
  ownerIds: string[];
  ownerId?: string;
  branchId?: string;
  primaryBranchId?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  deliveryRadiusKm?: number;
  cuisine: string;
  active: boolean;
  imagePath?: string;
  subscriptionId?: string;
  contact?: RestaurantContactSettings;
  ownerProfile?: OwnerContactSettings;
  deliverySettings?: DeliverySettings;
  scheduling?: RestaurantSchedulingSettings;
  advancedFeatures?: AdvancedRestaurantFeatures;
};

export type RestaurantContactSettings = {
  phone: string;
  whatsapp: string;
  supportEmail: string;
  callbackEnabled: boolean;
};

export type OwnerContactSettings = {
  businessPhone: string;
  businessWhatsapp: string;
  businessEmail: string;
  cateringPhone: string;
  cateringWhatsapp: string;
  cateringEmail: string;
  emergencyPhone: string;
};

export type DeliverySettings = {
  radiusKm: number;
  baseFee: number;
  freeDeliveryAbove?: number;
  maxOrdersPerSlot?: number;
  deliverySlotMinutes?: number;
};

export type RestaurantSchedulingSettings = {
  enabled: boolean;
  minPrepMinutes: number;
  cutoffMinutes: number;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  dineInReservationEnabled: boolean;
  parcelSchedulingEnabled: boolean;
  deliverySchedulingEnabled: boolean;
};

export type AdvancedRestaurantFeatures = {
  preorder: boolean;
  festivalMenus: boolean;
  limitedTimeMenus: boolean;
  comboBuilder: boolean;
  subscriptionMeals: boolean;
  recurringLunchPlans: boolean;
  groupOrdering: boolean;
  officeOrdering: boolean;
  splitPayments: boolean;
  familyCartSharing: boolean;
};

export type BranchDoc = TenantScopedDoc & {
  name: string;
  address: string;
  phone?: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
};

export type MenuCategoryDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId?: string;
  name: string;
  imagePath?: string;
  bannerPath?: string;
  sortOrder: number;
  active: boolean;
  schedule?: { days: string[]; startTime: string; endTime: string };
};

export type MenuDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId?: string;
  categoryId: string;
  cuisineIds?: string[];
  name: string;
  translations?: Partial<Record<"hi" | "ml" | "ta" | "kn" | "ar", { name?: string; description?: string }>>;
  description: string;
  longDescription?: string;
  price: number;
  dineInPrice?: number;
  parcelPrice?: number;
  deliveryPrice?: number;
  taxRate?: 5 | 18;
  packingCharge?: number;
  imagePath?: string;
  imagePaths?: string[];
  isVeg: boolean;
  foodType?: "veg" | "nonveg" | "egg" | "vegan" | "jain";
  available: boolean;
  menuVisibility?: Record<"dine-in" | "parcel" | "delivery", boolean>;
  channelConfig?: Record<"dine-in" | "parcel" | "delivery", { visible: boolean; available: boolean; price: number; taxRate: 5 | 18; packingCharge: number; offerCode?: string; startTime?: string; endTime?: string; offerIds?: string[] }>;
  tags?: string[];
  dietaryLabels?: string[];
  allergenLabels?: string[];
  modifierGroupIds?: string[];
  variantGroupIds?: string[];
  recipeLinks?: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
  scheduleIds?: string[];
  menuType?: "dine-in" | "parcel" | "delivery";
  limitedTime?: { startsAt?: FirestoreDate; endsAt?: FirestoreDate; label?: string };
  festivalSpecial?: { festival: string; startsAt: FirestoreDate; endsAt: FirestoreDate };
  preorder?: { enabled: boolean; minNoticeMinutes: number };
  sortOrder: number;
};

export type CuisineDoc = TenantScopedDoc & {
  restaurantId: string;
  name: string;
  imagePath?: string;
  icon?: string;
  active: boolean;
};

export type MenuVariantDoc = TenantScopedDoc & {
  restaurantId: string;
  menuItemId: string;
  name: string;
  required: boolean;
  options: Array<{ id: string; name: string; price: number }>;
};

export type ModifierGroupDoc = TenantScopedDoc & {
  restaurantId: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; price: number }>;
};

export type TaxSettingsDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  gstEnabled: boolean;
  gstin?: string;
  pricingMode: "inclusive" | "exclusive";
  defaultGstRate: 5 | 18;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  serviceChargeRate: number;
  defaultPackingCharge: number;
  sac: "996331";
};

export type ComboOfferDoc = TenantScopedDoc & {
  restaurantId: string;
  name: string;
  itemIds: string[];
  price: number;
  discount: number;
  active: boolean;
};

export type MenuScheduleDoc = TenantScopedDoc & {
  restaurantId: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  active: boolean;
};

export type OrderStatus =
  | "new"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready"
  | "served"
  | "picked-up"
  | "delivered"
  | "completed"
  | "cancelled";

export type OrderChannel = "web" | "instagram" | "whatsapp" | "pos" | "catering";

export type OrderLineDoc = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

export type OrderDoc = TenantScopedDoc & {
  restaurantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryGeo?: { lat: number; lng: number };
  deliveryPlaceId?: string;
  deliveryAddressLabel?: string;
  channel: OrderChannel;
  status: OrderStatus;
  lines: OrderLineDoc[];
  offerCode?: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded";
  deliveryOtp: string;
  orderType?: "dine-in" | "takeaway" | "parcel" | "delivery";
  tableNumber?: string;
  waiterId?: string;
  waiterName?: string;
  fulfillmentType?: "delivery" | "parcel" | "dine-in";
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: FirestoreDate;
  scheduledDateLabel?: string;
  scheduledSlotId?: string;
  scheduledStatus?: "requested" | "accepted" | "rejected" | "expired";
  cutoffAt?: FirestoreDate;
  prepEstimateMinutes?: number;
  capacityCheck?: {
    slotMinutes: number;
    maxOrders: number;
    reservedOrders: number;
    deliveryCapacityOk: boolean;
  };
  guestCount?: number;
  groupOrderId?: string;
  splitPayment?: boolean;
};

export type KitchenOrderStatus = "new" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export type KitchenOrderDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  orderType: "dine-in" | "takeaway" | "parcel" | "delivery";
  source: "QR" | "Waiter" | "POS" | "Takeaway" | "Parcel" | "Delivery";
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  scheduledFor?: FirestoreDate;
  waiterId?: string;
  waiterName?: string;
  status: KitchenOrderStatus;
  priority: "normal" | "rush";
  lines: OrderLineDoc[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "refunded";
  etaMinutes: number;
  receiptId?: string;
};

export type CustomerProfileDoc = BaseDoc & {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  active: boolean;
};

export type CustomerAddressDoc = BaseDoc & {
  customerId: string;
  tenantId?: string;
  restaurantId?: string;
  label: string;
  address: string;
  fullAddress?: string;
  landmark?: string;
  geo?: { lat: number; lng: number };
  verified?: boolean;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  placeId?: string;
};

export type CustomerOrderDoc = OrderDoc;

export type CustomerLoyaltyDoc = TenantScopedDoc & {
  customerId: string;
  points: number;
  tier: "Regular" | "Silver" | "Gold" | "VIP";
  totalOrders: number;
  lifetimeValue: number;
  lastOrderAt?: FirestoreDate;
};

export type CustomerDoc = TenantScopedDoc & {
  restaurantId: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  loyaltyPoints: number;
  tier: "Regular" | "Silver" | "Gold" | "VIP";
  totalOrders: number;
  lifetimeValue: number;
  lastOrderAt?: FirestoreDate;
  inactiveDays?: number;
  savedAddresses?: Array<{ id: string; label: string; address: string; latitude?: number; longitude?: number }>;
  previousOrderIds?: string[];
};

export type RestaurantSettingsDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId?: string;
  mapboxToken?: string;
  mapDefaults: {
    latitude: number;
    longitude: number;
    zoom: number;
    country?: string;
  };
  geocoding: {
    autocomplete: boolean;
    reverseGeocoding: boolean;
    proximityBias: boolean;
  };
  deliveryRadiusKm: number;
  receiptBranding?: {
    logoUrl?: string;
    footerImageUrl?: string;
    compactMode?: boolean;
    premiumMode?: boolean;
  };
};

export type RestaurantTableDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  tableNumber: string;
  seats: number;
  status: "vacant" | "occupied" | "preparing" | "ready" | "served" | "completed" | "billed";
  activeKitchenOrderId?: string;
};

export type OfferDoc = TenantScopedDoc & {
  restaurantId: string;
  code: string;
  title: string;
  subtitle?: string;
  description?: string;
  promoTag?: string;
  banner?: string;
  mobileBanner?: string;
  discountType: "percentage" | "flat" | "free-delivery" | "buy-x-get-y" | "combo";
  offerType?: "flat" | "percentage" | "free-delivery" | "buy-x-get-y" | "combo" | "festival" | "first-order" | "bulk" | "catering" | "happy-hour";
  discountValue: number;
  minimumOrder: number;
  maxDiscount?: number;
  active: boolean;
  status?: "active" | "inactive" | "paused";
  startsAt?: FirestoreDate;
  endsAt?: FirestoreDate;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
  applicableCategories?: string[];
  applicableItemIds?: string[];
  appliesTo?: Array<"dine-in" | "delivery" | "parcel" | "takeaway">;
  newCustomersOnly?: boolean;
  usageLimit?: number;
  perUserLimit?: number;
  showOnHomepage?: boolean;
  showOnRestaurantPage?: boolean;
  featured?: boolean;
  priority?: number;
  sponsored?: boolean;
  sponsoredPriority?: number;
  adBudget?: number;
  campaignStatus?: "draft" | "scheduled" | "active" | "paused" | "ended";
  conditions?: string;
};

export type ReviewDoc = TenantScopedDoc & {
  restaurantId: string;
  menuItemId?: string;
  menuItemName?: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  imageUrls?: string[];
  verifiedOrder: boolean;
  ownerReply?: {
    message: string;
    repliedAt: FirestoreDate;
    repliedBy: string;
  };
  status: "published" | "pending" | "hidden" | "reported";
  reportCount?: number;
  reportedBy?: string[];
  moderationNote?: string;
};

export type InventoryDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId?: string;
  itemName: string;
  category?: string;
  unit: string;
  quantity: number;
  reorderAt: number;
  status: "ok" | "watch" | "low" | "reorder";
};

export type DeliveryDoc = TenantScopedDoc & {
  orderId: string;
  restaurantId: string;
  partnerId?: string;
  pickupAddress: string;
  dropAddress: string;
  status: "assigned" | "picked-up" | "delivered" | "failed";
  otpHash: string;
};

export type CampaignDoc = TenantScopedDoc & {
  restaurantId: string;
  title: string;
  channel: "instagram" | "web" | "whatsapp";
  offerCode?: string;
  status: "draft" | "scheduled" | "published" | "paused";
  scheduledFor?: FirestoreDate;
};

export type SocialTemplateDoc = BaseDoc & {
  tenantId?: string;
  restaurantId?: string;
  name: string;
  format: "story" | "feed" | "carousel";
  settings: Record<string, string | number | boolean>;
  public: boolean;
};

export type SocialPostDoc = TenantScopedDoc & {
  restaurantId: string;
  campaignId?: string;
  templateId: string;
  imagePath: string;
  headline: string;
  caption: string;
  offerCode?: string;
  exportMetadata?: Record<string, string | number | boolean>;
};

export type CateringRequestDoc = TenantScopedDoc & {
  restaurantId: string;
  customerId?: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  guestCount: number;
  packageId: string;
  eventDate?: FirestoreDate;
  eventTime?: string;
  eventType?: string;
  notes: string;
  imageUrls?: string[];
  callbackRequested?: boolean;
  contactPreference?: "phone" | "whatsapp" | "email";
  status: "new" | "contacted" | "quoted" | "confirmed" | "converted" | "cancelled";
  quotedTotal?: number;
  quotation?: {
    subtotal: number;
    serviceFee: number;
    total: number;
    sentAt: FirestoreDate;
    validUntil?: FirestoreDate;
  };
  convertedOrderId?: string;
};

export type CallbackRequestDoc = TenantScopedDoc & {
  restaurantId: string;
  customerId?: string;
  name: string;
  phone: string;
  reason: "order" | "catering" | "support" | "callback";
  notes?: string;
  status: "new" | "contacted" | "closed";
};

export type SubscriptionDoc = TenantScopedDoc & {
  restaurantId: string;
  plan: "trial" | "growth" | "pro";
  status: "trialing" | "active" | "past_due" | "cancelled";
  currentPeriodEnd?: FirestoreDate;
};

export type BillTemplateDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  name: string;
  paperWidth: "58mm" | "80mm" | "100mm" | "label" | "A4";
  mode: "compact" | "standard" | "premium" | "branded";
  logoUrl?: string;
  footerImageUrl?: string;
  brandName?: string;
  showLogo: boolean;
  showGstBreakup: boolean;
  showQrCode: boolean;
  showFooter: boolean;
  showWaiterName: boolean;
  showItemNotes: boolean;
  showBranch: boolean;
  footerNote?: string;
  refundPolicy?: string;
  language?: "en" | "hi" | "ml";
};

export type KotTemplateDoc = BillTemplateDoc & {
  routeTo: "kitchen" | "bar";
  showPriority: boolean;
  showAllergens: boolean;
};

export type PrinterProfileDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  name: string;
  type: "billing" | "kitchen" | "bar";
  paperWidth: "58mm" | "80mm" | "100mm" | "label" | "A4";
  connection: "usb" | "bluetooth" | "ethernet" | "browser" | "escpos";
  status: "online" | "offline" | "test";
  autoCut: boolean;
  copies: number;
  encoding: "utf-8" | "cp437" | "cp858";
  marginMm: number;
  fontScale: "compact" | "normal" | "large";
};

export type PrintLogDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  printerProfileId: string;
  referenceId: string;
  type: "bill" | "kot" | "test";
  status: "printed" | "failed" | "reprint" | "queued";
  userId: string;
  duplicate: boolean;
};

export type ReceiptDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  invoiceNumber: string;
  orderId: string;
  cashier: string;
  paymentMethod: PaymentProvider | "cash" | "upi" | "card" | "cod";
  subtotal: number;
  taxBreakup: Record<string, number | string>;
  total: number;
};

export type ReceiptTemplateDoc = BillTemplateDoc & {
  templateCode: "standard" | "premium" | "compact" | "branded";
};

export type PaymentTransactionDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  receiptId: string;
  invoiceNumber: string;
  method: "cash" | "card" | "upi";
  amount: number;
  reference?: string;
  cashierId: string;
  status: "authorized" | "paid" | "failed" | "refunded";
};

export type KotPrintQueueDoc = TenantScopedDoc & {
  restaurantId: string;
  branchId: string;
  orderId: string;
  printerProfileId: string;
  status: "queued" | "printing" | "printed" | "failed";
  copies: number;
};

export type PaymentProvider = "razorpay" | "stripe" | "upi";

export type PaymentIntentDraft = {
  provider: PaymentProvider;
  orderId: string;
  amount: number;
  currency: "INR" | "USD";
  metadata: Record<string, string>;
};
