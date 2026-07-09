import { parseFirestoreDateIso } from "@/lib/firestore-date";
import { normalizeMenuImageUrls } from "@/lib/menu-images";
import type { DemoOrder, LoyaltyCustomer, MenuItem, PosTable, StaffMember, TableOrder } from "@/lib/types";
import type { KitchenOrderDoc, OrderDoc } from "@/types/firebase";

export function orderDocToDemoOrder(order: OrderDoc): DemoOrder {
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    restaurantSlug: order.restaurantId,
    customer: { name: order.customerName, phone: order.customerPhone, address: order.deliveryAddress ?? "" },
    lines: (order.lines ?? []).map((line) => ({ itemId: line.menuItemId, name: line.name, price: Number(line.price ?? 0), quantity: Number(line.quantity ?? 0) })),
    totals: { subtotal: Number(order.subtotal ?? 0), discount: Number(order.discount ?? 0), deliveryFee: Number(order.deliveryFee ?? 0), tax: Number(order.tax ?? 0), total: Number(order.total ?? 0) },
    offerCode: order.offerCode,
    payment: "upi",
    paymentStatus: order.paymentStatus,
    channel: order.channel === "instagram" ? "Instagram" : order.channel === "whatsapp" ? "WhatsApp" : order.channel === "pos" ? "POS" : order.channel === "catering" ? "Catering" : order.channel === "qr" ? "QR" : "Web",
    status: order.status === "draft" ? "new" : order.status,
    createdAt: parseFirestoreDateIso(order.createdAt) ?? new Date().toISOString(),
    deliveryOtp: order.deliveryOtp,
    kitchenOrderId: order.kitchenOrderId,
    fulfillmentType: normalizeFulfillment(order.fulfillmentType ?? order.orderType),
    scheduleMode: order.scheduleMode,
    scheduledFor: parseFirestoreDateIso(order.scheduledFor),
    scheduledStatus: order.scheduledStatus,
    prepEstimateMinutes: order.prepEstimateMinutes,
    cutoffAt: parseFirestoreDateIso(order.cutoffAt),
    guestCount: order.guestCount,
  };
}

export function kitchenDocToTableOrder(order: KitchenOrderDoc | Record<string, unknown>): TableOrder {
  const raw = order as Record<string, unknown>;
  const lines = Array.isArray(order.lines) ? order.lines as Array<Record<string, unknown>> : [];
  return {
    id: str(order.id),
    orderNumber: orderNumberValue(raw.orderNumber),
    displayOrderNumber: orderNumberValue(raw.displayOrderNumber),
    invoiceNumber: str(raw.invoiceNumber),
    billNumber: str(raw.billNumber),
    tableNumber: str(order.tableNumber) || labelForOrderType(str(order.orderType)),
    source: sourceFor(str(order.source)),
    orderType: normalizePosOrderType(str(order.orderType)),
    guestName: str(order.customerName),
    customerName: str(order.customerName),
    customerPhone: str(order.customerPhone),
    deliveryAddress: str(order.deliveryAddress),
    scheduledFor: parseFirestoreDateIso(order.scheduledFor),
    lines: lines.map((line) => ({ itemId: str(line.menuItemId || line.itemId), name: str(line.name), price: num(line.price), quantity: num(line.quantity), notes: str(line.notes) })),
    status: tableStatus(str(order.status)),
    priority: str(order.priority) === "rush" ? "rush" : "normal",
    waiterId: str(order.waiterId),
    waiterName: str(order.waiterName),
    kitchenStation: str(order.kitchenStation),
    assignedStaffId: str(order.assignedStaffId),
    assignedStaffName: str(order.assignedStaffName),
    paymentStatus: paymentStatus(str(order.paymentStatus)),
    branchId: str(order.branchId),
    createdAt: parseFirestoreDateIso(order.createdAt) ?? new Date().toISOString(),
    etaMinutes: num(order.etaMinutes, 12),
    total: num(order.total),
    printedCount: num(order.printedCount),
    lastPrintedAt: parseFirestoreDateIso(order.lastPrintedAt),
    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory.map((entry) => normalizeStatusEntry(entry)).filter(Boolean) as TableOrder["statusHistory"]
      : undefined,
  };
}

function normalizeStatusEntry(entry: unknown) {
  if (!entry || typeof entry !== "object") return null;
  const value = entry as Record<string, unknown>;
  const at = parseFirestoreDateIso(value.at);
  if (!at) return null;
  return {
    status: tableStatus(str(value.status)),
    foodStatus: tableStatus(str(value.foodStatus)),
    event: str(value.event),
    paymentStatus: str(value.paymentStatus),
    at,
    by: str(value.by),
  };
}

function orderNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return str(value);
}

