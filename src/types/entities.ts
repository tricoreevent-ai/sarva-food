import type { LucideIcon } from "lucide-react";

export type Restaurant = {
  id: string;
  tenantId?: string;
  ownerId?: string;
  branchId?: string;
  ownerIds?: string[];
  name: string;
  displayName?: string;
  slug: string;
  cuisine: string;
  location: string;
  rating: number;
  deliveryTime: string;
  priceForTwo: number;
  image: string;
  logo?: string;
  coverImage?: string;
  coverImages?: string[];
  bannerImages?: string[];
  thumbnailImages?: string[];
  activeBannerThumbnails?: string[];
  primaryThumbnail?: string;
  active?: boolean;
  isOpen: boolean;
  tags: string[];
  instagramHandle: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  distanceKm?: number;
  etaMinutes?: number;
  deliveryEligible?: boolean;
  approved?: boolean;
  profileComplete?: boolean;
  publicListingEnabled?: boolean;
  adminStatus?: "Pending Approval" | "Active" | "Suspended" | "Expired" | "Under Review";
  subscriptionPlan?: "Trial" | "Starter" | "Growth" | "Professional" | "Pro" | "Enterprise";
  subscriptionStatus?: "trialing" | "active" | "suspended" | "expired" | "under-review";
  billingStatus?: "current" | "past-due" | "failed" | "manual" | "custom";
  trialEndsAt?: string;
  nextBillingAt?: string;
  orderingEnabled?: boolean;
  frozen?: boolean;
  adminNote?: string;
  onboardingStatus?: "not-started" | "profile" | "menu" | "payments" | "training" | "completed";
  enabledModules?: string[];
  hiddenOwnerNavItems?: string[];
  featureAccess?: Record<string, boolean>;
  roleAccess?: Record<string, string[]>;
  integrationAccess?: Record<string, boolean>;
  branchLimit?: number;
  employeeLimit?: number;
  ownerLoginEnabled?: boolean;
  forcePasswordReset?: boolean;
  lastCredentialsSentAt?: string;
  reviewCount?: number;
  deliveryFee?: number;
  minPrice?: number;
  maxPrice?: number;
  foodTypes?: Array<"veg" | "nonveg" | "egg" | "vegan" | "jain">;
  popularItems?: string[];
  categoryTags?: string[];
  offerCodes?: string[];
  searchKeywords?: string[];
  address?: string;
  googleMapLocation?: string;
  operatingHours?: string;
  operatingHoursSchedule?: OperatingHoursDay[];
  operatingHoursPreference?: "specified" | "not-specified";
  gstDetails?: string;
  fssaiLicense?: string;
  diningAvailable?: boolean;
  cloudKitchen?: boolean;
  contact?: RestaurantContactSettings;
  ownerProfile?: OwnerContactSettings;
  deliverySettings?: DeliverySettings;
  scheduling?: RestaurantSchedulingSettings;
  advancedFeatures?: AdvancedRestaurantFeatures;
};

