"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateRestaurantTax } from "@/lib/menu-engine";
import { shouldUseFirebase } from "@/lib/env";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { applyInventoryMovements, buildRecipeMovements, calculateRecipeCost } from "@/lib/inventory-engine";
import { enqueueOfflineOperation, isOnline, syncQueuedOperations, type OfflineWrite } from "@/lib/offline";
import { readableOrderId, readableTableOrderId } from "@/lib/order-display";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/tenant";
import { createOrderWithRetry, updateOrderStatus as updateFirestoreOrderStatus } from "@/services/order-service";
import { safeCreateCategory, safeDeleteMenuItem, safeUpdateCategory, safeUpsertMenuItem } from "@/services/advanced-menu-service";
import { deleteOwnerOffer, safeDeleteEmployeeUser, safeUpsertEmployeeUser, saveOwnerOffer, saveOwnerRestaurantProfile } from "@/services/production-data-service";
import type {
  BusinessListingApplication,
  CateringPackage,
  CateringQuote,
  ChartAccount,
  CmsSettings,
  ComboOffer,
  CustomerDetails,
  Cuisine,
  DeliveryAssignment,
  DeliveryStatus,
  DemoOrder,
  ExpenseEntry,
  AuditLogEntry,
  InventoryMovement,
  InventoryItem,
  KitchenStation,
  LoyaltyCustomer,
  MenuCategory,
  MenuItem,
  MenuSchedule,
  MockUser,
  OfflineQueueItem,
  Offer,
  OrderChannel,
  OrderLine,
  OrderStatus,
  OrderTotals,
  OwnerBusinessProfile,
  PaymentOption,
  PosBill,
  PosTable,
  PrinterSettings,
  PurchaseOrder,
  PurchasePlaceholder,
  Recipe,
  Restaurant,
  RestaurantBranch,
  RestaurantTransaction,
  SocialPost,
  SocialPostStatus,
  SocialTemplate,
  StaffMember,
  Supplier,
  SupplierPayment,
  TableOrder,
  TableOrderStatus,
  TaxSettings,
} from "@/lib/types";
import {
  canUseOperationalFirestore,
  normalizePhone,
  safeCreateKitchenOrder,
  safeUpdateKitchenOrder,
  safeRecordPosPayment,
  safeUpdateKitchenOrderStatus,
  safeUpsertCustomerFromBill,
} from "@/services/restaurant-ops-service";

function persistenceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Save failed. Please check your connection and access permissions.";
}
import { saveInventoryItem } from "@/services/production-data-service";
import type { MenuCategoryDoc, MenuDoc } from "@/types/firebase";

type ApiPhase = "idle" | "loading" | "success" | "error";