export function menuDocToMenuItem(item: Record<string, unknown>): MenuItem {
  const category = str(item.category || item.categoryName || item.categoryId) || "Menu";
  const images = normalizeMenuImageUrls(item);
  const image = images[0] ?? "";
  return {
    id: str(item.id),
    restaurantSlug: str(item.restaurantId || item.tenantId),
    name: str(item.name),
    category,
    categoryId: str(item.categoryId),
    subcategory: str(item.subcategory),
    cuisineIds: Array.isArray(item.cuisineIds) ? item.cuisineIds.filter((id): id is string => typeof id === "string") : [],
    description: str(item.description),
    longDescription: str(item.longDescription),
    price: num(item.price || item.deliveryPrice || item.dineInPrice),
    dineInPrice: finite(item.dineInPrice),
    parcelPrice: finite(item.parcelPrice),
    deliveryPrice: finite(item.deliveryPrice),
    taxRate: item.taxRate === 18 ? 18 : 5,
    packingCharge: finite(item.packingCharge),
    image,
    imagePath: image,
    images,
    imagePaths: images,
    isVeg: item.isVeg !== false && item.foodType !== "nonveg",
    foodType: foodType(str(item.foodType)),
    isPopular: Boolean(item.isPopular ?? item.featuredEnabled),
    prepTime: str(item.prepTime) || "15 min",
    soldOut: item.soldOut === true || item.available === false,
    tags: Array.isArray(item.tags) ? item.tags.filter((value): value is string => typeof value === "string") : [],
    badges: Array.isArray(item.badges) ? item.badges.filter((value): value is string => typeof value === "string") : [],
    modifiers: Array.isArray(item.modifiers) ? item.modifiers as MenuItem["modifiers"] : [],
    addOns: Array.isArray(item.addOns) ? item.addOns as MenuItem["addOns"] : [],
  };
}

export function customerDocToLoyaltyCustomer(customer: Record<string, unknown>): LoyaltyCustomer {
  return {
    id: str(customer.id),
    name: str(customer.name || customer.displayName) || "Customer",
    phone: str(customer.phone),
    email: str(customer.email),
    points: num(customer.loyaltyPoints || customer.points),
    tier: loyaltyTier(str(customer.tier)),
    lifetimeValue: num(customer.lifetimeValue),
    totalOrders: num(customer.totalOrders),
    lastOrderAt: parseFirestoreDateIso(customer.lastOrderAt),
    inactiveDays: num(customer.inactiveDays),
    previousOrderIds: Array.isArray(customer.previousOrderIds) ? customer.previousOrderIds.filter((id): id is string => typeof id === "string") : [],
    orderFrequency: str(customer.orderFrequency) || "Recent",
    inactiveRisk: Boolean(customer.inactiveRisk),
  };
}

export function staffDocToStaffMember(user: Record<string, unknown>): StaffMember {
  const active = user.active !== false;
  return {
    id: str(user.id || user.uid),
    name: str(user.name || user.displayName) || "Staff member",
    email: str(user.email),
    phone: str(user.phone),
    role: staffRole(str(user.role)),
    roleId: str(user.roleId || user.role),
    status: str(user.status) === "invited" ? "invited" : active ? "active" : "off-duty",
    branchId: str(user.branchId || first(user.branchIds)) || "main",
    permissions: Array.isArray(user.permissions) ? user.permissions.filter((item): item is string => typeof item === "string") : [],
    lastActivity: str(user.lastActivity) || "Repository synced",
    lastLoginAt: parseFirestoreDateIso(user.lastLoginAt),
    activeSessions: finite(user.activeSessions),
    loginHistory: Array.isArray(user.loginHistory) ? user.loginHistory as StaffMember["loginHistory"] : undefined,
    requiresLogin: user.requiresLogin !== false,
    employmentType: user.employmentType === "contract" ? "contract" : "fixed",
    monthlySalary: finite(user.monthlySalary),
    contractRate: finite(user.contractRate),
    panNumber: str(user.panNumber),
    pfNumber: str(user.pfNumber),
    esiNumber: str(user.esiNumber),
    professionalTaxState: str(user.professionalTaxState),
    tdsSection: user.tdsSection === "194C" || user.tdsSection === "194J" ? user.tdsSection : "salary",
    payrollEstimate: typeof user.payrollEstimate === "object" && user.payrollEstimate ? user.payrollEstimate as StaffMember["payrollEstimate"] : undefined,
  };
}