export type AppCategory = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
  colorTheme?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AppCuisine = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  active: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type BusinessListingApplication = {
  id: string;
  tenantId?: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  mobile?: string;
  cuisine: string;
  address: string;
  area: string;
  hotelName?: string;
  logo?: string;
  googleMapLocation?: string;
  latitude?: number;
  longitude?: number;
  mapboxPlaceId?: string;
  locationVerified?: boolean;
  gstDetails?: string;
  phoneNumber?: string;
  operatingHours?: string;
  fssaiLicense?: string;
  diningAvailable?: boolean;
  cloudKitchen?: boolean;
  deliveryRadiusKm: number;
  restaurantImages: string[];
  foodImages: string[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
};

export type MenuItem = {
  id: string;
  restaurantSlug: string;
  ownerId?: string;
  name: string;
  translations?: Partial<Record<"hi" | "ml" | "ta" | "kn" | "ar", { name?: string; description?: string }>>;
  category: string;
  categoryId?: string;
  subcategory?: string;
  cuisineIds?: string[];
  description: string;
  longDescription?: string;
  price: number;
  dineInPrice?: number;
  parcelPrice?: number;
  deliveryPrice?: number;
  taxRate?: 5 | 18;
  packingCharge?: number;
  image: string;
  images?: string[];
  imagePath?: string;
  imagePaths?: string[];
  isVeg: boolean;
  foodType?: "veg" | "nonveg" | "egg" | "vegan" | "jain";
  isPopular?: boolean;
  prepTime: string;
  calories?: number;
  spiceLevel?: "mild" | "medium" | "hot";
  averageRating?: number;
  reviewCount?: number;
  orderCount?: number;
  displayOrder?: number;
  featuredOrder?: number;
  featuredEnabled?: boolean;
  dietaryLabels?: string[];
  allergenLabels?: string[];
  tags?: string[];
  badges?: string[];
  searchKeywords?: string[];
  soldOut?: boolean;
  modifiers?: Array<{ name: string; price: number }>;
  addOns?: Array<{ name: string; price: number }>;
  variantGroups?: MenuVariantGroup[];
  modifierGroups?: ModifierGroup[];
  recipeLinks?: InventoryRecipeLink[];
  menuVisibility?: Record<"dine-in" | "parcel" | "delivery", boolean>;
  scheduleIds?: string[];
  templateId?: string;
  templateVersion?: number;
  masterTemplateId?: string;
  masterTemplateVersion?: number;
  templateUpdateIgnoredVersion?: number;
};

export type MenuCategory = {
  id: string;
  restaurantSlug: string;
  name: string;
  translations?: Partial<Record<"hi" | "ml" | "ta" | "kn" | "ar", string>>;
  image?: string;
  banner?: string;
  enabled: boolean;
  sortOrder: number;
  schedule?: { days: string[]; startTime: string; endTime: string };
};

export type Cuisine = {
  id: string;
  restaurantSlug: string;
  name: string;
  image?: string;
  icon?: string;
  enabled: boolean;
};

export type MenuVariantGroup = {
  id: string;
  name: string;
  required: boolean;
  options: Array<{ id: string; name: string; price: number }>;
};

export type ModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; price: number }>;
};

export type ComboOffer = {
  id: string;
  restaurantSlug: string;
  name: string;
  description?: string;
  image?: string;
  itemIds: string[];
  price: number;
  discount: number;
  available: boolean;
};

export type MenuSchedule = {
  id: string;
  restaurantSlug: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type InventoryRecipeLink = {
  inventoryItemId: string;
  quantity: number;
  unit: string;
};

export type TaxSettings = {
  id: string;
  restaurantSlug: string;
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
  autoPricingEnabled?: boolean;
  parcelMarkupPercent?: number;
  deliveryMarkupPercent?: number;
  sac: "996331";
};

export type Offer = {
  code: string;
  title: string;
  subtitle?: string;
  description: string;
  discount: number;
  minimumOrder: number;
  channel: "Web" | "Instagram" | "POS" | "Catering";
  restaurantSlug?: string;
  restaurantName?: string;
  restaurantRating?: number;
  restaurantDistanceKm?: number;
  validity?: string;
  category?: string;
  image?: string;
  banner?: string;
  mobileBanner?: string;
  promoTag?: string;
  appliesTo?: Array<"dine-in" | "delivery" | "parcel" | "takeaway">;
  discountType?: "percentage" | "flat" | "free-delivery" | "buy-x-get-y" | "combo";
  offerType?: "flat" | "percentage" | "free-delivery" | "buy-x-get-y" | "combo" | "festival" | "first-order" | "bulk" | "catering" | "happy-hour";
  validFrom?: string;
  validTo?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
  maxDiscount?: number;
  applicableCategories?: string[];
  applicableItemIds?: string[];
  newCustomersOnly?: boolean;
  usageLimit?: number;
  perUserLimit?: number;
  status?: "active" | "inactive" | "paused";
  showOnHomepage?: boolean;
  showOnRestaurantPage?: boolean;
  hiddenFromHomepage?: boolean;
  featured?: boolean;
  priority?: number;
  sponsored?: boolean;
  sponsoredPriority?: number;
  adBudget?: number;
  campaignStatus?: "draft" | "scheduled" | "active" | "paused" | "ended";
  conditions?: string;
  loyaltyHook?: "points-ready" | "vip-ready" | "reorder-ready";
};

export type CmsBanner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  visible: boolean;
  publishFrom?: string;
  publishTo?: string;
  sortOrder: number;
};