export type AppStore = {
  authUser: MockUser;
  restaurants: Restaurant[];
  businessApplications: BusinessListingApplication[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  cuisines: Cuisine[];
  comboOffers: ComboOffer[];
  menuSchedules: MenuSchedule[];
  taxSettings: TaxSettings;
  offers: Offer[];
  orders: DemoOrder[];
  deliveries: DeliveryAssignment[];
  templates: SocialTemplate[];
  cateringPackages: CateringPackage[];
  cateringInquiries: CateringQuote[];
  posTables: PosTable[];
  posBill: PosBill;
  ownerBusinessProfile?: OwnerBusinessProfile;
  socialPosts: SocialPost[];
  tableOrders: TableOrder[];
  printerSettings: PrinterSettings;
  staffMembers: StaffMember[];
  branches: RestaurantBranch[];
  inventoryItems: InventoryItem[];
  purchases: PurchasePlaceholder[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  recipes: Recipe[];
  inventoryMovements: InventoryMovement[];
  kitchenStations: KitchenStation[];
  auditLogs: AuditLogEntry[];
  chartAccounts: ChartAccount[];
  expenses: ExpenseEntry[];
  loyaltyCustomers: LoyaltyCustomer[];
  transactions: RestaurantTransaction[];
  cmsSettings: CmsSettings;
  offlineQueue: OfflineQueueItem[];
  latestQuote?: CateringQuote;
  apiPhase: ApiPhase;
  apiMessage: string;
  setAuthUser: (user: MockUser) => void;
  createOrder: (input: {
    restaurantSlug: string;
    customer: CustomerDetails;
    lines: OrderLine[];
    totals: OrderTotals;
    offerCode?: string;
    payment: PaymentOption;
    channel: OrderChannel;
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
  }) => Promise<DemoOrder>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    note?: string,
  ) => Promise<void>;
  createMenuItem: (item: Omit<MenuItem, "id">) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
  toggleSoldOut: (itemId: string) => Promise<void>;
  createMenuCategory: (category: Omit<MenuCategory, "id" | "sortOrder">) => Promise<void>;
  updateMenuCategory: (category: MenuCategory) => Promise<void>;
  deleteMenuCategory: (categoryId: string) => Promise<void>;
  createCuisine: (cuisine: Omit<Cuisine, "id">) => Promise<void>;
  updateCuisine: (cuisine: Cuisine) => Promise<void>;
  deleteCuisine: (cuisineId: string) => Promise<void>;
  updateTaxSettings: (settings: TaxSettings) => Promise<void>;
  createComboOffer: (combo: Omit<ComboOffer, "id">) => Promise<void>;
  updateComboOffer: (combo: ComboOffer) => Promise<void>;
  deleteComboOffer: (comboId: string) => Promise<void>;
  createOffer: (offer: Offer) => Promise<void>;
  updateOffer: (offer: Offer) => Promise<void>;
  deleteOffer: (code: string) => Promise<void>;
  updateRestaurantCapabilities: (restaurantSlug: string, settings: {
    acceptsScheduledOrders: boolean;
    acceptsCatering: boolean;
    acceptsBulkOrders: boolean;
    acceptsPreorder: boolean;
    maxPreorderDays: number;
    cateringNegotiationEnabled: boolean;
  }) => Promise<void>;
  updateCmsSettings: (settings: CmsSettings) => Promise<void>;
  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => Promise<void>;
  verifyDeliveryOtp: (deliveryId: string, otp: string) => Promise<boolean>;
  addPosItem: (item: MenuItem) => void;
  addPosProduct: (item: InventoryItem) => void;
  updatePosQuantity: (itemId: string, quantity: number) => void;
  removePosItem: (itemId: string) => void;
  setPosBill: (bill: PosBill) => void;
  setPosTable: (table: string) => void;
  setPosOrderType: (orderType: PosBill["orderType"]) => void;
  setPosCustomer: (customer: { id?: string; name?: string; phone?: string }) => void;
  linkPosKitchenOrder: (orderId: string) => void;
  setPosPayment: (payment: PaymentOption) => void;
  payPosBill: () => Promise<void>;
  resetPosBill: () => void;
  upsertLoyaltyCustomerFromBill: (bill: PosBill, total: number) => void;
  saveOwnerBusinessProfile: (profile: OwnerBusinessProfile) => Promise<void>;
  createSocialPost: (input: Omit<SocialPost, "id" | "status" | "submittedAt">) => Promise<SocialPost>;
  reviewSocialPost: (postId: string, status: Exclude<SocialPostStatus, "pending">, note?: string) => Promise<void>;
  createTableOrder: (input: Omit<TableOrder, "id" | "status" | "createdAt">) => Promise<TableOrder>;
  updateTableOrder: (orderId: string, patch: Partial<Omit<TableOrder, "id" | "createdAt">>) => Promise<void>;
  updateTableOrderStatus: (orderId: string, status: TableOrderStatus) => Promise<void>;
  updatePrinterSettings: (settings: PrinterSettings) => void;
  createStaffMember: (member: Omit<StaffMember, "id" | "lastActivity">) => Promise<void>;
  updateStaffMember: (member: StaffMember) => Promise<void>;
  deleteStaffMember: (id: string) => Promise<void>;
  upsertPosTable: (table: PosTable) => void;
  deletePosTable: (table: string) => void;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  adjustInventoryStock: (itemId: string, quantityDelta: number, reason: string) => Promise<void>;
  upsertRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  upsertSupplier: (supplier: Supplier) => Promise<void>;
  upsertPurchaseOrder: (order: PurchaseOrder) => Promise<void>;
  receivePurchaseOrder: (orderId: string) => Promise<void>;
  recordAuditLog: (entry: Omit<AuditLogEntry, "id" | "createdAt" | "userId" | "userName" | "role">) => void;
  queueOfflineAction: (item: Omit<OfflineQueueItem, "id" | "createdAt" | "status">) => void;
  submitBusinessApplication: (
    input: Omit<BusinessListingApplication, "id" | "status" | "submittedAt">,
  ) => Promise<BusinessListingApplication>;
  reviewBusinessApplication: (
    applicationId: string,
    status: "approved" | "rejected",
  ) => Promise<void>;
  updateRestaurantAdminState: (
    restaurantSlug: string,
    patch: Partial<Restaurant>,
  ) => Promise<void>;
  createCateringQuote: (input: {
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
    imageUrls?: string[];
    callbackRequested?: boolean;
    contactPreference?: "phone" | "whatsapp" | "email";
  }) => Promise<CateringQuote>;
  updateCateringInquiryStatus: (quoteId: string, status: NonNullable<CateringQuote["status"]>) => Promise<void>;
  convertCateringInquiryToOrder: (quoteId: string) => Promise<void>;
};

export type PersistedAppStoreState = Pick<
  AppStore,
  | "authUser"
  | "restaurants"
  | "businessApplications"
  | "menuItems"
  | "menuCategories"
  | "cuisines"
  | "comboOffers"
  | "menuSchedules"
  | "taxSettings"
  | "offers"
  | "orders"
  | "deliveries"
  | "templates"
  | "cateringPackages"
  | "cateringInquiries"
  | "posTables"
  | "posBill"
  | "ownerBusinessProfile"
  | "socialPosts"
  | "tableOrders"
  | "printerSettings"
  | "staffMembers"
  | "branches"
  | "inventoryItems"
  | "purchases"
  | "purchaseOrders"
  | "suppliers"
  | "supplierPayments"
  | "recipes"
  | "inventoryMovements"
  | "kitchenStations"
  | "auditLogs"
  | "chartAccounts"
  | "expenses"
  | "loyaltyCustomers"
  | "transactions"
  | "cmsSettings"
  | "offlineQueue"
  | "latestQuote"
>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createAuditLogEntry(
  state: Pick<AppStore, "authUser">,
  entry: Omit<AuditLogEntry, "id" | "createdAt" | "userId" | "userName" | "role">,
): AuditLogEntry {
  return {
    id: createLocalId("audit"),
    userId: state.authUser.id,
    userName: state.authUser.name,
    role: state.authUser.role,
    createdAt: new Date().toISOString(),
    ...entry,
  };
}

function slugifyIdentifier(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function createInvoiceNumber() {
  return `INV-POS-${Date.now()}`;
}

function effectiveTaxSettingsForBill(bill: PosBill, taxSettings: TaxSettings): TaxSettings {
  return bill.applyGst === false
    ? { ...taxSettings, gstEnabled: false, cgstRate: 0, sgstRate: 0, igstRate: 0, serviceChargeRate: 0 }
    : taxSettings;
}

function packingChargeForBill(bill: PosBill, taxSettings: TaxSettings) {
  return bill.orderType === "dine-in" || bill.waiveParcelCharge ? 0 : taxSettings.defaultPackingCharge;
}

function mapOrderChannel(channel: OrderChannel): "web" | "instagram" | "whatsapp" | "pos" | "catering" {
  const normalized = channel.toLowerCase();
  if (normalized === "instagram") return "instagram";
  if (normalized === "whatsapp") return "whatsapp";
  if (normalized === "pos") return "pos";
  if (normalized === "catering") return "catering";
  return "web";
}

function toMenuDoc(item: MenuItem): MenuDoc {
  const now = new Date();
  return {
    id: item.id,
    tenantId: resolveTenantId(item.restaurantSlug),
    restaurantId: item.restaurantSlug,
    ownerId: item.ownerId ?? "owner-local",
    branchId: DEFAULT_BRANCH_ID,
    categoryId: item.categoryId ?? item.category,
    category: item.category,
    subcategory: item.subcategory,
    cuisineIds: item.cuisineIds,
    name: item.name,
    translations: item.translations,
    description: item.description,
    longDescription: item.longDescription,
    price: item.price,
    dineInPrice: item.dineInPrice,
    parcelPrice: item.parcelPrice,
    deliveryPrice: item.deliveryPrice,
    taxRate: item.taxRate,
    packingCharge: item.packingCharge,
    imagePath: item.image,
    imagePaths: item.images,
    isVeg: item.isVeg,
    foodType: item.foodType,
    prepTime: item.prepTime,
    calories: item.calories,
    spiceLevel: item.spiceLevel,
    averageRating: item.averageRating,
    reviewCount: item.reviewCount,
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
    badges: item.badges,
    searchKeywords: item.searchKeywords,
    dietaryLabels: item.dietaryLabels,
    allergenLabels: item.allergenLabels,
    modifiers: item.modifiers,
    addOns: item.addOns,
    modifierGroups: item.modifierGroups,
    variantGroups: item.variantGroups,
    modifierGroupIds: item.modifierGroups?.map((group) => group.id),
    variantGroupIds: item.variantGroups?.map((group) => group.id),
    recipeLinks: item.recipeLinks,
    scheduleIds: item.scheduleIds,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function toMenuCategoryDoc(category: MenuCategory, ownerId?: string): MenuCategoryDoc {
  const now = new Date();
  return {
    id: category.id,
    tenantId: resolveTenantId(category.restaurantSlug),
    restaurantId: category.restaurantSlug,
    ownerId: ownerId ?? "owner-local",
    branchId: DEFAULT_BRANCH_ID,
    name: category.name,
    imagePath: category.image,
    bannerPath: category.banner,
    sortOrder: category.sortOrder,
    active: category.enabled,
    schedule: category.schedule,
    createdAt: now,
    updatedAt: now,
  };
}

function shouldQueueOfflineSync() {
  return shouldUseFirebase() || !isOnline();
}

async function queuePosPaymentSync(
  bill: PosBill,
  branch: RestaurantBranch,
  taxSettings: TaxSettings,
  total: number,
  restaurantId = DEFAULT_RESTAURANT_ID,
) {
  const tenantId = resolveTenantId(restaurantId);
  const invoiceNumber = bill.invoiceNumber ?? createInvoiceNumber();
  const effectiveTaxSettings = effectiveTaxSettingsForBill(bill, taxSettings);
  const subtotal = bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = calculateRestaurantTax({
    amount: Math.max(0, subtotal - (bill.discount ?? 0)),
    settings: effectiveTaxSettings,
    packingCharge: packingChargeForBill(bill, taxSettings),
  });
  const createdAt = new Date().toISOString();
  const writes: OfflineWrite[] = [
    {
      collectionName: "receipts",
      docId: `receipt-${invoiceNumber}`,
      operation: "set" as const,
      merge: true,
      tenantId,
      branchId: branch.id,
      data: {
        id: `receipt-${invoiceNumber}`,
        tenantId,
        restaurantId,
        branchId: branch.id,
        invoiceNumber,
        orderId: bill.linkedKitchenOrderId ?? invoiceNumber,
        cashier: bill.cashierName ?? "Cashier",
        paymentMethod: bill.payment,
        subtotal,
        taxBreakup: {
          cgst: tax.cgst,
          sgst: tax.sgst,
          igst: tax.igst,
          serviceCharge: tax.serviceCharge,
          packingCharge: tax.packingCharge,
        },
        total: tax.total,
        createdAt,
      },
    },
    {
      collectionName: "paymentTransactions",
      docId: `pay-${invoiceNumber}`,
      operation: "set" as const,
      merge: true,
      tenantId,
      branchId: branch.id,
      data: {
        id: `pay-${invoiceNumber}`,
        tenantId,
        restaurantId,
        branchId: branch.id,
        receiptId: `receipt-${invoiceNumber}`,
        invoiceNumber,
        method: bill.payment === "card" ? "card" : bill.payment === "upi" ? "upi" : "cash",
        amount: total,
        cashierId: bill.cashierName ?? "cashier",
        status: "paid",
        createdAt,
      },
    },
  ];

  if (bill.linkedKitchenOrderId) {
    writes.push({
      collectionName: "kitchenOrders",
      docId: bill.linkedKitchenOrderId,
      operation: "set",
      merge: true,
      tenantId,
      branchId: branch.id,
      data: {
        id: bill.linkedKitchenOrderId,
        tenantId,
        restaurantId,
        branchId: branch.id,
        paymentStatus: "paid",
        receiptId: `receipt-${invoiceNumber}`,
        status: "completed",
      },
    });
  }

  const normalizedPhone = normalizePhone(bill.customerPhone ?? "");
  if (bill.customerName && normalizedPhone) {
    writes.push({
      collectionName: "customers",
      docId: `cust-${restaurantId}-${normalizedPhone}`,
      operation: "set",
      merge: true,
      tenantId,
      branchId: branch.id,
      data: {
        id: `cust-${restaurantId}-${normalizedPhone}`,
        tenantId,
        restaurantId,
        branchId: branch.id,
        name: bill.customerName,
        phone: bill.customerPhone ?? normalizedPhone,
        normalizedPhone,
        lastOrderAt: createdAt,
        previousOrderIds: [invoiceNumber],
      },
    });
    writes.push({
      collectionName: "loyaltyAccounts",
      docId: `loyalty-${restaurantId}-${normalizedPhone}`,
      operation: "set",
      merge: true,
      tenantId,
      branchId: branch.id,
      data: {
        id: `loyalty-${restaurantId}-${normalizedPhone}`,
        tenantId,
        restaurantId,
        branchId: branch.id,
        customerId: `cust-${restaurantId}-${normalizedPhone}`,
        phone: bill.customerPhone ?? normalizedPhone,
        points: Math.floor(total / 100),
        lastOrderAt: createdAt,
      },
    });
  }

  return enqueueOfflineOperation({
    module: "billing",
    action: `Save payment for bill ${invoiceNumber}`,
    writes,
  });
}

async function queueKitchenOrderSync(
  order: TableOrder,
  input: {
    id: string;
    restaurantId: string;
    branchId: string;
    orderType: PosBill["orderType"];
    source: TableOrder["source"];
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    scheduledFor?: string;
    waiterId?: string;
    waiterName?: string;
    lines: OrderLine[];
    priority?: "normal" | "rush";
    etaMinutes?: number;
  },
) {
  const tenantId = resolveTenantId(input.restaurantId);
  const subtotal = input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return enqueueOfflineOperation({
    module: "kitchen",
    action: `Send kitchen ticket for ${order.tableNumber}`,
    writes: [
      {
        collectionName: "kitchenOrders",
        docId: order.id,
        operation: "set",
        merge: true,
        tenantId,
        branchId: input.branchId,
        data: {
          id: order.id,
          tenantId,
          restaurantId: input.restaurantId,
          branchId: input.branchId,
          orderType: input.orderType,
          source: input.source,
          tableNumber: input.tableNumber,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          scheduledFor: input.scheduledFor,
          waiterId: input.waiterId,
          waiterName: input.waiterName,
          status: "new",
          priority: input.priority ?? "normal",
          lines: input.lines.map((line) => ({
            menuItemId: line.itemId,
            name: line.name,
            price: line.price,
            quantity: line.quantity,
            notes: line.notes,
          })),
          subtotal,
          total: order.total ?? subtotal,
          paymentStatus: "pending",
          etaMinutes: input.etaMinutes ?? 12,
          createdAt: order.createdAt,
        },
      },
    ],
  });
}

async function queueKitchenStatusSync(
  orderId: string,
  status: TableOrderStatus,
  restaurantId = DEFAULT_RESTAURANT_ID,
  branchId = DEFAULT_BRANCH_ID,
) {
  const tenantId = resolveTenantId(restaurantId);
  return enqueueOfflineOperation({
    module: "kitchen",
    action: `Update kitchen ticket to ${status}`,
    writes: [
      {
        collectionName: "kitchenOrders",
        docId: orderId,
        operation: "set",
        merge: true,
        tenantId,
        branchId,
        data: {
          id: orderId,
          tenantId,
          restaurantId,
          branchId,
          status,
        },
      },
    ],
  });
}

async function queueInventorySync(item: InventoryItem) {
  const tenantId = DEFAULT_TENANT_ID;
  const createdAt = new Date().toISOString();
  return enqueueOfflineOperation({
    module: "inventory",
    action: `Update stock ${item.name}`,
    writes: [
      {
        collectionName: "inventory",
        docId: item.id,
        operation: "set",
        merge: true,
        tenantId,
        branchId: item.branchId,
        data: {
          id: item.id,
          tenantId,
          restaurantId: DEFAULT_RESTAURANT_ID,
          branchId: item.branchId,
          itemName: item.name,
          name: item.name,
          category: item.category,
          sku: item.sku,
          price: item.price ?? 0,
          quantity: item.currentStock,
          currentStock: item.currentStock,
          unit: item.unit,
          reorderLevel: item.reorderLevel,
          lowStockAlert: item.lowStockAlert ?? item.reorderLevel,
          gstApplicable: item.gstApplicable ?? false,
          gstRate: item.gstRate,
          hsnCode: item.hsnCode,
          sellable: item.sellable ?? true,
          supplierId: item.supplier,
          supplier: item.supplier,
          createdAt,
        },
      },
      {
        collectionName: "inventoryTransactions",
        docId: createLocalId(`stock-${item.id}`),
        operation: "set",
        merge: true,
        tenantId,
        branchId: item.branchId,
        data: {
          tenantId,
          restaurantId: DEFAULT_RESTAURANT_ID,
          branchId: item.branchId,
          inventoryId: item.id,
          type: "manual-adjustment",
          quantity: item.currentStock,
          unit: item.unit,
          createdAt,
        },
      },
    ],
  });
}

const initialPosBill: PosBill = {
  table: "DIRECT",
  orderType: "dine-in",
  lines: [],
  payment: "cash",
  paid: false,
  guestCount: 1,
  discount: 0,
  tenderedAmount: 0,
};

const initialTableOrders: TableOrder[] = [];

const initialPrinterSettings: PrinterSettings = {
  kitchenPrinterName: "",
  billingPrinterName: "",
  autoPrintOrders: false,
  compactTickets: true,
  connectionStatus: "offline",
  escPosReady: false,
  profiles: [],
  templates: [],
  printLogs: [],
};

const initialTaxSettings: TaxSettings = {
  id: `tax-${DEFAULT_RESTAURANT_ID}-${DEFAULT_BRANCH_ID}`,
  restaurantSlug: DEFAULT_RESTAURANT_ID,
  branchId: DEFAULT_BRANCH_ID,
  gstEnabled: false,
  pricingMode: "inclusive",
  defaultGstRate: 5,
  cgstRate: 2.5,
  sgstRate: 2.5,
  igstRate: 0,
  serviceChargeRate: 0,
  defaultPackingCharge: 0,
  sac: "996331",
};

const initialLoyaltyCustomers: LoyaltyCustomer[] = [];

const initialOfflineQueue: OfflineQueueItem[] = [];

const initialKitchenStations: KitchenStation[] = [
  { id: "station-grill", name: "Grill station", branchId: DEFAULT_BRANCH_ID, categories: ["Grill", "Kebabs", "Tandoor"], active: true, loadScore: 0 },
  { id: "station-beverage", name: "Beverage station", branchId: DEFAULT_BRANCH_ID, categories: ["Juices", "Drinks", "Tea & Coffee"], active: true, loadScore: 0 },
  { id: "station-shawarma", name: "Shawarma station", branchId: DEFAULT_BRANCH_ID, categories: ["Shawarma", "Arabic"], active: true, loadScore: 0 },
  { id: "station-dessert", name: "Dessert station", branchId: DEFAULT_BRANCH_ID, categories: ["Desserts", "Ice Cream", "Cakes"], active: true, loadScore: 0 },
];

const cafeAlArabCoverImages = [
  "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
];

const cafeAlArabHours = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
  day: day as OwnerBusinessProfile["operatingHoursSchedule"] extends Array<infer Item> ? Item extends { day: infer Day } ? Day : never : never,
  open: true,
  slots: [{ start: "10:30", end: "23:30" }],
})) as NonNullable<OwnerBusinessProfile["operatingHoursSchedule"]>;

const cafeAlArabOwnerProfile: OwnerBusinessProfile = {
  ownerName: "Test Owner",
  hotelName: "Cafe Al Arab UL",
  logo: "/icons/sarva-icon.svg",
  coverImage: cafeAlArabCoverImages[0],
  coverImages: cafeAlArabCoverImages,
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
  operatingHoursSchedule: cafeAlArabHours,
  operatingHoursPreference: "specified",
  deliveryRadiusKm: 6,
  deliveryCharge: 45,
  minimumOrder: 149,
  freeDeliveryThreshold: 499,
  fssaiLicense: "11223344556677",
  diningAvailable: true,
  cloudKitchen: false,
  paymentConfig: {
    upiId: "cafealarab@sarva",
    codEnabled: true,
    methods: ["upi", "cod", "cash", "card"],
    razorpayEnabled: false,
    phonePeEnabled: false,
    paytmEnabled: false,
  },
  reviewStatus: "approved",
  completed: true,
};

function createOperationalFallbackBranch(profile: OwnerBusinessProfile | undefined, user: MockUser): RestaurantBranch {
  const restaurantSlug = user.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  return {
    id: DEFAULT_BRANCH_ID,
    tenantId: resolveTenantId(restaurantSlug),
    name: profile?.hotelName || "Main Branch",
    restaurantSlug,
    address: profile?.businessAddress || "Owner operational branch",
    phone: profile?.phoneNumber || "",
    managerId: user.id,
  };
}

function isOwnerProfilePublicComplete(profile: OwnerBusinessProfile) {
  const hasLocation = Boolean((typeof profile.latitude === "number" && typeof profile.longitude === "number") || profile.googleMapLocation);
  const hasHours = profile.operatingHoursPreference === "specified" && Boolean(profile.operatingHoursSchedule?.some((day) => day.open && day.slots.length));
  const hasCuisine = Boolean(profile.cuisineTypes?.length || profile.cuisineType?.trim());
  const hasMedia = Boolean(profile.logo || profile.coverImage || profile.coverImages?.length);
  return Boolean(
    profile.hotelName?.trim() &&
    profile.phoneNumber?.trim() &&
    profile.businessAddress?.trim() &&
    hasLocation &&
    hasHours &&
    hasCuisine &&
    hasMedia &&
    profile.deliveryRadiusKm > 0,
  );
}

function createCafeAlArabRestaurant(ownerId: string): Restaurant {
  return {
    id: DEFAULT_RESTAURANT_ID,
    tenantId: DEFAULT_TENANT_ID,
    ownerId,
    ownerIds: [ownerId],
    branchId: DEFAULT_BRANCH_ID,
    name: cafeAlArabOwnerProfile.hotelName,
    displayName: cafeAlArabOwnerProfile.hotelName,
    slug: DEFAULT_RESTAURANT_ID,
    cuisine: "Arabic, Shawarma, Grills",
    location: "Avalahalli, Thanisandra Main Road",
    rating: 4.1,
    deliveryTime: "30-40 min",
    etaMinutes: 30,
    priceForTwo: 650,
    image: cafeAlArabCoverImages[0],
    logo: cafeAlArabOwnerProfile.logo,
    coverImage: cafeAlArabCoverImages[0],
    coverImages: cafeAlArabCoverImages,
    isOpen: true,
    tags: ["Shawarma", "Al faham", "Mandi", "Offers available"],
    instagramHandle: "cafealarabul",
    latitude: cafeAlArabOwnerProfile.latitude,
    longitude: cafeAlArabOwnerProfile.longitude,
    deliveryRadiusKm: cafeAlArabOwnerProfile.deliveryRadiusKm,
    approved: true,
    profileComplete: true,
    publicListingEnabled: true,
    subscriptionPlan: "Professional",
    subscriptionStatus: "active",
    orderingEnabled: true,
    reviewCount: 89,
    deliveryFee: cafeAlArabOwnerProfile.deliveryCharge,
    minPrice: cafeAlArabOwnerProfile.minimumOrder,
    foodTypes: ["nonveg", "veg"],
    popularItems: ["Chicken Shawarma Roll", "Al Faham Chicken Half", "Chicken Mandi"],
    categoryTags: ["Shawarma", "Grills", "Mandi", "Arabic"],
    offerCodes: ["ARABIC20"],
    searchKeywords: ["Cafe Al Arab UL", "Arabic", "Shawarma", "Grills", "Mandi", "Thanisandra", "Avalahalli"],
    address: cafeAlArabOwnerProfile.businessAddress,
    googleMapLocation: cafeAlArabOwnerProfile.googleMapLocation,
    operatingHours: cafeAlArabOwnerProfile.operatingHours,
    operatingHoursSchedule: cafeAlArabOwnerProfile.operatingHoursSchedule,
    operatingHoursPreference: "specified",
    gstDetails: cafeAlArabOwnerProfile.gstDetails,
    fssaiLicense: cafeAlArabOwnerProfile.fssaiLicense,
    diningAvailable: cafeAlArabOwnerProfile.diningAvailable,
    cloudKitchen: cafeAlArabOwnerProfile.cloudKitchen,
    contact: {
      phone: cafeAlArabOwnerProfile.phoneNumber,
      whatsapp: cafeAlArabOwnerProfile.whatsappNumber || cafeAlArabOwnerProfile.phoneNumber,
      supportEmail: cafeAlArabOwnerProfile.supportEmail || "",
      callbackEnabled: true,
    },
    ownerProfile: {
      businessPhone: cafeAlArabOwnerProfile.phoneNumber,
      businessWhatsapp: cafeAlArabOwnerProfile.whatsappNumber || cafeAlArabOwnerProfile.phoneNumber,
      businessEmail: cafeAlArabOwnerProfile.supportEmail || "",
      cateringPhone: cafeAlArabOwnerProfile.cateringPhoneNumber || cafeAlArabOwnerProfile.phoneNumber,
      cateringWhatsapp: cafeAlArabOwnerProfile.cateringWhatsappNumber || cafeAlArabOwnerProfile.whatsappNumber || cafeAlArabOwnerProfile.phoneNumber,
      cateringEmail: cafeAlArabOwnerProfile.cateringEmail || cafeAlArabOwnerProfile.supportEmail || "",
      emergencyPhone: cafeAlArabOwnerProfile.emergencySupportNumber || cafeAlArabOwnerProfile.phoneNumber,
    },
    deliverySettings: {
      radiusKm: cafeAlArabOwnerProfile.deliveryRadiusKm,
      baseFee: cafeAlArabOwnerProfile.deliveryCharge ?? 0,
      freeDeliveryAbove: cafeAlArabOwnerProfile.freeDeliveryThreshold,
      maxOrdersPerSlot: 8,
      deliverySlotMinutes: 30,
    },
  };
}

function isCafeAlArabOwner(user: MockUser) {
  return user.role === "owner" && (user.id === "divakdi@gmail.com" || user.restaurantSlug === DEFAULT_RESTAURANT_ID || !user.restaurantSlug);
}

const initialAuthUser: MockUser = {
  id: "anonymous",
  name: "Anonymous",
  role: "customer",
};

function createPersistedDefaults(): PersistedAppStoreState {
  return {
    authUser: initialAuthUser,
    restaurants: [],
    businessApplications: [],
    menuItems: [],
    menuCategories: [],
    cuisines: [],
    comboOffers: [],
    menuSchedules: [],
    taxSettings: initialTaxSettings,
    offers: [],
    orders: [],
    deliveries: [],
    templates: [],
    cateringPackages: [],
    cateringInquiries: [],
    posTables: [],
    posBill: initialPosBill,
    ownerBusinessProfile: undefined,
    socialPosts: [],
    tableOrders: clone(initialTableOrders),
    printerSettings: initialPrinterSettings,
    staffMembers: [],
    branches: [],
    inventoryItems: [],
    purchases: [],
    purchaseOrders: [],
    suppliers: [],
    supplierPayments: [],
    recipes: [],
    inventoryMovements: [],
    kitchenStations: clone(initialKitchenStations),
    auditLogs: [],
    chartAccounts: [],
    expenses: [],
    loyaltyCustomers: clone(initialLoyaltyCustomers),
    transactions: [],
    cmsSettings: clone(defaultCmsSettings),
    offlineQueue: clone(initialOfflineQueue),
    latestQuote: undefined,
  };
}

function removeLegacySeedData(state: PersistedAppStoreState): PersistedAppStoreState {
  const seededRestaurantIds = new Set(
    (state.restaurants ?? [])
      .filter((restaurant) => restaurant.ownerId === "test-owner" || restaurant.ownerIds?.includes("test-owner"))
      .map((restaurant) => restaurant.slug || restaurant.id)
      .filter((id): id is string => Boolean(id)),
  );
  const hasSeededOwnerProfile = state.ownerBusinessProfile?.mapboxPlaceId === "sarva-test-owner-cafe-al-arab";
  const isSeededRestaurantId = (restaurantSlug?: string) => Boolean(restaurantSlug && seededRestaurantIds.has(restaurantSlug));

  if (!seededRestaurantIds.size && !hasSeededOwnerProfile) return state;

  return {
    ...state,
    restaurants: (state.restaurants ?? []).filter((restaurant) => !seededRestaurantIds.has(restaurant.slug || restaurant.id)),
    menuItems: (state.menuItems ?? []).filter((item) => !isSeededRestaurantId(item.restaurantSlug)),
    menuCategories: (state.menuCategories ?? []).filter((item) => !isSeededRestaurantId(item.restaurantSlug)),
    cuisines: (state.cuisines ?? []).filter((item) => !isSeededRestaurantId(item.restaurantSlug)),
    offers: (state.offers ?? []).filter((item) => !isSeededRestaurantId(item.restaurantSlug)),
    posTables: hasSeededOwnerProfile ? [] : state.posTables,
    ownerBusinessProfile: hasSeededOwnerProfile ? undefined : state.ownerBusinessProfile,
    staffMembers: (state.staffMembers ?? []).filter((item) => item.id !== "test-owner"),
    branches: (state.branches ?? []).filter((item) => !seededRestaurantIds.has(item.restaurantSlug)),
    inventoryItems: hasSeededOwnerProfile ? [] : state.inventoryItems,
    recipes: hasSeededOwnerProfile ? [] : state.recipes,
    inventoryMovements: hasSeededOwnerProfile ? [] : state.inventoryMovements,
  };
}

function withErpDefaults(state: PersistedAppStoreState): PersistedAppStoreState {
  return {
    ...state,
    purchaseOrders: state.purchaseOrders ?? [],
    supplierPayments: state.supplierPayments ?? [],
    recipes: state.recipes ?? [],
    inventoryMovements: state.inventoryMovements ?? [],
    kitchenStations: state.kitchenStations?.length ? state.kitchenStations : clone(initialKitchenStations),
    auditLogs: state.auditLogs ?? [],
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      authUser: initialAuthUser,
      restaurants: [],
      businessApplications: [],
      menuItems: [],
      menuCategories: [],
      cuisines: [],
      comboOffers: [],
      menuSchedules: [],
      taxSettings: initialTaxSettings,
      offers: [],
      orders: [],
      deliveries: [],
      templates: [],
      cateringPackages: [],
      cateringInquiries: [],
      posTables: [],
      posBill: initialPosBill,
      ownerBusinessProfile: undefined,
      socialPosts: [],
      tableOrders: clone(initialTableOrders),
      printerSettings: initialPrinterSettings,
      staffMembers: [],
      branches: [],
      inventoryItems: [],
      purchases: [],
      purchaseOrders: [],
      suppliers: [],
      supplierPayments: [],
      recipes: [],
      inventoryMovements: [],
      kitchenStations: clone(initialKitchenStations),
      auditLogs: [],
      chartAccounts: [],
      expenses: [],
      loyaltyCustomers: clone(initialLoyaltyCustomers),
      transactions: [],
      cmsSettings: clone(defaultCmsSettings),
      offlineQueue: clone(initialOfflineQueue),
      apiPhase: "idle",
      apiMessage: "",

      setAuthUser: (user) => {
        set((state) => {
          const linkedUser = isCafeAlArabOwner(user)
            ? { ...user, restaurantSlug: DEFAULT_RESTAURANT_ID }
            : user;
          if (!isCafeAlArabOwner(linkedUser)) {
            return {
              authUser: linkedUser,
              apiPhase: "success",
              apiMessage: `Signed in as ${linkedUser.name}.`,
            };
          }

          const restaurant = createCafeAlArabRestaurant(linkedUser.id);
          const branch = createOperationalFallbackBranch(cafeAlArabOwnerProfile, linkedUser);
          const keepProfile = state.ownerBusinessProfile?.completed ? state.ownerBusinessProfile : cafeAlArabOwnerProfile;
          return {
            authUser: linkedUser,
            ownerBusinessProfile: keepProfile,
            restaurants: [restaurant, ...state.restaurants.filter((item) => (item.slug || item.id) !== DEFAULT_RESTAURANT_ID)],
            branches: [branch, ...state.branches.filter((item) => item.id !== branch.id)],
            apiPhase: "success",
            apiMessage: `Signed in as ${linkedUser.name}.`,
          };
        });
      },

      createOrder: async (input) => {
        set({ apiPhase: "loading", apiMessage: "Creating order..." });
        const now = new Date().toISOString();
        const localOrder: DemoOrder = {
          ...input,
          id: createLocalId("ORD"),
          status: "new",
          createdAt: now,
          deliveryOtp: createLocalId("otp").slice(-4),
        };
        let order = localOrder;
        if (canUseOperationalFirestore() && isOnline()) {
          const saved = await createOrderWithRetry({
            restaurantId: input.restaurantSlug,
            customerId: normalizePhone(input.customer.phone) || createLocalId("customer"),
            customerName: input.customer.name,
            customerPhone: input.customer.phone,
            deliveryAddress: input.customer.address,
            channel: mapOrderChannel(input.channel),
            fulfillmentType: input.fulfillmentType ?? "delivery",
            scheduleMode: input.scheduleMode ?? "now",
            scheduledFor: input.scheduledFor,
            scheduledDateLabel: input.scheduledFor ? new Date(input.scheduledFor).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined,
            scheduledSlotId: input.scheduledFor ? `${input.restaurantSlug}-${new Date(input.scheduledFor).toISOString()}` : undefined,
            prepEstimateMinutes: input.prepEstimateMinutes,
            cutoffAt: input.cutoffAt,
            guestCount: input.guestCount,
            lines: input.lines.map((line) => ({
              menuItemId: line.itemId,
              name: line.name,
              price: line.price,
              quantity: line.quantity,
              notes: line.notes,
            })),
            offerCode: input.offerCode,
            subtotal: input.totals.subtotal,
            discount: input.totals.discount,
            tax: input.totals.tax,
            deliveryFee: input.totals.deliveryFee,
            total: input.totals.total,
          }).catch(() => null);
          if (saved) {
            order = {
              ...localOrder,
              id: saved.id,
              status: saved.status,
              createdAt: now,
              deliveryOtp: saved.deliveryOtp,
            };
          }
        }
        set((state) => ({
          orders: [order, ...state.orders],
          apiPhase: "success",
          apiMessage: shouldQueueOfflineSync()
            ? `Order ${order.id} saved locally and queued for sync.`
            : `Order ${order.id} created.`,
        }));
        if (shouldQueueOfflineSync()) {
          void enqueueOfflineOperation({
            module: "orders",
            action: `Create customer order ${order.id}`,
            writes: [
              {
                collectionName: "orders",
                docId: order.id,
                operation: "set",
                merge: true,
                tenantId: resolveTenantId(input.restaurantSlug),
                branchId: DEFAULT_BRANCH_ID,
                data: {
                  id: order.id,
                  tenantId: resolveTenantId(input.restaurantSlug),
                  restaurantId: input.restaurantSlug,
                  branchId: DEFAULT_BRANCH_ID,
                  customerName: input.customer.name,
                  customerPhone: input.customer.phone,
                  deliveryAddress: input.customer.address,
                  fulfillmentType: input.fulfillmentType ?? "delivery",
                  orderType: input.fulfillmentType ?? "delivery",
                  scheduleMode: input.scheduleMode ?? "now",
                  scheduledFor: input.scheduledFor,
                  scheduledStatus: input.scheduleMode === "scheduled" ? "requested" : undefined,
                  prepEstimateMinutes: input.prepEstimateMinutes,
                  cutoffAt: input.cutoffAt,
                  guestCount: input.guestCount,
                  channel: input.channel.toLowerCase(),
                  lines: input.lines.map((line) => ({
                    menuItemId: line.itemId,
                    name: line.name,
                    price: line.price,
                    quantity: line.quantity,
                    notes: line.notes,
                  })),
                  offerCode: input.offerCode,
                  subtotal: input.totals.subtotal,
                  discount: input.totals.discount,
                  tax: input.totals.tax,
                  deliveryFee: input.totals.deliveryFee,
                  total: input.totals.total,
                  paymentStatus: "pending",
                  status: order.status,
                  deliveryOtp: order.deliveryOtp,
                  createdAt: order.createdAt,
                },
              },
              {
                collectionName: "customerOrders",
                docId: order.id,
                operation: "set",
                merge: true,
                tenantId: resolveTenantId(input.restaurantSlug),
                branchId: DEFAULT_BRANCH_ID,
                data: {
                  id: order.id,
                  tenantId: resolveTenantId(input.restaurantSlug),
                  restaurantId: input.restaurantSlug,
                  branchId: DEFAULT_BRANCH_ID,
                  customerName: input.customer.name,
                  customerPhone: input.customer.phone,
                  total: input.totals.total,
                  status: order.status,
                  createdAt: order.createdAt,
                },
              },
            ],
          }).then(() => syncQueuedOperations()).catch(() => undefined);
        }
        return order;
      },

      updateOrderStatus: async (orderId, status, note) => {
        const order = get().orders.find((item) => item.id === orderId);
        if (!order) return;

        set({ apiPhase: "loading", apiMessage: `Updating ${orderId}...` });
        if (canUseOperationalFirestore() && isOnline()) {
          void updateFirestoreOrderStatus(orderId, status).catch(() => undefined);
        }
        const updated = {
          ...order,
          status,
          statusNote: note,
        };
        set((state) => ({
          orders: state.orders.map((item) => (item.id === orderId ? updated : item)),
          apiPhase: "success",
          apiMessage: `${orderId} is now ${status}.`,
        }));
      },

      createMenuItem: async (item) => {
        set({ apiPhase: "loading", apiMessage: "Saving menu item..." });
        const created: MenuItem = { ...item, id: createLocalId("menu") };
        void safeUpsertMenuItem(toMenuDoc(created)).catch(() => undefined);
        set((state) => ({
          menuItems: [created, ...state.menuItems],
          apiPhase: "success",
          apiMessage: `${created.name} added to the menu.`,
        }));
      },

      updateMenuItem: async (item) => {
        set({ apiPhase: "loading", apiMessage: "Updating menu item..." });
        const updated = item;
        void safeUpsertMenuItem(toMenuDoc(updated)).catch(() => undefined);
        set((state) => ({
          menuItems: state.menuItems.map((entry) =>
            entry.id === updated.id ? updated : entry,
          ),
          apiPhase: "success",
          apiMessage: `${updated.name} updated.`,
        }));
      },

      deleteMenuItem: async (itemId) => {
        void safeDeleteMenuItem(itemId).catch(() => undefined);
        set((state) => ({
          menuItems: state.menuItems.filter((entry) => entry.id !== itemId),
          apiPhase: "success",
          apiMessage: "Menu item deleted.",
        }));
      },

      toggleSoldOut: async (itemId) => {
        const item = get().menuItems.find((entry) => entry.id === itemId);
        if (!item) return;

        await get().updateMenuItem({ ...item, soldOut: !item.soldOut });
      },

      createMenuCategory: async (category) => {
        const exists = get().menuCategories.some((item) => item.restaurantSlug === category.restaurantSlug && item.name.trim().toLowerCase() === category.name.trim().toLowerCase());
        if (exists) {
          set({ apiPhase: "error", apiMessage: "Category name already exists." });
          return;
        }
        const created = { ...category, id: createLocalId("cat"), sortOrder: get().menuCategories.length + 1 };
        void safeCreateCategory(toMenuCategoryDoc(created, get().authUser.id)).catch(() => undefined);
        set((state) => ({
          menuCategories: [created, ...state.menuCategories],
          apiPhase: "success",
          apiMessage: `${category.name} category added.`,
        }));
      },

      updateMenuCategory: async (category) => {
        const duplicate = get().menuCategories.some((item) => item.restaurantSlug === category.restaurantSlug && item.id !== category.id && item.name.trim().toLowerCase() === category.name.trim().toLowerCase());
        if (duplicate) {
          set({ apiPhase: "error", apiMessage: "Duplicate category names are not allowed." });
          return;
        }
        void safeUpdateCategory(category.id, toMenuCategoryDoc(category, get().authUser.id)).catch(() => undefined);
        set((state) => ({
          menuCategories: state.menuCategories.map((item) => (item.id === category.id ? category : item)),
          apiPhase: "success",
          apiMessage: `${category.name} updated.`,
        }));
      },

      deleteMenuCategory: async (categoryId) => {
        set((state) => ({
          menuCategories: state.menuCategories.filter((item) => item.id !== categoryId),
          apiPhase: "success",
          apiMessage: "Category deleted.",
        }));
      },

      createCuisine: async (cuisine) => {
        const exists = get().cuisines.some((item) => item.restaurantSlug === cuisine.restaurantSlug && item.name.trim().toLowerCase() === cuisine.name.trim().toLowerCase());
        if (exists) {
          set({ apiPhase: "error", apiMessage: "Cuisine name already exists." });
          return;
        }
        set((state) => ({
          cuisines: [{ ...cuisine, id: createLocalId("cuisine") }, ...state.cuisines],
          apiPhase: "success",
          apiMessage: `${cuisine.name} cuisine added.`,
        }));
      },

      updateCuisine: async (cuisine) => {
        const duplicate = get().cuisines.some((item) => item.restaurantSlug === cuisine.restaurantSlug && item.id !== cuisine.id && item.name.trim().toLowerCase() === cuisine.name.trim().toLowerCase());
        if (duplicate) {
          set({ apiPhase: "error", apiMessage: "Duplicate cuisine names are not allowed." });
          return;
        }
        set((state) => ({
          cuisines: state.cuisines.map((item) => (item.id === cuisine.id ? cuisine : item)),
          apiPhase: "success",
          apiMessage: `${cuisine.name} cuisine updated.`,
        }));
      },

      deleteCuisine: async (cuisineId) => {
        set((state) => ({
          cuisines: state.cuisines.filter((item) => item.id !== cuisineId),
          menuItems: state.menuItems.map((item) => ({
            ...item,
            cuisineIds: item.cuisineIds?.filter((id) => id !== cuisineId),
          })),
          apiPhase: "success",
          apiMessage: "Cuisine deleted.",
        }));
      },

      updateTaxSettings: async (settings) => {
        set({ taxSettings: settings, apiPhase: "success", apiMessage: "Tax configuration saved." });
      },

      createComboOffer: async (combo) => {
        set((state) => ({
          comboOffers: [{ ...combo, id: createLocalId("combo") }, ...state.comboOffers],
          apiPhase: "success",
          apiMessage: `${combo.name} combo added.`,
        }));
      },

      updateComboOffer: async (combo) => {
        set((state) => ({
          comboOffers: state.comboOffers.map((item) => (item.id === combo.id ? combo : item)),
          apiPhase: "success",
          apiMessage: `${combo.name} combo updated.`,
        }));
      },

      deleteComboOffer: async (comboId) => {
        set((state) => ({
          comboOffers: state.comboOffers.filter((item) => item.id !== comboId),
          apiPhase: "success",
          apiMessage: "Combo deleted.",
        }));
      },

      createOffer: async (offer) => {
        const code = offer.code.trim().toUpperCase();
        const normalizedOffer: Offer = {
          ...offer,
          code,
          appliesTo: offer.appliesTo?.length ? offer.appliesTo : ["delivery"],
          status: offer.status ?? "active",
          showOnHomepage: offer.showOnHomepage ?? true,
          showOnRestaurantPage: offer.showOnRestaurantPage ?? true,
          priority: offer.priority ?? 0,
          discountType: offer.discountType ?? (offer.offerType === "flat" ? "flat" : "percentage"),
        };
        try {
          await saveOwnerOffer(normalizedOffer, normalizedOffer.restaurantSlug ?? get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID);
        } catch (error) {
          set({ apiPhase: "error", apiMessage: persistenceErrorMessage(error) });
          throw error;
        }
        set((state) => ({
          offers: [
            normalizedOffer,
            ...state.offers.filter((item) => item.code !== code),
          ],
          apiPhase: "success",
          apiMessage: `${code} saved.`,
        }));
      },

      updateOffer: async (offer) => {
        const code = offer.code.trim().toUpperCase();
        const normalizedOffer: Offer = { ...offer, code };
        try {
          await saveOwnerOffer(normalizedOffer, normalizedOffer.restaurantSlug ?? get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID);
        } catch (error) {
          set({ apiPhase: "error", apiMessage: persistenceErrorMessage(error) });
          throw error;
        }
        set((state) => ({
          offers: [
            normalizedOffer,
            ...state.offers.filter((item) => item.code !== code),
          ],
          apiPhase: "success",
          apiMessage: `${code} updated.`,
        }));
      },

      deleteOffer: async (code) => {
        const normalizedCode = code.trim().toUpperCase();
        try {
          await deleteOwnerOffer(normalizedCode);
        } catch (error) {
          set({ apiPhase: "error", apiMessage: persistenceErrorMessage(error) });
          throw error;
        }
        set((state) => ({
          offers: state.offers.filter((item) => item.code !== normalizedCode),
          apiPhase: "success",
          apiMessage: `${normalizedCode} deleted.`,
        }));
      },

      updateRestaurantCapabilities: async (restaurantSlug, settings) => {
        set((state) => ({
          restaurants: state.restaurants.map((restaurant) => restaurant.slug === restaurantSlug ? {
            ...restaurant,
            scheduling: {
              ...(restaurant.scheduling ?? {
                minPrepMinutes: 30,
                cutoffMinutes: 45,
                slotMinutes: 30,
                maxOrdersPerSlot: 8,
                dineInReservationEnabled: true,
                parcelSchedulingEnabled: true,
                deliverySchedulingEnabled: true,
              }),
              enabled: settings.acceptsScheduledOrders,
              deliverySchedulingEnabled: settings.acceptsScheduledOrders,
              parcelSchedulingEnabled: settings.acceptsScheduledOrders,
            },
            advancedFeatures: {
              ...(restaurant.advancedFeatures ?? {
                festivalMenus: false,
                limitedTimeMenus: false,
                comboBuilder: false,
                subscriptionMeals: false,
                recurringLunchPlans: false,
                groupOrdering: false,
                officeOrdering: false,
                splitPayments: false,
                familyCartSharing: false,
              }),
              preorder: settings.acceptsPreorder,
              officeOrdering: settings.acceptsBulkOrders,
              groupOrdering: settings.acceptsBulkOrders,
              festivalMenus: settings.acceptsCatering,
            },
            tags: Array.from(new Set([
              ...restaurant.tags.filter((tag) => !["scheduled orders", "catering available", "bulk orders", "preorder"].includes(tag.toLowerCase())),
              ...(settings.acceptsScheduledOrders ? ["Scheduled orders"] : []),
              ...(settings.acceptsCatering ? ["Catering available"] : []),
              ...(settings.acceptsBulkOrders ? ["Bulk orders"] : []),
              ...(settings.acceptsPreorder ? ["Preorder"] : []),
            ])),
            searchKeywords: Array.from(new Set([
              ...(restaurant.searchKeywords ?? []),
              ...(settings.cateringNegotiationEnabled ? ["catering negotiation", "custom quotation"] : []),
              `preorder ${settings.maxPreorderDays} days`,
            ])),
          } : restaurant),
          apiPhase: "success",
          apiMessage: "Restaurant customer options saved.",
        }));
      },

      updateCmsSettings: async (settings) => {
        set({
          cmsSettings: { ...settings, updatedAt: new Date().toISOString() },
          apiPhase: "success",
          apiMessage: "CMS content saved.",
        });
      },

      updateDeliveryStatus: async (deliveryId, status) => {
        const delivery = get().deliveries.find((item) => item.id === deliveryId);
        if (!delivery) return;

        set({ apiPhase: "loading", apiMessage: "Updating delivery..." });
        const updated = { ...delivery, status };
        set((state) => ({
          deliveries: state.deliveries.map((item) =>
            item.id === deliveryId ? updated : item,
          ),
          orders: state.orders.map((order) =>
            order.id === updated.orderId
              ? {
                  ...order,
                  status: status === "delivered" ? "delivered" : "picked-up",
                  statusNote:
                    status === "delivered"
                      ? "Delivery partner marked the order delivered."
                      : "Delivery partner picked up the order.",
                }
              : order,
          ),
          apiPhase: "success",
          apiMessage: `Delivery ${deliveryId} is ${status}.`,
        }));
      },

      verifyDeliveryOtp: async (deliveryId, otp) => {
        const delivery = get().deliveries.find((item) => item.id === deliveryId);
        if (!delivery) return false;

        set({ apiPhase: "loading", apiMessage: "Verifying OTP..." });
        const verified = delivery.otp === otp.trim();
        set({
          apiPhase: verified ? "success" : "error",
          apiMessage: verified ? "OTP verified." : "OTP does not match this delivery.",
        });
        return verified;
      },

      addPosItem: (item) =>
        set((state) => {
          const existing = state.posBill.lines.find((line) => line.itemId === item.id);
          const lines = existing
            ? state.posBill.lines.map((line) =>
                line.itemId === item.id
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              )
            : [
                ...state.posBill.lines,
                {
                  itemId: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: 1,
                },
              ];

          return {
            posBill: {
              ...state.posBill,
              paid: false,
              lines,
            },
          };
        }),

      addPosProduct: (item) =>
        set((state) => {
          const existing = state.posBill.lines.find((line) => line.itemId === item.id);
          const lines = existing
            ? state.posBill.lines.map((line) =>
                line.itemId === item.id
                  ? { ...line, quantity: Math.min(line.quantity + 1, item.currentStock) }
                  : line,
              )
            : [
                ...state.posBill.lines,
                {
                  itemId: item.id,
                  name: item.name,
                  price: item.price ?? 0,
                  quantity: 1,
                  lineType: "inventory" as const,
                  gstRate: item.gstApplicable ? item.gstRate : undefined,
                  hsnCode: item.gstApplicable ? item.hsnCode : undefined,
                },
              ];

          return {
            posBill: {
              ...state.posBill,
              paid: false,
              lines,
            },
          };
        }),

      updatePosQuantity: (itemId, quantity) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            paid: false,
            lines:
              quantity <= 0
                ? state.posBill.lines.filter((line) => line.itemId !== itemId)
                : state.posBill.lines.map((line) =>
                    line.itemId === itemId ? { ...line, quantity } : line,
                  ),
          },
        })),

      removePosItem: (itemId) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            lines: state.posBill.lines.filter((line) => line.itemId !== itemId),
          },
        })),

      setPosBill: (bill) => set({ posBill: bill }),

      setPosTable: (table) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            table,
            paid: false,
          },
        })),

      setPosOrderType: (orderType) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            orderType,
            table: orderType === "dine-in" ? state.posBill.table : "DIRECT",
            paid: false,
          },
        })),

      setPosCustomer: (customer) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            customerId: customer.id ?? state.posBill.customerId,
            customerName: customer.name ?? "",
            customerPhone: customer.phone ?? "",
            paid: false,
          },
        })),

      linkPosKitchenOrder: (orderId) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            linkedKitchenOrderId: orderId,
          },
        })),

      setPosPayment: (payment) =>
        set((state) => ({
          posBill: {
            ...state.posBill,
            payment,
            paid: false,
          },
        })),

      payPosBill: async () => {
        set({ apiPhase: "loading", apiMessage: "Taking POS payment..." });
        const bill = get().posBill;
        const branch = get().branches[0] ?? createOperationalFallbackBranch(get().ownerBusinessProfile, get().authUser);
        const taxSettings = get().taxSettings;
        const effectiveTaxSettings = effectiveTaxSettingsForBill(bill, taxSettings);
        const restaurantId = get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
        const subtotal = bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
        const tax = calculateRestaurantTax({
          amount: Math.max(0, subtotal - (bill.discount ?? 0)),
          settings: effectiveTaxSettings,
          packingCharge: packingChargeForBill(bill, taxSettings),
        });
        const paid: PosBill = {
          ...bill,
          paid: true,
          tenderedAmount: bill.tenderedAmount && bill.tenderedAmount > 0 ? bill.tenderedAmount : tax.total,
          invoiceNumber: bill.invoiceNumber && bill.invoiceNumber !== "INV-POS-DRAFT" ? bill.invoiceNumber : createInvoiceNumber(),
        };
        const billLink = typeof window !== "undefined"
          ? `${window.location.origin}/bill/${paid.invoiceNumber}`
          : `/bill/${paid.invoiceNumber}`;
        paid.billDeliveryLink = billLink;
        paid.billDeliveryQr = billLink;

        const canWriteNow = canUseOperationalFirestore() && isOnline();
        const writeResults = canWriteNow
          ? await Promise.allSettled([
              safeRecordPosPayment({ bill: paid, branch, taxSettings, restaurantId }),
              safeUpsertCustomerFromBill({ bill: paid, total: tax.total, restaurantId }),
              paid.linkedKitchenOrderId ? safeUpdateKitchenOrderStatus(paid.linkedKitchenOrderId, "completed", restaurantId, branch.id) : Promise.resolve(),
            ])
          : [];
        const shouldQueue = shouldQueueOfflineSync()
          && (!canWriteNow || writeResults.some((result) => result.status === "rejected"));
        const directInventoryMovements: InventoryMovement[] = paid.lines
          .filter((line) => line.lineType === "inventory")
          .flatMap((line) => {
            const inventoryItem = get().inventoryItems.find((item) => item.id === line.itemId);
            if (!inventoryItem) return [];
            return [{
              id: createLocalId("mov"),
              inventoryItemId: inventoryItem.id,
              inventoryItemName: inventoryItem.name,
              branchId: inventoryItem.branchId,
              movementType: "deduct" as const,
              quantity: -line.quantity,
              unit: inventoryItem.unit,
              reason: `POS sale ${paid.invoiceNumber}`,
              orderId: paid.invoiceNumber,
              createdAt: new Date().toISOString(),
              createdBy: get().authUser.id,
            }];
          });
        const recipeMovements = buildRecipeMovements({
          lines: paid.lines.filter((line) => line.lineType !== "inventory"),
          recipes: get().recipes,
          inventoryItems: get().inventoryItems,
          branchId: branch.id,
          orderId: paid.invoiceNumber ?? paid.table,
          createdBy: get().authUser.id,
        });
        const stockMovements = [...directInventoryMovements, ...recipeMovements];

        set((state) => ({
          posBill: paid,
          branches: state.branches.length ? state.branches : [branch],
          inventoryItems: stockMovements.length ? applyInventoryMovements(state.inventoryItems, stockMovements) : state.inventoryItems,
          inventoryMovements: stockMovements.length
            ? [...stockMovements, ...state.inventoryMovements].slice(0, 500)
            : state.inventoryMovements,
          auditLogs: stockMovements.length
            ? [
                createAuditLogEntry(state, {
                  module: "pos",
                  action: "pos.stock-deducted",
                  entityId: paid.invoiceNumber,
                  entityName: paid.table,
                  after: {
                    movementCount: stockMovements.length,
                    movements: stockMovements.map((movement) => ({
                      inventoryItemId: movement.inventoryItemId,
                      quantity: movement.quantity,
                      unit: movement.unit,
                      reason: movement.reason,
                    })),
                  },
                }),
                ...state.auditLogs,
              ].slice(0, 250)
            : state.auditLogs,
          tableOrders: paid.linkedKitchenOrderId
            ? state.tableOrders.map((order) => order.id === paid.linkedKitchenOrderId ? { ...order, status: "completed" } : order)
            : state.tableOrders,
          apiPhase: "success",
          apiMessage: shouldQueue
            ? `Payment captured locally for ${paid.table === "DIRECT" ? paid.orderType : paid.table}; sync pending.`
            : `Payment captured for ${paid.table === "DIRECT" ? paid.orderType : paid.table}.`,
        }));
        get().upsertLoyaltyCustomerFromBill(paid, tax.total);
        if (shouldQueue) {
          void queuePosPaymentSync(paid, branch, taxSettings, tax.total, restaurantId)
            .then(() => syncQueuedOperations())
            .catch(() => undefined);
        }
      },

      resetPosBill: () => set({ posBill: { ...initialPosBill, invoiceNumber: createInvoiceNumber() } }),

      upsertLoyaltyCustomerFromBill: (bill, total) => {
        const normalizedPhone = normalizePhone(bill.customerPhone ?? "");
        if (!bill.customerName || !normalizedPhone) return;
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.loyaltyCustomers.find((customer) => normalizePhone(customer.phone) === normalizedPhone);
          const lifetimeValue = (existing?.lifetimeValue ?? 0) + total;
          const totalOrders = (existing?.totalOrders ?? 0) + 1;
          const next: LoyaltyCustomer = {
            id: existing?.id ?? `cust-${normalizedPhone}`,
            name: bill.customerName ?? existing?.name ?? "Walk-in customer",
            phone: bill.customerPhone ?? existing?.phone ?? normalizedPhone,
            email: existing?.email,
            points: (existing?.points ?? 0) + Math.floor(total / 100),
            tier: lifetimeValue >= 50000 ? "VIP" : lifetimeValue >= 15000 ? "Gold" : lifetimeValue >= 5000 ? "Silver" : "Regular",
            lifetimeValue,
            totalOrders,
            lastOrderAt: now,
            inactiveDays: 0,
            previousOrderIds: [bill.invoiceNumber ?? createInvoiceNumber(), ...(existing?.previousOrderIds ?? [])].slice(0, 20),
            orderFrequency: `${totalOrders} orders`,
            inactiveRisk: false,
            birthdayCouponReady: existing?.birthdayCouponReady,
            referralHook: existing?.referralHook,
          };
          return {
            loyaltyCustomers: [next, ...state.loyaltyCustomers.filter((customer) => customer.id !== next.id)],
          };
        });
      },

      saveOwnerBusinessProfile: async (profile) => {
        const restaurantSlug = get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
        const existingRestaurant = get().restaurants.find((restaurant) => restaurant.slug === restaurantSlug);
        const branchId = get().branches[0]?.id ?? DEFAULT_BRANCH_ID;
        const profileComplete = isOwnerProfilePublicComplete(profile);
        const branch: RestaurantBranch = {
          id: branchId,
          tenantId: resolveTenantId(restaurantSlug),
          name: get().branches[0]?.name ?? profile.hotelName,
          restaurantSlug,
          address: profile.businessAddress,
          phone: profile.phoneNumber,
          managerId: get().authUser.id,
        };
        const restaurant: Restaurant = {
          id: existingRestaurant?.id ?? restaurantSlug,
          tenantId: resolveTenantId(restaurantSlug),
          ownerId: existingRestaurant?.ownerId ?? get().authUser.id,
          branchId,
          ownerIds: existingRestaurant?.ownerIds ?? [get().authUser.id],
          name: profile.hotelName,
          displayName: profile.hotelName,
          slug: restaurantSlug,
          cuisine: profile.cuisineTypes?.length ? profile.cuisineTypes.join(", ") : profile.cuisineType,
          location: profile.businessAddress,
          rating: existingRestaurant?.rating ?? 0,
          deliveryTime: profile.operatingHours,
          priceForTwo: existingRestaurant?.priceForTwo ?? 0,
          image: profile.coverImage || profile.coverImages?.[0] || profile.logo,
          logo: profile.logo,
          coverImage: profile.coverImage || profile.coverImages?.[0] || profile.logo,
          coverImages: profile.coverImages?.length ? profile.coverImages : [profile.coverImage || profile.logo].filter(Boolean),
          isOpen: existingRestaurant?.isOpen ?? true,
          tags: profile.cuisineTypes?.length ? profile.cuisineTypes : [profile.cuisineType].filter(Boolean),
          instagramHandle: existingRestaurant?.instagramHandle ?? "",
          latitude: profile.latitude,
          longitude: profile.longitude,
          deliveryRadiusKm: profile.deliveryRadiusKm,
          address: profile.businessAddress,
          googleMapLocation: profile.googleMapLocation,
          operatingHours: profile.operatingHours,
          operatingHoursSchedule: profile.operatingHoursSchedule,
          operatingHoursPreference: profile.operatingHoursPreference,
          gstDetails: profile.gstDetails,
          fssaiLicense: profile.fssaiLicense,
          diningAvailable: profile.diningAvailable,
          cloudKitchen: profile.cloudKitchen,
          approved: profileComplete ? (existingRestaurant?.approved ?? true) : false,
          profileComplete,
          publicListingEnabled: profileComplete,
          orderingEnabled: true,
          minPrice: profile.minimumOrder ?? existingRestaurant?.minPrice,
          contact: {
            phone: profile.phoneNumber,
            whatsapp: profile.whatsappNumber || profile.phoneNumber,
            supportEmail: profile.supportEmail || profile.cateringEmail || "",
            callbackEnabled: existingRestaurant?.contact?.callbackEnabled ?? true,
          },
          ownerProfile: {
            businessPhone: profile.phoneNumber,
            businessWhatsapp: profile.whatsappNumber || profile.phoneNumber,
            businessEmail: profile.supportEmail || profile.cateringEmail || "",
            cateringPhone: profile.cateringPhoneNumber || profile.phoneNumber,
            cateringWhatsapp: profile.cateringWhatsappNumber || profile.whatsappNumber || profile.phoneNumber,
            cateringEmail: profile.cateringEmail || profile.supportEmail || "",
            emergencyPhone: profile.emergencySupportNumber || profile.phoneNumber,
          },
          deliverySettings: {
            radiusKm: profile.deliveryRadiusKm,
            baseFee: profile.deliveryCharge ?? existingRestaurant?.deliverySettings?.baseFee ?? 0,
            freeDeliveryAbove: profile.freeDeliveryThreshold ?? existingRestaurant?.deliverySettings?.freeDeliveryAbove,
            maxOrdersPerSlot: existingRestaurant?.deliverySettings?.maxOrdersPerSlot,
            deliverySlotMinutes: existingRestaurant?.deliverySettings?.deliverySlotMinutes,
          },
          scheduling: existingRestaurant?.scheduling,
          advancedFeatures: existingRestaurant?.advancedFeatures,
        };
        const savedProfile = { ...profile, completed: profile.completed, reviewStatus: profile.reviewStatus ?? (profile.completed ? "pending_review" : "draft") };
        try {
          await saveOwnerRestaurantProfile({ profile: savedProfile, restaurant, branch });
        } catch (error) {
          set({ apiPhase: "error", apiMessage: persistenceErrorMessage(error) });
          throw error;
        }
        set((state) => ({
          ownerBusinessProfile: savedProfile,
          restaurants: [restaurant, ...state.restaurants.filter((item) => item.slug !== restaurant.slug)],
          branches: [branch, ...state.branches.filter((item) => item.id !== branch.id)],
          apiPhase: "success",
          apiMessage: "Business profile saved and sent for admin review.",
        }));
      },

      createSocialPost: async (input) => {
        const post: SocialPost = {
          ...input,
          id: createLocalId("SOC"),
          status: "pending",
          submittedAt: new Date().toISOString(),
        };
        set((state) => ({
          socialPosts: [post, ...state.socialPosts],
          apiPhase: "success",
          apiMessage: `${post.headline} sent to admin review.`,
        }));
        return post;
      },

      reviewSocialPost: async (postId, status, note) => {
        const now = new Date().toISOString();
        set((state) => ({
          socialPosts: state.socialPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  status,
                  adminNote: note,
                  reviewedAt: status === "approved" || status === "rejected" ? now : post.reviewedAt ?? now,
                  publishedAt: status === "published" ? now : post.publishedAt,
                }
              : post,
          ),
          apiPhase: "success",
          apiMessage: `${postId} marked ${status}.`,
        }));
      },

      createTableOrder: async (input) => {
        const restaurantId = get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
        const branchId = input.branchId ?? get().branches[0]?.id ?? DEFAULT_BRANCH_ID;
        const createdAt = new Date().toISOString();
        const localId = readableOrderId({
          source: input.source,
          orderType: input.orderType,
          tableNumber: input.tableNumber,
          createdAt,
          sequence: get().tableOrders.length + 1,
        });
        const order: TableOrder = {
          ...input,
          branchId,
          id: localId,
          status: "new",
          createdAt,
        };
        const kitchenWrite = {
          id: localId,
          restaurantId,
          branchId,
          orderType: input.orderType ?? "dine-in",
          source: input.source,
          tableNumber: input.tableNumber === "DIRECT" ? undefined : input.tableNumber,
          customerName: input.customerName ?? input.guestName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          scheduledFor: input.scheduledFor,
          waiterId: input.waiterId,
          waiterName: input.waiterName,
          lines: input.lines,
          taxSettings: get().taxSettings,
          priority: input.priority,
          etaMinutes: input.etaMinutes,
        };
        const canWriteNow = canUseOperationalFirestore() && isOnline();
        if (canWriteNow) {
          void safeCreateKitchenOrder(kitchenWrite).then((result) => {
            if (!result && shouldQueueOfflineSync()) {
              return queueKitchenOrderSync(order, kitchenWrite);
            }
            return undefined;
          }).then(() => syncQueuedOperations()).catch(() => {
            void queueKitchenOrderSync(order, kitchenWrite).then(() => syncQueuedOperations()).catch(() => undefined);
          });
        } else if (shouldQueueOfflineSync()) {
          void queueKitchenOrderSync(order, kitchenWrite).then(() => syncQueuedOperations()).catch(() => undefined);
        }
        set((state) => ({
          tableOrders: [order, ...state.tableOrders],
          apiPhase: "success",
          apiMessage: canWriteNow
            ? `Kitchen ticket created for ${order.tableNumber}.`
            : `Kitchen ticket saved offline for ${order.tableNumber}.`,
        }));
        return order;
      },

      updateTableOrder: async (orderId, patch) => {
        const current = get().tableOrders.find((item) => item.id === orderId);
        if (!current) {
          set({ apiPhase: "error", apiMessage: "Kitchen ticket not found." });
          return;
        }
        const nextOrder: TableOrder = { ...current, ...patch };
        const restaurantId = get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
        const branchId = nextOrder.branchId ?? get().branches[0]?.id ?? DEFAULT_BRANCH_ID;
        if (canUseOperationalFirestore() && isOnline()) {
          void safeUpdateKitchenOrder({
            id: orderId,
            restaurantId,
            branchId,
            orderType: nextOrder.orderType ?? "dine-in",
            source: nextOrder.source,
            tableNumber: nextOrder.tableNumber === "DIRECT" ? undefined : nextOrder.tableNumber,
            customerName: nextOrder.customerName ?? nextOrder.guestName,
            customerPhone: nextOrder.customerPhone,
            deliveryAddress: nextOrder.deliveryAddress,
            scheduledFor: nextOrder.scheduledFor,
            waiterName: nextOrder.waiterName,
            lines: nextOrder.lines,
            taxSettings: get().taxSettings,
            priority: nextOrder.priority,
            etaMinutes: nextOrder.etaMinutes,
            status: nextOrder.status === "occupied" ? "new" : nextOrder.status === "billed" ? "completed" : nextOrder.status,
          }).catch(() => {
            void queueKitchenStatusSync(orderId, nextOrder.status, restaurantId, branchId).then(() => syncQueuedOperations()).catch(() => undefined);
          });
        } else if (shouldQueueOfflineSync()) {
          void queueKitchenStatusSync(orderId, nextOrder.status, restaurantId, branchId).then(() => syncQueuedOperations()).catch(() => undefined);
        }
        set((state) => ({
          tableOrders: state.tableOrders.map((item) => (item.id === orderId ? nextOrder : item)),
          apiPhase: "success",
          apiMessage: `${readableTableOrderId(nextOrder)} updated.`,
        }));
      },

      updateTableOrderStatus: async (orderId, status) => {
        const firebaseStatus = status === "occupied" ? "new" : status === "billed" ? "completed" : status;
        const order = get().tableOrders.find((item) => item.id === orderId);
        const restaurantId = get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
        const branchId = order?.branchId ?? get().branches[0]?.id ?? DEFAULT_BRANCH_ID;
        if (canUseOperationalFirestore() && isOnline()) {
          void safeUpdateKitchenOrderStatus(orderId, firebaseStatus, restaurantId, branchId).catch(() => {
            void queueKitchenStatusSync(orderId, firebaseStatus, restaurantId, branchId).then(() => syncQueuedOperations()).catch(() => undefined);
          });
        } else if (shouldQueueOfflineSync()) {
          void queueKitchenStatusSync(orderId, firebaseStatus, restaurantId, branchId).then(() => syncQueuedOperations()).catch(() => undefined);
        }
        set((state) => ({
          tableOrders: state.tableOrders.map((order) =>
            order.id === orderId ? { ...order, status } : order,
          ),
          apiPhase: "success",
          apiMessage: canUseOperationalFirestore() && isOnline()
            ? `${order ? readableTableOrderId(order) : "Kitchen ticket"} is ${status}.`
            : `${order ? readableTableOrderId(order) : "Kitchen ticket"} is ${status}; sync pending.`,
        }));
      },

      updatePrinterSettings: (settings) =>
        set({
          printerSettings: settings,
          apiPhase: "success",
          apiMessage: "Printer settings saved.",
        }),

      createStaffMember: async (member) => {
        const nextMember = { ...member, id: createLocalId("staff"), roleId: member.roleId ?? member.role, lastActivity: member.role === "admin" ? "Created by Super Admin" : "Created by owner" };
        void safeUpsertEmployeeUser(nextMember).catch(() => undefined);
        set((state) => ({
          staffMembers: [nextMember, ...state.staffMembers],
          apiPhase: "success",
          apiMessage: `${member.name} created.`,
        }));
      },

      updateStaffMember: async (member) => {
        void safeUpsertEmployeeUser(member).catch(() => undefined);
        set((state) => ({
          staffMembers: state.staffMembers.map((item) => (item.id === member.id ? member : item)),
          apiPhase: "success",
          apiMessage: `${member.name} permissions updated.`,
        }));
      },

      deleteStaffMember: async (id) => {
        const member = get().staffMembers.find((item) => item.id === id);
        void safeDeleteEmployeeUser(id).catch(() => undefined);
        set((state) => ({
          staffMembers: state.staffMembers.filter((item) => item.id !== id),
          apiPhase: "success",
          apiMessage: `${member?.name ?? "Employee"} removed.`,
        }));
      },

      upsertPosTable: (table) =>
        set((state) => ({
          posTables: state.posTables.some((item) => item.table === table.table)
            ? state.posTables.map((item) => (item.table === table.table ? table : item))
            : [...state.posTables, table],
          apiPhase: "success",
          apiMessage: `${table.table} saved.`,
        })),

      deletePosTable: (table) =>
        set((state) => ({
          posTables: state.posTables.filter((item) => item.table !== table),
          apiPhase: "success",
          apiMessage: `${table} deleted.`,
        })),

      updateInventoryItem: async (item) => {
        const canWriteNow = canUseOperationalFirestore() && isOnline();
        const existing = get().inventoryItems.find((entry) => entry.id === item.id);
        if (canWriteNow) {
          void saveInventoryItem({
            id: item.id,
            itemName: item.name,
            quantity: item.currentStock,
            unit: item.unit,
            reorderLevel: item.reorderLevel,
            supplierId: item.supplier,
            inventoryType: item.inventoryType,
            category: item.category,
            parentCategory: item.parentCategory,
            subcategory: item.subcategory,
            categoryPath: item.categoryPath,
            barcode: item.barcode,
            costPerUnit: item.costPerUnit,
            purchaseUnit: item.purchaseUnit,
            stockUnit: item.stockUnit,
            unitConversionFactor: item.unitConversionFactor,
            sku: item.sku,
            price: item.price ?? 0,
            lowStockAlert: item.lowStockAlert ?? item.reorderLevel,
            expiryDate: item.expiryDate,
            averageDailyUsage: item.averageDailyUsage,
            wastageQuantity: item.wastageQuantity,
            equipmentSerial: item.equipmentSerial,
            maintenanceDueAt: item.maintenanceDueAt,
            centralKitchenBatchId: item.centralKitchenBatchId,
            gstApplicable: item.gstApplicable ?? false,
            gstRate: item.gstRate,
            hsnCode: item.hsnCode,
            sellable: item.sellable ?? true,
            notes: item.notes,
            branchId: item.branchId,
            restaurantId: DEFAULT_RESTAURANT_ID,
          }).catch(() => {
            void queueInventorySync(item).then(() => syncQueuedOperations()).catch(() => undefined);
          });
        } else if (shouldQueueOfflineSync()) {
          void queueInventorySync(item).then(() => syncQueuedOperations()).catch(() => undefined);
        }
        set((state) => ({
          inventoryItems: state.inventoryItems.some((entry) => entry.id === item.id)
            ? state.inventoryItems.map((entry) => (entry.id === item.id ? item : entry))
            : [item, ...state.inventoryItems],
          auditLogs: [
            createAuditLogEntry(state, {
              module: "inventory",
              action: existing ? "inventory.updated" : "inventory.created",
              entityId: item.id,
              entityName: item.name,
              before: existing as unknown as Record<string, unknown> | undefined,
              after: item as unknown as Record<string, unknown>,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: canWriteNow
            ? `${item.name} stock updated.`
            : `${item.name} stock updated offline; sync pending.`,
        }));
      },

      deleteInventoryItem: async (itemId) => {
        const item = get().inventoryItems.find((entry) => entry.id === itemId);
        set((state) => ({
          inventoryItems: state.inventoryItems.filter((entry) => entry.id !== itemId),
          auditLogs: [
            createAuditLogEntry(state, {
              module: "inventory",
              action: "inventory.deleted",
              entityId: itemId,
              entityName: item?.name,
              before: item as unknown as Record<string, unknown> | undefined,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: item ? `${item.name} deleted.` : "Inventory item deleted.",
        }));
      },

      adjustInventoryStock: async (itemId, quantityDelta, reason) => {
        const item = get().inventoryItems.find((entry) => entry.id === itemId);
        if (!item) return;
        const movement: InventoryMovement = {
          id: createLocalId("mov"),
          inventoryItemId: item.id,
          inventoryItemName: item.name,
          branchId: item.branchId,
          movementType: quantityDelta < 0 ? "adjust" : "receive",
          quantity: quantityDelta,
          unit: item.unit,
          reason,
          createdAt: new Date().toISOString(),
          createdBy: get().authUser.id,
        };
        const nextItem = {
          ...item,
          currentStock: Math.max(0, Math.round((item.currentStock + quantityDelta) * 1000) / 1000),
          lastMovementAt: movement.createdAt,
          updatedAt: movement.createdAt,
        };
        set((state) => ({
          inventoryItems: state.inventoryItems.map((entry) => (entry.id === itemId ? nextItem : entry)),
          inventoryMovements: [movement, ...state.inventoryMovements].slice(0, 500),
          auditLogs: [
            createAuditLogEntry(state, {
              module: "inventory",
              action: "inventory.adjusted",
              entityId: itemId,
              entityName: item.name,
              before: item as unknown as Record<string, unknown>,
              after: nextItem as unknown as Record<string, unknown>,
              note: reason,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: `${item.name} adjusted by ${quantityDelta} ${item.unit}.`,
        }));
      },

      upsertRecipe: async (recipe) => {
        const totalCost = calculateRecipeCost(recipe, get().inventoryItems);
        const nextRecipe = { ...recipe, totalCost, updatedAt: new Date().toISOString() };
        set((state) => ({
          recipes: state.recipes.some((entry) => entry.id === recipe.id)
            ? state.recipes.map((entry) => (entry.id === recipe.id ? nextRecipe : entry))
            : [nextRecipe, ...state.recipes],
          menuItems: state.menuItems.map((item) =>
            item.id === recipe.menuItemId
              ? {
                  ...item,
                  deductionHook: undefined,
                  recipeLinks: recipe.ingredients.map((ingredient) => ({
                    inventoryItemId: ingredient.inventoryItemId,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                  })),
                }
              : item,
          ),
          auditLogs: [
            createAuditLogEntry(state, {
              module: "recipe",
              action: "recipe.upserted",
              entityId: recipe.id,
              entityName: recipe.menuItemName,
              after: nextRecipe as unknown as Record<string, unknown>,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: `${recipe.menuItemName} recipe saved.`,
        }));
      },

      deleteRecipe: async (recipeId) => {
        const recipe = get().recipes.find((entry) => entry.id === recipeId);
        set((state) => ({
          recipes: state.recipes.filter((entry) => entry.id !== recipeId),
          auditLogs: [
            createAuditLogEntry(state, {
              module: "recipe",
              action: "recipe.deleted",
              entityId: recipeId,
              entityName: recipe?.menuItemName,
              before: recipe as unknown as Record<string, unknown> | undefined,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: recipe ? `${recipe.menuItemName} recipe deleted.` : "Recipe deleted.",
        }));
      },

      upsertSupplier: async (supplier) => {
        set((state) => ({
          suppliers: state.suppliers.some((entry) => entry.id === supplier.id)
            ? state.suppliers.map((entry) => (entry.id === supplier.id ? supplier : entry))
            : [supplier, ...state.suppliers],
          auditLogs: [
            createAuditLogEntry(state, {
              module: "supplier",
              action: "supplier.upserted",
              entityId: supplier.id,
              entityName: supplier.name,
              after: supplier as unknown as Record<string, unknown>,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: `${supplier.name} supplier saved.`,
        }));
      },

      upsertPurchaseOrder: async (order) => {
        const duplicateInvoice = order.invoiceNumber
          ? get().purchaseOrders.some((entry) => entry.id !== order.id && entry.invoiceNumber?.trim().toLowerCase() === order.invoiceNumber?.trim().toLowerCase())
          : false;
        if (duplicateInvoice) {
          set({ apiPhase: "error", apiMessage: "Duplicate supplier invoice number detected." });
          return;
        }
        set((state) => ({
          purchaseOrders: state.purchaseOrders.some((entry) => entry.id === order.id)
            ? state.purchaseOrders.map((entry) => (entry.id === order.id ? order : entry))
            : [order, ...state.purchaseOrders],
          purchases: state.purchases.some((entry) => entry.id === order.id)
            ? state.purchases
            : [
                {
                  id: order.id,
                  supplier: order.supplierName,
                  itemName: order.items[0]?.itemName ?? "Purchase order",
                  quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
                  expectedAt: order.expectedAt ?? order.createdAt,
                  status: order.status === "received" ? "received" : order.status === "ordered" ? "ordered" : "draft",
                },
                ...state.purchases,
              ],
          auditLogs: [
            createAuditLogEntry(state, {
              module: "purchase",
              action: "purchase.upserted",
              entityId: order.id,
              entityName: order.supplierName,
              after: order as unknown as Record<string, unknown>,
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: `${order.id} purchase order saved.`,
        }));
      },

      receivePurchaseOrder: async (orderId) => {
        const order = get().purchaseOrders.find((entry) => entry.id === orderId);
        if (!order) return;
        const receivedAt = new Date().toISOString();
        const movements: InventoryMovement[] = order.items
          .filter((item) => item.inventoryItemId && item.quantity > 0)
          .map((item) => ({
            id: createLocalId("mov"),
            inventoryItemId: item.inventoryItemId as string,
            inventoryItemName: item.itemName,
            branchId: get().branches[0]?.id ?? DEFAULT_BRANCH_ID,
            movementType: "receive",
            quantity: item.receivedQuantity ?? item.quantity,
            unit: item.unit,
            reason: `GRN ${order.id}`,
            purchaseOrderId: order.id,
            createdAt: receivedAt,
            createdBy: get().authUser.id,
          }));
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((entry) =>
            entry.id === orderId
              ? { ...entry, status: "received", receivedAt, updatedAt: receivedAt }
              : entry,
          ),
          purchases: state.purchases.map((entry) => entry.id === orderId ? { ...entry, status: "received" } : entry),
          inventoryItems: applyInventoryMovements(state.inventoryItems, movements),
          inventoryMovements: [...movements, ...state.inventoryMovements].slice(0, 500),
          auditLogs: [
            createAuditLogEntry(state, {
              module: "purchase",
              action: "purchase.received",
              entityId: orderId,
              entityName: order.supplierName,
              after: { status: "received", movements },
            }),
            ...state.auditLogs,
          ].slice(0, 250),
          apiPhase: "success",
          apiMessage: `${order.id} received and stock updated.`,
        }));
      },

      recordAuditLog: (entry) =>
        set((state) => ({
          auditLogs: [createAuditLogEntry(state, entry), ...state.auditLogs].slice(0, 250),
        })),

      queueOfflineAction: (item) =>
        set((state) => {
          const queued = { ...item, id: createLocalId("off"), status: "queued" as const, createdAt: new Date().toISOString() };
          void enqueueOfflineOperation({
            id: queued.id,
            module: item.module,
            action: item.action,
            writes: [],
          }).catch(() => undefined);
          return {
            offlineQueue: [queued, ...state.offlineQueue],
          };
        }),

      submitBusinessApplication: async (input) => {
        set({ apiPhase: "loading", apiMessage: "Submitting listing for review..." });
        const application: BusinessListingApplication = {
          ...input,
          id: createLocalId("BIZ"),
          status: "pending",
          submittedAt: new Date().toISOString(),
        };
        set((state) => ({
          businessApplications: [application, ...state.businessApplications],
          apiPhase: "success",
          apiMessage: `${application.businessName} is waiting for admin review.`,
        }));
        return application;
      },

      reviewBusinessApplication: async (applicationId, status) => {
        const application = get().businessApplications.find((item) => item.id === applicationId);
        if (!application) return;

        set({ apiPhase: "loading", apiMessage: "Updating listing review..." });
        const reviewedAt = new Date().toISOString();
        const slug = slugifyIdentifier(application.tenantId || application.businessName || application.hotelName || DEFAULT_RESTAURANT_ID, DEFAULT_RESTAURANT_ID);
        const ownerId = get().authUser.id !== "anonymous" ? get().authUser.id : `owner-${application.id}`;
        const branchId = `${slug}-main`;
        const restaurantName = application.hotelName || application.businessName;
        const approvedRestaurant: Restaurant = {
          id: slug,
          tenantId: DEFAULT_TENANT_ID,
          ownerId,
          ownerIds: [ownerId],
          branchId,
          name: restaurantName,
          displayName: restaurantName,
          slug,
          cuisine: application.cuisine,
          location: application.area,
          rating: 0,
          deliveryTime: "",
          priceForTwo: 0,
          image:
            application.restaurantImages[0] ||
            application.foodImages[0] ||
            "",
          isOpen: true,
          tags: [`${application.deliveryRadiusKm} km delivery`],
          instagramHandle: "",
          deliveryRadiusKm: application.deliveryRadiusKm,
          approved: status === "approved",
          adminStatus: status === "approved" ? "Active" : "Under Review",
          subscriptionPlan: "Trial",
          subscriptionStatus: "trialing",
          billingStatus: "current",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          orderingEnabled: status === "approved",
          frozen: false,
          onboardingStatus: "profile",
          ownerLoginEnabled: true,
          contact: {
            phone: application.phoneNumber ?? application.mobile ?? "",
            whatsapp: application.mobile ?? application.phoneNumber ?? "",
            supportEmail: application.ownerEmail,
            callbackEnabled: true,
          },
          ownerProfile: {
            businessPhone: application.phoneNumber ?? application.mobile ?? "",
            businessWhatsapp: application.mobile ?? application.phoneNumber ?? "",
            businessEmail: application.ownerEmail,
            cateringPhone: application.phoneNumber ?? application.mobile ?? "",
            cateringWhatsapp: application.mobile ?? application.phoneNumber ?? "",
            cateringEmail: application.ownerEmail,
            emergencyPhone: application.phoneNumber ?? application.mobile ?? "",
          },
          deliverySettings: {
            radiusKm: application.deliveryRadiusKm,
            baseFee: 39,
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
            dineInReservationEnabled: application.diningAvailable ?? true,
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
        };
        const branch: RestaurantBranch = {
          id: branchId,
          tenantId: DEFAULT_TENANT_ID,
          name: application.area || restaurantName,
          restaurantSlug: slug,
          address: application.address,
          phone: application.phoneNumber ?? application.mobile ?? "",
          managerId: ownerId,
        };
        const owner: StaffMember = {
          id: ownerId,
          name: application.ownerName || application.ownerEmail,
          role: "owner",
          roleId: "owner",
          status: "active",
          branchId,
          permissions: ["all"],
          lastActivity: `Assigned to ${application.businessName}`,
        };

        set((state) => ({
          businessApplications: state.businessApplications.map((item) =>
            item.id === applicationId ? { ...item, status, reviewedAt } : item,
          ),
          restaurants:
            status === "approved" ? [approvedRestaurant, ...state.restaurants.filter((item) => item.slug !== approvedRestaurant.slug)] : state.restaurants,
          branches:
            status === "approved" ? [branch, ...state.branches.filter((item) => item.id !== branch.id)] : state.branches,
          staffMembers:
            status === "approved" ? [owner, ...state.staffMembers.filter((item) => item.id !== owner.id)] : state.staffMembers,
          authUser:
            status === "approved"
              ? {
                  id: owner.id,
                  name: owner.name,
                  role: "owner",
                  tenantId: slug,
                  branchIds: [branchId],
                  restaurantSlug: slug,
                }
              : state.authUser,
          apiPhase: "success",
          apiMessage:
            status === "approved"
              ? `${application.businessName} is approved and visible.`
              : `${application.businessName} was rejected.`,
        }));
      },

      updateRestaurantAdminState: async (restaurantSlug, patch) => {
        set((state) => ({
          restaurants: state.restaurants.map((restaurant) =>
            restaurant.slug === restaurantSlug || restaurant.id === restaurantSlug
              ? {
                  ...restaurant,
                  ...patch,
                  approved: patch.adminStatus === "Suspended" || patch.adminStatus === "Expired" ? false : patch.approved ?? restaurant.approved,
                  isOpen: patch.orderingEnabled === false || patch.frozen ? false : patch.isOpen ?? restaurant.isOpen,
                }
              : restaurant,
          ),
          apiPhase: "success",
          apiMessage: "Restaurant subscription state updated.",
        }));
      },

      createCateringQuote: async (input) => {
        const selectedPackage = get().cateringPackages.find(
          (item) => item.id === input.packageId,
        );

        set({ apiPhase: "loading", apiMessage: "Preparing catering request..." });
        const subtotal = selectedPackage ? selectedPackage.basePrice + selectedPackage.pricePerGuest * input.guestCount : 0;
        const serviceFee = Math.round(subtotal * 0.05);
        const quote: CateringQuote = {
          ...input,
          id: createLocalId("quote"),
          subtotal,
          serviceFee,
          total: subtotal + serviceFee,
          status: selectedPackage ? "quoted" : "new",
        };
        set((state) => ({
          cateringInquiries: [quote, ...state.cateringInquiries.filter((item) => item.id !== quote.id)],
          latestQuote: quote,
          apiPhase: "success",
          apiMessage: selectedPackage ? `Quote ${quote.id} is ready.` : `Catering request ${quote.id} was sent.`,
        }));
        return quote;
      },

      updateCateringInquiryStatus: async (quoteId, status) => {
        set((state) => ({
          cateringInquiries: state.cateringInquiries.map((item) => item.id === quoteId ? { ...item, status } : item),
          latestQuote: state.latestQuote?.id === quoteId ? { ...state.latestQuote, status } : state.latestQuote,
          apiPhase: "success",
          apiMessage: `${quoteId} marked ${status}.`,
        }));
      },

      convertCateringInquiryToOrder: async (quoteId) => {
        const quote = get().cateringInquiries.find((item) => item.id === quoteId) ?? get().latestQuote;
        if (!quote) return;
        const order = await get().createOrder({
          restaurantSlug: get().authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID,
          customer: {
            name: quote.name,
            phone: quote.phone,
            address: quote.eventType ?? "Catering event",
          },
          lines: [{
            itemId: quote.packageId,
            name: `Catering: ${quote.packageId}`,
            price: quote.total,
            quantity: 1,
          }],
          totals: {
            subtotal: quote.subtotal,
            discount: 0,
            deliveryFee: 0,
            tax: quote.serviceFee,
            total: quote.total,
          },
          payment: "upi",
          channel: "Catering",
          fulfillmentType: "delivery",
          scheduleMode: quote.eventDate ? "scheduled" : "now",
          scheduledFor: quote.eventDate,
          guestCount: quote.guestCount,
        });
        set((state) => ({
          cateringInquiries: state.cateringInquiries.map((item) => item.id === quoteId ? { ...item, status: "converted", convertedOrderId: order.id } : item),
          latestQuote: state.latestQuote?.id === quoteId ? { ...state.latestQuote, status: "converted", convertedOrderId: order.id } : state.latestQuote,
          apiPhase: "success",
          apiMessage: `${quoteId} converted to ${order.id}.`,
        }));
      },
    }),
    {
      name: "sarva-production-state",
      version: 8,
      migrate: (persistedState, persistedVersion): PersistedAppStoreState => {
        if (persistedVersion < 6) {
          return createPersistedDefaults();
        }
        let migrated = persistedState as PersistedAppStoreState;
        if (persistedVersion < 7) {
          migrated = removeLegacySeedData(migrated);
        }
        return withErpDefaults(migrated);
      },
      partialize: (state): PersistedAppStoreState => ({
        authUser: state.authUser,
        restaurants: state.restaurants,
        businessApplications: state.businessApplications,
        menuItems: state.menuItems,
        menuCategories: state.menuCategories,
        cuisines: state.cuisines,
        comboOffers: state.comboOffers,
        menuSchedules: state.menuSchedules,
        taxSettings: state.taxSettings,
        offers: state.offers,
        orders: state.orders,
        deliveries: state.deliveries,
        templates: state.templates,
        cateringPackages: state.cateringPackages,
        cateringInquiries: state.cateringInquiries,
        posTables: state.posTables,
        posBill: state.posBill,
        ownerBusinessProfile: state.ownerBusinessProfile,
        socialPosts: state.socialPosts,
        tableOrders: state.tableOrders,
        printerSettings: state.printerSettings,
        staffMembers: state.staffMembers,
        branches: state.branches,
        inventoryItems: state.inventoryItems,
        purchases: state.purchases,
        purchaseOrders: state.purchaseOrders,
        suppliers: state.suppliers,
        supplierPayments: state.supplierPayments,
        recipes: state.recipes,
        inventoryMovements: state.inventoryMovements,
        kitchenStations: state.kitchenStations,
        auditLogs: state.auditLogs,
        chartAccounts: state.chartAccounts,
        expenses: state.expenses,
        loyaltyCustomers: state.loyaltyCustomers,
        transactions: state.transactions,
        cmsSettings: state.cmsSettings,
        offlineQueue: state.offlineQueue,
        latestQuote: state.latestQuote,
      }),
    },
  ),
);