export function tableDocToPosTable(table: Record<string, unknown>): PosTable {
  const number = str(table.table || table.tableNumber || table.name) || "T01";
  return {
    id: str(table.id),
    table: number,
    name: str(table.name),
    seats: String(num(table.seats || table.capacity, 4)),
    status: posTableStatus(str(table.status)),
    amount: String(num(table.amount)),
    floor: str(table.floor || table.section),
    section: str(table.section),
    description: str(table.description),
    note: str(table.note),
    active: table.active !== false,
    dineInEnabled: table.dineInEnabled !== false,
    qrOrderingEnabled: table.qrOrderingEnabled !== false && Boolean(table.qrToken || table.qrUrl),
    qrToken: str(table.qrToken),
    qrUrl: str(table.qrUrl),
    qrVersion: num(table.qrVersion, 1),
    qrStatus: qrStatus(str(table.qrStatus)),
    qrLastGeneratedAt: parseFirestoreDateIso(table.qrLastGeneratedAt),
    qrExpiresAt: parseFirestoreDateIso(table.qrExpiresAt),
    qrUsageCount: num(table.qrUsageCount),
    currentSessionId: str(table.currentSessionId),
    sessionStatus: sessionStatus(str(table.sessionStatus)),
    sessionCustomerName: str(table.sessionCustomerName),
    sessionCustomerPhone: str(table.sessionCustomerPhone),
    sessionCustomerEmail: str(table.sessionCustomerEmail),
    sessionGuestCount: finite(table.sessionGuestCount),
    sessionCreatedAt: parseFirestoreDateIso(table.sessionCreatedAt),
    sessionExpiresAt: parseFirestoreDateIso(table.sessionExpiresAt),
    sessionTimeoutMinutes: finite(table.sessionTimeoutMinutes),
    sessionIdleTimeoutMinutes: finite(table.sessionIdleTimeoutMinutes),
    lastActivity: parseFirestoreDateIso(table.lastActivity),
    deviceId: str(table.deviceId),
    currentOrderId: str(table.currentOrderId || table.activeKitchenOrderId),
    currentOrderTotal: finite(table.currentOrderTotal),
    billRequestedAt: parseFirestoreDateIso(table.billRequestedAt),
    serviceRequests: Array.isArray(table.serviceRequests) ? table.serviceRequests.map((request) => {
      const item = request as Record<string, unknown>;
      return { id: str(item.id), type: str(item.type), status: serviceStatus(str(item.status)), message: str(item.message), at: parseFirestoreDateIso(item.at) ?? "" };
    }) : [],
    sessionEvents: Array.isArray(table.sessionEvents) ? table.sessionEvents.map((event) => {
      const item = event as Record<string, unknown>;
      return { type: str(item.type), at: parseFirestoreDateIso(item.at) ?? str(item.at), message: str(item.message), deviceId: str(item.deviceId), orderId: str(item.orderId), total: finite(item.total), targetTable: str(item.targetTable) };
    }) : [],
    lastCleanedAt: parseFirestoreDateIso(table.lastCleanedAt),
  };
}

function normalizeFulfillment(value?: string) {
  return value === "dine-in" || value === "parcel" || value === "delivery" ? value : "parcel";
}

function normalizePosOrderType(value: string) {
  return value === "takeaway" || value === "parcel" || value === "delivery" ? value : "dine-in";
}

function tableStatus(value: string): TableOrder["status"] {
  return ["new", "accepted", "occupied", "preparing", "ready", "served", "completed", "cancelled", "billed"].includes(value) ? value as TableOrder["status"] : "new";
}

function paymentStatus(value: string): TableOrder["paymentStatus"] {
  if (value === "authorized") return "partial";
  if (value === "pending" || value === "failed") return "unpaid";
  if (value === "paid" || value === "refunded") return value;
  return "unpaid";
}

function sourceFor(value: string): TableOrder["source"] {
  return ["QR", "Waiter", "POS", "Takeaway", "Parcel", "Delivery"].includes(value) ? value as TableOrder["source"] : "POS";
}

function labelForOrderType(value: string) {
  if (value === "delivery") return "Online";
  if (value === "takeaway") return "Quick Bill";
  if (value === "parcel") return "Parcel";
  return "Dine-in";
}

function foodType(value: string): MenuItem["foodType"] {
  return ["veg", "nonveg", "egg", "vegan", "jain"].includes(value) ? value as MenuItem["foodType"] : undefined;
}

function loyaltyTier(value: string): LoyaltyCustomer["tier"] {
  return ["Silver", "Gold", "VIP"].includes(value) ? value as LoyaltyCustomer["tier"] : "Regular";
}

function staffRole(value: string): StaffMember["role"] {
  return ["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "delivery-staff", "delivery", "accountant", "admin", "inventory-manager"].includes(value) ? value as StaffMember["role"] : "waiter";
}

function posTableStatus(value: string): PosTable["status"] {
  if (["Dining", "Bill requested", "Reserved", "Cleaning", "Inactive"].includes(value)) return value as PosTable["status"];
  if (value === "reserved") return "Reserved";
  if (value === "cleaning") return "Cleaning";
  if (value === "inactive") return "Inactive";
  if (value === "vacant") return "Open";
  if (["occupied", "preparing", "ready", "served"].includes(value)) return "Dining";
  if (value === "billed" || value === "completed") return "Bill requested";
  return "Open";
}

function qrStatus(value: string): PosTable["qrStatus"] {
  if (value === "disabled" || value === "revoked") return value;
  return "enabled";
}

function sessionStatus(value: string): PosTable["sessionStatus"] {
  if (value === "active" || value === "expired" || value === "closed") return value;
  return "none";
}

function serviceStatus(value: string): "open" | "cancelled" | "done" {
  return value === "cancelled" || value === "done" ? value : "open";
}

function first(value: unknown) {
  return Array.isArray(value) ? value.find((item) => typeof item === "string") : undefined;
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function num(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