export type CmsSettings = {
  appName?: string;
  branding?: {
    appName: string;
    shortName: string;
    logoUrl?: string;
    faviconUrl?: string;
    appDescription?: string;
    supportEmail?: string;
    supportPhone?: string;
    onboardingEmail?: string;
    onboardingWhatsapp?: string;
  };
  disclaimer: string;
  homepage: {
    title: string;
    subtitle: string;
    visible: boolean;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
    overlayOpacity?: number;
    animationStyle?: "none" | "float" | "fade" | "slide";
  };
  banners: CmsBanner[];
  footer: {
    visible: boolean;
    note: string;
    supportEmail?: string;
    copyright?: string;
    trustText?: string;
    socialLinks?: Array<{ id?: string; label: string; platform?: string; url: string; enabled?: boolean }>;
    sections?: Array<{
      id: string;
      title: string;
      enabled?: boolean;
      links: Array<{ id?: string; label: string; href: string; enabled?: boolean; openInNewTab?: boolean }>;
    }>;
    partnerCard?: {
      visible?: boolean;
      title?: string;
      description?: string;
      primaryLabel?: string;
      primaryHref?: string;
      secondaryLabel?: string;
      secondaryHref?: string;
    };
  };
  announcements: CmsBanner[];
  sponsoredAds: CmsBanner[];
  announcementBar?: {
    visible: boolean;
    message: string;
    backgroundColor?: string;
    icon?: string;
    redirectUrl?: string;
  };
  sections?: {
    categoriesVisible: boolean;
    offersVisible: boolean;
    featuredRestaurantsVisible: boolean;
    popularItemsVisible: boolean;
    recommendedTitle: string;
    popularTitle: string;
    offerTitle: string;
  };
  restaurantListing?: {
    eyebrow: string;
    titleTemplate: string;
    nearbyTitle: string;
    areaTitle: string;
    searchPlaceholder: string;
  };
  featuredRestaurants?: {
    sortLogic: "rating" | "priority" | "manual";
    pinnedRestaurantSlugs: string[];
  };
  operations?: {
    databaseAlertsEnabled: boolean;
    databaseAlertEmail?: string;
    customerUnavailableTitle: string;
    customerUnavailableMessage: string;
  };
  loyalty?: {
    earnPoints: number;
    earnAmount: number;
    redemptionPointsPerRupee: number;
    tiers: Array<{
      name: string;
      minPoints: number;
      benefits: string[];
    }>;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  cmsVersion?: string;
  lastPublishedAt?: string;
  lastPublishedBy?: string;
  legalPages: {
    terms: string;
    privacy: string;
    refund?: string;
    cancellation?: string;
    delivery?: string;
    cookie?: string;
  };
  updatedAt?: string;
};

export type Review = {
  id: string;
  restaurantSlug: string;
  restaurantName?: string;
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
    repliedAt: string;
    repliedBy: string;
  };
  status: "published" | "pending" | "hidden" | "reported";
  reportCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type TimelineStep = {
  label: string;
  description: string;
  time: string;
  status: "done" | "active" | "pending";
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  featureKey?: string;
  minimumPlan?: Restaurant["subscriptionPlan"];
  roles?: Array<StaffRole | "admin">;
};

export type Stat = {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "warning" | "info" | "accent";
};

export type PaymentOption = "upi" | "card" | "cod" | "cash";

export type PaymentBreakdown = {
  method: Exclude<PaymentOption, "cod">;
  amount: number;
  reference?: string;
};

export type OrderChannel = "Web" | "Instagram" | "WhatsApp" | "POS" | "Catering" | "QR";

export type OrderStatus =
  | "draft"
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

export type CustomerDetails = {
  name: string;
  phone: string;
  address: string;
};

export type OrderLine = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  lineType?: "menu" | "inventory";
  gstRate?: number;
  hsnCode?: string;
  modifiers?: string[];
  notes?: string;
  allergyNote?: string;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
};

