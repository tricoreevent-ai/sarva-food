import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type {
  CampaignDoc,
  AppCategoryDoc,
  AppCuisineDoc,
  BillTemplateDoc,
  BranchDoc,
  CateringRequestDoc,
  CallbackRequestDoc,
  ComboOfferDoc,
  CustomerDoc,
  CustomerAddressDoc,
  CustomerLoyaltyDoc,
  CustomerOrderDoc,
  CustomerProfileDoc,
  CuisineDoc,
  DeliveryDoc,
  InventoryDoc,
  KitchenOrderDoc,
  KotPrintQueueDoc,
  KotTemplateDoc,
  MenuCategoryDoc,
  MenuDoc,
  MenuScheduleDoc,
  MenuVariantDoc,
  ModifierGroupDoc,
  OfferDoc,
  OrderDoc,
  PrinterProfileDoc,
  PrintLogDoc,
  ReceiptDoc,
  ReceiptTemplateDoc,
  PaymentTransactionDoc,
  RestaurantDoc,
  RestaurantSettingsDoc,
  RestaurantTableDoc,
  ReviewDoc,
  SocialPostDoc,
  SocialTemplateDoc,
  SubscriptionDoc,
  TaxSettingsDoc,
  TenantDoc,
  UserDoc,
} from "@/types/firebase";

export const COLLECTIONS = {
  tenants: "tenants",
  users: "users",
  tenantUsers: "tenantUsers",
  branchUsers: "branchUsers",
  userSessions: "userSessions",
  auditLogs: "auditLogs",
  restaurants: "restaurants",
  appCategories: "appCategories",
  appCuisines: "appCuisines",
  roles: "roles",
  branches: "branches",
  tables: "tables",
  menus: "menus",
  menuCategories: "menuCategories",
  menuItems: "menuItems",
  deliveryMenus: "deliveryMenus",
  dineInMenus: "dineInMenus",
  parcelMenus: "parcelMenus",
  cuisines: "cuisines",
  menuVariants: "menuVariants",
  modifierGroups: "modifierGroups",
  taxSettings: "taxSettings",
  comboOffers: "comboOffers",
  menuSchedules: "menuSchedules",
  orders: "orders",
  orderItems: "orderItems",
  kitchenOrders: "kitchenOrders",
  customers: "customers",
  loyaltyAccounts: "loyaltyAccounts",
  customerProfiles: "customerProfiles",
  customerOrders: "customerOrders",
  customerLoyalty: "customerLoyalty",
  customerPaymentMethods: "customerPaymentMethods",
  customerSavedRestaurants: "customerSavedRestaurants",
  customerCoupons: "customerCoupons",
  customerReviews: "customerReviews",
  loyaltyCustomers: "loyaltyCustomers",
  offers: "offers",
  coupons: "coupons",
  inventory: "inventory",
  inventoryItems: "inventoryItems",
  inventoryTransactions: "inventoryTransactions",
  purchaseEntries: "purchaseEntries",
  purchaseOrders: "purchaseOrders",
  suppliers: "suppliers",
  deliveries: "deliveries",
  deliveryAgents: "deliveryAgents",
  customerAddresses: "customerAddresses",
  campaigns: "campaigns",
  socialTemplates: "socialTemplates",
  socialPosts: "socialPosts",
  cateringRequests: "cateringRequests",
  callbackRequests: "callbackRequests",
  subscriptions: "subscriptions",
  billTemplates: "billTemplates",
  kotTemplates: "kotTemplates",
  printerProfiles: "printerProfiles",
  printLogs: "printLogs",
  receipts: "receipts",
  receiptTemplates: "receiptTemplates",
  paymentTransactions: "paymentTransactions",
  reports: "reports",
  permissions: "permissions",
  accountingTransactions: "accountingTransactions",
  expenseEntries: "expenseEntries",
  purchaseExpenses: "purchaseExpenses",
  salaryEntries: "salaryEntries",
  ledgerAccounts: "ledgerAccounts",
  deliveryZones: "deliveryZones",
  accountingEntries: "accountingEntries",
  expenses: "expenses",
  notifications: "notifications",
  staffActivityLogs: "staffActivityLogs",
  settings: "settings",
  kotPrintQueue: "kotPrintQueue",
  restaurantSettings: "restaurantSettings",
  restaurantTables: "restaurantTables",
} as const;

function converter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(value: T): DocumentData {
      const data = { ...value } as Record<string, unknown>;
      delete data.id;
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return {
        id: snapshot.id,
        ...snapshot.data(options),
      } as T;
    },
  };
}

export function typedCollection<T extends { id: string }>(
  db: Firestore,
  path: string,
): CollectionReference<T> {
  return collection(db, path).withConverter(converter<T>());
}

export function typedDoc<T extends { id: string }>(db: Firestore, path: string, id: string) {
  return doc(db, path, id).withConverter(converter<T>());
}