export type DemoOrder = {
  id: string;
  orderNumber?: string | number;
  displayOrderNumber?: string | number;
  invoiceNumber?: string;
  billNumber?: string;
  restaurantSlug: string;
  customer: CustomerDetails;
  lines: OrderLine[];
  totals: OrderTotals;
  offerCode?: string;
  payment: PaymentOption;
  paymentStatus?: "pending" | "authorized" | "partial" | "paid" | "failed" | "refunded";
  channel: OrderChannel;
  status: OrderStatus;
  createdAt: string;
  deliveryOtp: string;
  kitchenOrderId?: string;
  verificationId?: string;
  statusNote?: string;
  fulfillmentType?: "delivery" | "parcel" | "dine-in";
  scheduleMode?: "now" | "scheduled";
  scheduledFor?: string;
  scheduledStatus?: "requested" | "accepted" | "rejected" | "expired";
  prepEstimateMinutes?: number;
  cutoffAt?: string;
  guestCount?: number;
  groupOrderId?: string;
  splitPayment?: boolean;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
};

export type MockUser = {
  id: string;
  name: string;
  role: StaffRole | "customer" | "admin" | "super_admin" | "delivery";
  tenantId?: string;
  branchIds?: string[];
  restaurantSlug?: string;
};

export type DeliveryStatus = "assigned" | "accepted" | "rejected" | "picked-up" | "on-the-way" | "delivered" | "failed";

export type DeliveryAssignment = {
  id: string;
  orderId: string;
  pickup: string;
  drop: string;
  eta: string;
  status: DeliveryStatus;
  otp: string;
  distanceKm?: number;
  driverId?: string;
  routeHook?: "optimization-ready";
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  category: string;
  paymentTerms: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  contactPerson?: string;
  active?: boolean;
  outstandingAmount?: number;
  lastOrderAt?: string;
};

export type ChartAccount = {
  id: string;
  name: string;
  type: "asset" | "liability" | "income" | "expense" | "equity";
  balance: number;
};

export type ExpenseEntry = {
  id: string;
  branchId: string;
  accountId: string;
  supplierId?: string;
  amount: number;
  taxAmount: number;
  paidBy: PaymentOption;
  note: string;
  timestamp: string;
};

export type LoyaltyCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: "Regular" | "Silver" | "Gold" | "VIP";
  lifetimeValue: number;
  totalOrders?: number;
  lastOrderAt?: string;
  inactiveDays?: number;
  previousOrderIds?: string[];
  orderFrequency: string;
  inactiveRisk: boolean;
  birthdayCouponReady?: boolean;
  referralHook?: boolean;
};

export type SocialTemplate = {
  id: string;
  name: string;
  format: string;
  mood: string;
  palette: string;
};

export type CateringPackage = {
  id: string;
  name: string;
  guests: string;
  price: string;
  pricePerGuest: number;
  basePrice: number;
  inclusions: string[];
};

export type CateringQuote = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  guestCount: number;
  packageId: string;
  eventDate?: string;
  eventTime?: string;
  eventType?: string;
  eventNotes: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  imageUrls?: string[];
  callbackRequested?: boolean;
  contactPreference?: "phone" | "whatsapp" | "email";
  status?: "new" | "contacted" | "quoted" | "confirmed" | "converted" | "cancelled";
  convertedOrderId?: string;
};

export type PosTable = {
  id?: string;
  table: string;
  name?: string;
  seats: string;
  status: "Open" | "Dining" | "Bill requested" | "Reserved" | "Cleaning" | "Inactive";
  amount: string;
  floor?: string;
  section?: string;
  description?: string;
  note?: string;
  active?: boolean;
  dineInEnabled?: boolean;
  qrOrderingEnabled?: boolean;
  qrToken?: string;
  qrUrl?: string;
  qrVersion?: number;
  qrStatus?: "enabled" | "disabled" | "revoked";
  qrLastGeneratedAt?: string;
  qrExpiresAt?: string;
  qrUsageCount?: number;
  currentSessionId?: string;
  sessionStatus?: "none" | "active" | "expired" | "closed";
  sessionCustomerName?: string;
  sessionCustomerPhone?: string;
  sessionCustomerEmail?: string;
  sessionGuestCount?: number;
  sessionCreatedAt?: string;
  sessionExpiresAt?: string;
  sessionTimeoutMinutes?: number;
  sessionIdleTimeoutMinutes?: number;
  lastActivity?: string;
  deviceId?: string;
  currentOrderId?: string;
  currentOrderTotal?: number;
  billRequestedAt?: string;
  serviceRequests?: Array<{ id: string; type: string; status: "open" | "cancelled" | "done"; message?: string; at: string }>;
  sessionEvents?: Array<{ type: string; at: string; message?: string; deviceId?: string; orderId?: string; total?: number; targetTable?: string }>;
  lastCleanedAt?: string;
};

export type PosOrderType = "dine-in" | "takeaway" | "parcel" | "delivery";

export type PosBill = {
  table: string;
  orderType: PosOrderType;
  lines: OrderLine[];
  payment: PaymentOption;
  splitPayments?: PaymentBreakdown[];
  paid: boolean;
  operationId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  linkedKitchenOrderId?: string;
  addOnParentKitchenOrderId?: string;
  guestCount?: number;
  waiterName?: string;
  cashierName?: string;
  discount?: number;
  applyGst?: boolean;
  waiveParcelCharge?: boolean;
  tenderedAmount?: number;
  invoiceNumber?: string;
  billDeliveryLink?: string;
  billDeliveryQr?: string;
  duplicatePrint?: boolean;
};

export type OperatingHoursSlot = {
  start: string;
  end: string;
};

export type OperatingHoursDay = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  open: boolean;
  slots: OperatingHoursSlot[];
};

export type OwnerBusinessProfile = {
  ownerName?: string;
  hotelName: string;
  logo: string;
  coverImage?: string;
  coverImages?: string[];
  thumbnailImages?: string[];
  businessAddress: string;
  googleMapLocation: string;
  latitude?: number;
  longitude?: number;
  mapboxPlaceId?: string;
  locationVerified?: boolean;
  cuisineType: string;
  cuisineTypes?: string[];
  gstDetails?: string;
  phoneNumber: string;
  whatsappNumber?: string;
  supportEmail?: string;
  cateringPhoneNumber?: string;
  cateringWhatsappNumber?: string;
  cateringEmail?: string;
  emergencySupportNumber?: string;
  operatingHours: string;
  operatingHoursSchedule?: OperatingHoursDay[];
  operatingHoursPreference?: "specified" | "not-specified";
  deliveryRadiusKm: number;
  deliveryCharge?: number;
  minimumOrder?: number;
  freeDeliveryThreshold?: number;
  fssaiLicense?: string;
  diningAvailable: boolean;
  cloudKitchen: boolean;
  paymentConfig?: OwnerPaymentConfig;
  reviewStatus?: "draft" | "pending_review" | "approved" | "rejected";
  completed: boolean;
};

export type OwnerPaymentConfig = {
  upiId?: string;
  codEnabled: boolean;
  methods: Array<"upi" | "cod" | "cash" | "card">;
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;
  razorpayMode?: "test" | "live";
  razorpayCompanyName?: string;
  razorpayCompanyLogo?: string;
  razorpayMethods?: {
    upi: boolean;
    card: boolean;
    netbanking: boolean;
    wallet: boolean;
    emi: boolean;
  };
  razorpayPartialPayments?: boolean;
  razorpayMinimumAmount?: number;
  razorpayMaximumAmount?: number;
  razorpayAutoCapture?: boolean;
  razorpayWebhookEnabled?: boolean;
  razorpayRefundEnabled?: boolean;
  razorpayInvoicePrefix?: string;
  razorpayReceiptPrefix?: string;
  razorpayCurrency?: "INR";
  phonePeEnabled?: boolean;
  phonePeMerchantId?: string;
  paytmEnabled?: boolean;
  paytmMerchantId?: string;
};

export type SocialPostStatus = "pending" | "approved" | "rejected" | "published";