export const refs = {
  users: (db: Firestore) => typedCollection<UserDoc>(db, COLLECTIONS.users),
  tenants: (db: Firestore) => typedCollection<TenantDoc>(db, COLLECTIONS.tenants),
  restaurants: (db: Firestore) =>
    typedCollection<RestaurantDoc>(db, COLLECTIONS.restaurants),
  appCategories: (db: Firestore) =>
    typedCollection<AppCategoryDoc>(db, COLLECTIONS.appCategories),
  appCuisines: (db: Firestore) =>
    typedCollection<AppCuisineDoc>(db, COLLECTIONS.appCuisines),
  branches: (db: Firestore) => typedCollection<BranchDoc>(db, COLLECTIONS.branches),
  menus: (db: Firestore) => typedCollection<MenuDoc>(db, COLLECTIONS.menus),
  menuItems: (db: Firestore) => typedCollection<MenuDoc>(db, COLLECTIONS.menuItems),
  menuCategories: (db: Firestore) =>
    typedCollection<MenuCategoryDoc>(db, COLLECTIONS.menuCategories),
  cuisines: (db: Firestore) => typedCollection<CuisineDoc>(db, COLLECTIONS.cuisines),
  menuVariants: (db: Firestore) => typedCollection<MenuVariantDoc>(db, COLLECTIONS.menuVariants),
  modifierGroups: (db: Firestore) => typedCollection<ModifierGroupDoc>(db, COLLECTIONS.modifierGroups),
  taxSettings: (db: Firestore) => typedCollection<TaxSettingsDoc>(db, COLLECTIONS.taxSettings),
  comboOffers: (db: Firestore) => typedCollection<ComboOfferDoc>(db, COLLECTIONS.comboOffers),
  menuSchedules: (db: Firestore) => typedCollection<MenuScheduleDoc>(db, COLLECTIONS.menuSchedules),
  orders: (db: Firestore) => typedCollection<OrderDoc>(db, COLLECTIONS.orders),
  kitchenOrders: (db: Firestore) =>
    typedCollection<KitchenOrderDoc>(db, COLLECTIONS.kitchenOrders),
  customers: (db: Firestore) =>
    typedCollection<CustomerDoc>(db, COLLECTIONS.customers),
  customerProfiles: (db: Firestore) =>
    typedCollection<CustomerProfileDoc>(db, COLLECTIONS.customerProfiles),
  customerAddresses: (db: Firestore) =>
    typedCollection<CustomerAddressDoc>(db, COLLECTIONS.customerAddresses),
  customerOrders: (db: Firestore) =>
    typedCollection<CustomerOrderDoc>(db, COLLECTIONS.customerOrders),
  customerLoyalty: (db: Firestore) =>
    typedCollection<CustomerLoyaltyDoc>(db, COLLECTIONS.customerLoyalty),
  customerReviews: (db: Firestore) =>
    typedCollection<ReviewDoc>(db, COLLECTIONS.customerReviews),
  offers: (db: Firestore) => typedCollection<OfferDoc>(db, COLLECTIONS.offers),
  inventory: (db: Firestore) =>
    typedCollection<InventoryDoc>(db, COLLECTIONS.inventory),
  deliveries: (db: Firestore) =>
    typedCollection<DeliveryDoc>(db, COLLECTIONS.deliveries),
  campaigns: (db: Firestore) =>
    typedCollection<CampaignDoc>(db, COLLECTIONS.campaigns),
  socialTemplates: (db: Firestore) =>
    typedCollection<SocialTemplateDoc>(db, COLLECTIONS.socialTemplates),
  socialPosts: (db: Firestore) =>
    typedCollection<SocialPostDoc>(db, COLLECTIONS.socialPosts),
  cateringRequests: (db: Firestore) =>
    typedCollection<CateringRequestDoc>(db, COLLECTIONS.cateringRequests),
  callbackRequests: (db: Firestore) =>
    typedCollection<CallbackRequestDoc>(db, COLLECTIONS.callbackRequests),
  subscriptions: (db: Firestore) =>
    typedCollection<SubscriptionDoc>(db, COLLECTIONS.subscriptions),
  billTemplates: (db: Firestore) =>
    typedCollection<BillTemplateDoc>(db, COLLECTIONS.billTemplates),
  kotTemplates: (db: Firestore) =>
    typedCollection<KotTemplateDoc>(db, COLLECTIONS.kotTemplates),
  printerProfiles: (db: Firestore) =>
    typedCollection<PrinterProfileDoc>(db, COLLECTIONS.printerProfiles),
  printLogs: (db: Firestore) =>
    typedCollection<PrintLogDoc>(db, COLLECTIONS.printLogs),
  receipts: (db: Firestore) =>
    typedCollection<ReceiptDoc>(db, COLLECTIONS.receipts),
  receiptTemplates: (db: Firestore) =>
    typedCollection<ReceiptTemplateDoc>(db, COLLECTIONS.receiptTemplates),
  paymentTransactions: (db: Firestore) =>
    typedCollection<PaymentTransactionDoc>(db, COLLECTIONS.paymentTransactions),
  kotPrintQueue: (db: Firestore) =>
    typedCollection<KotPrintQueueDoc>(db, COLLECTIONS.kotPrintQueue),
  restaurantSettings: (db: Firestore) =>
    typedCollection<RestaurantSettingsDoc>(db, COLLECTIONS.restaurantSettings),
  restaurantTables: (db: Firestore) =>
    typedCollection<RestaurantTableDoc>(db, COLLECTIONS.restaurantTables),
};