export type SocialPost = {
  id: string;
  restaurantSlug: string;
  foodImage: string;
  headline: string;
  offerCode: string;
  caption: string;
  cta: string;
  locationTag: string;
  scheduledAt?: string;
  status: SocialPostStatus;
  submittedAt: string;
  reviewedAt?: string;
  publishedAt?: string;
  adminNote?: string;
  channels: Array<"Instagram" | "Facebook">;
};

export type TableStatus = "vacant" | "new" | "occupied" | "preparing" | "ready" | "picked-up" | "served" | "completed" | "billed";

export type KitchenLifecycleStatus = "new" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export type TableOrderStatus = KitchenLifecycleStatus | "picked-up" | "occupied" | "billed";

export type TableOrder = {
  id: string;
  orderNumber?: string | number;
  displayOrderNumber?: string | number;
  invoiceNumber?: string;
  billNumber?: string;
  tableNumber: string;
  source: "QR" | "Waiter" | "POS" | "Takeaway" | "Parcel" | "Delivery" | "Website" | "Instagram" | "WhatsApp" | "Catering" | "Swiggy" | "Zomato" | "Magicpin" | "ONDC";
  orderType?: PosOrderType;
  guestName?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  scheduledFor?: string;
  lines: OrderLine[];
  status: TableOrderStatus;
  priority: "normal" | "rush";
  waiterId?: string;
  waiterName?: string;
  kitchenStation?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "refunded" | "pending" | "authorized" | "failed";
  branchId?: string;
  printerProfileId?: string;
  activityLog?: ActivityLog[];
  createdAt: string;
  etaMinutes: number;
  verificationId?: string;
  total?: number;
  printedCount?: number;
  lastPrintedAt?: string;
  statusHistory?: Array<{ status?: TableOrderStatus; foodStatus?: TableOrderStatus; event?: string; paymentStatus?: string; at?: string; by?: string }>;
};

export type PaperWidth = "58mm" | "80mm" | "100mm" | "label" | "A4";

export type PrinterSettings = {
  kitchenPrinterName: string;
  billingPrinterName: string;
  autoPrintOrders: boolean;
  compactTickets: boolean;
  connectionStatus: "connected" | "offline" | "browser-preview";
  profiles?: PrinterProfile[];
  escPosReady?: boolean;
  templates?: PrintTemplate[];
  printLogs?: PrintLog[];
};

export type StaffRole = "owner" | "manager" | "cashier" | "waiter" | "chef" | "kitchen-manager" | "delivery-staff" | "delivery" | "accountant" | "admin" | "inventory-manager";

export type StaffMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  roleId?: string;
  status: "active" | "invited" | "off-duty";
  branchId: string;
  permissions: string[];
  lastActivity: string;
  lastLoginAt?: string;
  activeSessions?: number;
  loginHistory?: Array<{ id: string; loginAt?: string; logoutAt?: string; active?: boolean; ip?: string; userAgent?: string }>;
  requiresLogin?: boolean;
  employmentType?: "fixed" | "contract";
  monthlySalary?: number;
  contractRate?: number;
  panNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  professionalTaxState?: string;
  tdsSection?: "salary" | "194C" | "194J";
  payrollEstimate?: {
    grossMonthly: number;
    estimatedAnnualIncome: number;
    tdsMonthly: number;
    professionalTaxMonthly: number;
    pfEmployee: number;
    esiEmployee: number;
    netMonthly: number;
  };
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  module: string;
  timestamp: string;
};

export type AuditLogEntry = {
  id: string;
  userId: string;
  userName?: string;
  role?: string;
  module: "inventory" | "recipe" | "purchase" | "supplier" | "kitchen" | "pos" | "billing" | "permissions";
  action: string;
  entityId?: string;
  entityName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  note?: string;
  createdAt: string;
};

export type PrinterProfile = {
  id: string;
  name: string;
  type: "kitchen" | "billing" | "bar";
  branchId: string;
  paperWidth: PaperWidth;
  connection: "usb" | "bluetooth" | "ethernet" | "browser" | "escpos";
  status: "online" | "offline" | "test";
  copies?: number;
  autoCut?: boolean;
  encoding?: "utf-8" | "cp437" | "cp858";
  marginMm?: number;
  fontScale?: "compact" | "normal" | "large";
};

export type PrintTemplate = {
  id: string;
  name: string;
  branchId: string;
  type: "bill" | "receipt" | "kot";
  paperWidth: PaperWidth;
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

export type PrintLog = {
  id: string;
  type: "bill" | "kot" | "receipt" | "test";
  status: "queued" | "printing" | "success" | "failed" | "retry" | "cancelled" | "printed" | "reprint";
  timestamp: string;
  user: string;
  branchId: string;
  printerProfileId: string;
  referenceId: string;
  lifecycle?: Array<Record<string, unknown>>;
  printerResponse?: Record<string, unknown>;
  printNumber?: number;
};

export type RestaurantBranch = {
  id: string;
  tenantId?: string;
  name: string;
  restaurantSlug: string;
  address: string;
  phone: string;
  managerId?: string;
};

export type InventoryType =
  | "sellable-products"
  | "raw-ingredients"
  | "kitchen-supplies"
  | "housekeeping"
  | "packaging"
  | "equipment"
  | "vendor-purchases"
  | "central-kitchen-stock";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  branchId: string;
  inventoryType?: InventoryType;
  parentCategory?: string;
  subcategory?: string;
  categoryPath?: string[];
  sku?: string;
  barcode?: string;
  price?: number;
  costPerUnit?: number;
  currentStock: number;
  unit: string;
  purchaseUnit?: string;
  stockUnit?: string;
  unitConversionFactor?: number;
  reorderLevel: number;
  lowStockAlert?: number;
  expiryDate?: string;
  averageDailyUsage?: number;
  wastageQuantity?: number;
  lastPurchasedAt?: string;
  lastMovementAt?: string;
  equipmentSerial?: string;
  maintenanceDueAt?: string;
  centralKitchenBatchId?: string;
  gstApplicable?: boolean;
  gstRate?: number;
  hsnCode?: string;
  sellable?: boolean;
  supplier?: string;
  deductionHook?: "recipe";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchasePlaceholder = {
  id: string;
  supplier: string;
  itemName: string;
  quantity: number;
  expectedAt: string;
  status: "draft" | "ordered" | "received";
};

export type RecipeIngredient = {
  inventoryItemId: string;
  inventoryItemName?: string;
  quantity: number;
  unit: string;
  wastagePercent?: number;
  sizeLabel?: string;
};

export type Recipe = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  portionSize: number;
  outputUnit: string;
  sizeLabel?: string;
  ingredients: RecipeIngredient[];
  totalCost?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string;
  branchId: string;
  movementType: "receive" | "deduct" | "recipe-deduction" | "adjust" | "waste" | "transfer" | "expiry";
  quantity: number;
  unit: string;
  reason: string;
  orderId?: string;
  recipeId?: string;
  purchaseOrderId?: string;
  fromBranchId?: string;
  toBranchId?: string;
  createdAt: string;
  createdBy?: string;
};

export type PurchaseOrderItem = {
  inventoryItemId?: string;
  itemName: string;
  quantity: number;
  receivedQuantity?: number;
  unit: string;
  costPerUnit: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  expectedAt?: string;
  receivedAt?: string;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  paidAmount: number;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount?: number;
  total: number;
  invoiceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayment = {
  id: string;
  supplierId: string;
  purchaseOrderId?: string;
  amount: number;
  paidBy: PaymentOption;
  paidAt: string;
  note?: string;
};

export type KitchenStation = {
  id: string;
  name: string;
  branchId: string;
  categories: string[];
  active: boolean;
  loadScore?: number;
};

export type RestaurantTransaction = {
  id: string;
  timestamp: string;
  userId: string;
  branchId: string;
  orderId: string;
  paymentMethod: PaymentOption;
  subtotal: number;
  taxData: { gstRate: number; gstAmount: number };
  total: number;
  type: "sale" | "void" | "refund" | "expense";
};

export type OfflineQueueItem = {
  id: string;
  module: "kitchen" | "POS" | "billing" | "orders" | "inventory" | "customers" | "loyalty" | "reports" | "accounting";
  action: string;
  status: "queued" | "retrying" | "failed" | "conflict" | "synced";
  createdAt: string;
  lastError?: string;
};
