export type OrderClassificationId = "all" | "dine-in" | "parcel" | "delivery" | "online" | "qr" | "scheduled" | "catering" | "cancelled";
export type OrderOperationId = "all" | "new" | "kitchen" | "preparing" | "ready" | "serving" | "delivery" | "completed" | "delayed" | "critical" | "pending-payment" | "paid" | "refund" | "cancelled";
export type OrderFilterId = OrderClassificationId | OrderOperationId;

export type ClassifiableOrder = {
  source?: unknown;
  channel?: unknown;
  orderType?: unknown;
  fulfillmentType?: unknown;
  type?: unknown;
  status?: unknown;
  paymentStatus?: unknown;
  payment?: unknown;
  kitchenStatus?: unknown;
  hasKitchenTicket?: unknown;
  tableNumber?: unknown;
  scheduledFor?: unknown;
  scheduledAt?: unknown;
  eventDate?: unknown;
  delay?: { delayed?: boolean; lateMinutes?: number; priority?: string };
  etaMinutes?: unknown;
  createdAt?: unknown;
  priority?: unknown;
};

export type OrderFilterOption<T extends string = string> = {
  id: T;
  label: string;
  count: number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  insight?: string;
};
export type OrderClassificationOption = OrderFilterOption<OrderClassificationId>;
export type OrderOperationOption = OrderFilterOption<OrderOperationId>;

export const defaultOrderClassifications: Array<{ id: OrderClassificationId; label: string }> = [
  { id: "all", label: "All" },
  { id: "dine-in", label: "Dine In" },
  { id: "parcel", label: "Parcel" },
  { id: "delivery", label: "Delivery" },
  { id: "online", label: "Online" },
  { id: "qr", label: "QR" },
  { id: "scheduled", label: "Scheduled" },
  { id: "catering", label: "Catering" },
  { id: "cancelled", label: "Cancelled" },
];
export const orderClassificationIds = defaultOrderClassifications.map((item) => item.id) as OrderClassificationId[];
export const defaultOrderOperations: Array<{ id: OrderOperationId; label: string }> = [
  { id: "all", label: "All States" },
  { id: "new", label: "New" },
  { id: "kitchen", label: "Kitchen" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "serving", label: "Serving" },
  { id: "delivery", label: "Delivery" },
  { id: "completed", label: "Completed" },
  { id: "delayed", label: "Delayed" },
  { id: "critical", label: "Critical" },
  { id: "pending-payment", label: "Pending Payment" },
  { id: "paid", label: "Paid" },
  { id: "refund", label: "Refund" },
  { id: "cancelled", label: "Cancelled" },
];
export const orderOperationIds = defaultOrderOperations.map((item) => item.id) as OrderOperationId[];

export function classifyOrder(order: ClassifiableOrder, now = Date.now()) {
  const set = new Set<OrderClassificationId>(["all"]);
  const source = norm(order.source ?? order.channel);
  const type = norm(order.orderType ?? order.fulfillmentType ?? order.type);
  const status = norm(order.status);
  const table = norm(order.tableNumber);
  const scheduledAt = valueTime(order.scheduledFor ?? order.scheduledAt ?? order.eventDate);

  if (["cancelled", "rejected"].includes(status)) set.add("cancelled");
  if (scheduledAt || type.includes("scheduled")) set.add("scheduled");
  if (source.includes("catering") || type.includes("catering")) set.add("catering");
  if (source === "qr" || source.includes("table-order")) set.add("qr");
  if (source === "website" || source === "web" || source === "mobile" || source === "online" || ["swiggy", "zomato", "magicpin", "ondc", "instagram", "whatsapp"].includes(source)) set.add("online");
  if (type.includes("delivery") || source === "delivery" || ["swiggy", "zomato", "magicpin", "ondc"].includes(source)) set.add("delivery");
  if (type.includes("parcel") || type.includes("takeaway") || source === "parcel" || source === "takeaway") set.add("parcel");
  if (type.includes("dine") || source === "waiter" || source === "qr" || (source === "pos" && table && table !== "direct" && table !== "takeaway")) set.add("dine-in");
  if (!set.has("dine-in") && !set.has("parcel") && !set.has("delivery") && !set.has("catering") && table && table !== "direct") set.add("dine-in");

  if (scheduledAt && scheduledAt > now && scheduledAt - now <= 30 * 60_000) set.add("scheduled");
  return set;
}

export function matchesOrderClassification(order: ClassifiableOrder, id: OrderClassificationId, now = Date.now()) {
  return id === "all" || classifyOrder(order, now).has(id);
}

export function filterOrdersByClassification<T extends ClassifiableOrder>(orders: T[], id: OrderClassificationId, now = Date.now()) {
  return id === "all" ? orders : orders.filter((order) => matchesOrderClassification(order, id, now));
}

export function classifyOrderOperation(order: ClassifiableOrder, now = Date.now()) {
  const set = new Set<OrderOperationId>(["all"]);
  const status = norm(order.status ?? order.kitchenStatus);
  const payment = norm(order.paymentStatus ?? order.payment);
  const primary = classifyOrder(order, now);
  const hasKitchenTicket = order.hasKitchenTicket !== false;

  if (["new", "occupied"].includes(status)) set.add("new");
  if (hasKitchenTicket && ["new", "occupied", "accepted", "preparing", "ready"].includes(status)) set.add("kitchen");
  if (status === "preparing") set.add("preparing");
  if (status === "ready") set.add("ready");
  if (["picked-up", "served", "serving"].includes(status)) set.add("serving");
  if (primary.has("delivery")) set.add("delivery");
  if (["completed", "billed", "delivered"].includes(status)) set.add("completed");
  if (delayed(order, now)) set.add("delayed");
  if (critical(order, now)) set.add("critical");
  if (["unpaid", "pending", "partial", "authorized", "failed", ""].includes(payment) && !["cancelled", "rejected", "completed", "billed"].includes(status)) set.add("pending-payment");
  if (payment === "paid") set.add("paid");
  if (payment === "refunded") set.add("refund");
  if (["cancelled", "rejected"].includes(status)) set.add("cancelled");
  return set;
}

export function matchesOrderOperation(order: ClassifiableOrder, id: OrderOperationId, now = Date.now()) {
  return id === "all" || classifyOrderOperation(order, now).has(id);
}

export function filterOrdersByOperation<T extends ClassifiableOrder>(orders: T[], id: OrderOperationId, now = Date.now()) {
  return id === "all" ? orders : orders.filter((order) => matchesOrderOperation(order, id, now));
}

export function buildOrderClassificationOptions(
  orders: ClassifiableOrder[],
  {
    ids = defaultOrderClassifications.map((item) => item.id),
    now = Date.now(),
    includeZero = true,
  }: { ids?: OrderClassificationId[]; now?: number; includeZero?: boolean } = {},
): OrderClassificationOption[] {
  return defaultOrderClassifications
    .filter((item) => ids.includes(item.id))
    .map((item) => {
      const matching = item.id === "all" ? orders : orders.filter((order) => matchesOrderClassification(order, item.id, now));
      return { ...item, count: matching.length, ...classificationInsight(item.id, matching, now) };
    })
    .filter((item) => includeZero || item.count > 0 || item.id === "all");
}

export function buildOrderOperationOptions(
  orders: ClassifiableOrder[],
  {
    ids = defaultOrderOperations.map((item) => item.id),
    now = Date.now(),
    includeZero = true,
  }: { ids?: OrderOperationId[]; now?: number; includeZero?: boolean } = {},
): OrderOperationOption[] {
  return defaultOrderOperations
    .filter((item) => ids.includes(item.id))
    .map((item) => {
      const matching = item.id === "all" ? orders : orders.filter((order) => matchesOrderOperation(order, item.id, now));
      return { ...item, count: matching.length, ...operationInsight(item.id, matching) };
    })
    .filter((item) => includeZero || item.count > 0 || item.id === "all");
}

export function sortOrdersByOperationalPriority<T extends ClassifiableOrder>(orders: T[], now = Date.now()) {
  return [...orders].sort((first, second) => {
    const priority = operationRank(first, now) - operationRank(second, now);
    if (priority) return priority;
    return valueTime(second.createdAt) - valueTime(first.createdAt);
  });
}

function classificationInsight(id: OrderClassificationId, orders: ClassifiableOrder[], now: number): Pick<OrderClassificationOption, "tone" | "insight"> {
  if (id === "cancelled" && orders.length >= 3) return { tone: "danger", insight: "Review cancellations" };
  if (id === "delivery" && orders.some((order) => delayed(order))) return { tone: "warning", insight: "SLA risk" };
  if (id === "scheduled" && orders.some((order) => dueSoon(order, now))) return { tone: "warning", insight: "Due soon" };
  if (id === "catering" && orders.length > 0) return { tone: "info", insight: "Plan kitchen" };
  if (id === "qr" && orders.length > 0) return { tone: "success", insight: "Table live" };
  if (id === "online" && orders.length >= 4) return { tone: "info", insight: "Batch review" };
  return {};
}

function operationInsight(id: OrderOperationId, orders: ClassifiableOrder[]): Pick<OrderOperationOption, "tone" | "insight"> {
  if (id === "critical" && orders.length) return { tone: "danger", insight: "Act now" };
  if (id === "delayed" && orders.length) return { tone: "warning", insight: "SLA risk" };
  if (id === "ready" && orders.length) return { tone: "success", insight: "Pickup" };
  if (id === "pending-payment" && orders.length) return { tone: "warning", insight: "Bill due" };
  if (id === "refund" && orders.length) return { tone: "danger", insight: "Audit" };
  if (id === "cancelled" && orders.length >= 3) return { tone: "danger", insight: "Review" };
  return {};
}

function operationRank(order: ClassifiableOrder, now: number) {
  const states = classifyOrderOperation(order, now);
  if (states.has("critical")) return 0;
  if (states.has("delayed")) return 1;
  if (states.has("ready")) return 2;
  if (states.has("pending-payment")) return 3;
  if (states.has("new")) return 4;
  if (states.has("preparing")) return 5;
  if (states.has("kitchen")) return 6;
  if (states.has("serving")) return 7;
  if (states.has("delivery")) return 8;
  return 9;
}

function delayed(order: ClassifiableOrder, now = Date.now()) {
  const eta = Number(order.etaMinutes ?? 0);
  const created = valueTime(order.createdAt);
  const lateByEta = Boolean(eta && created && now - created > eta * 60_000);
  return Boolean(order.delay?.delayed || Number(order.delay?.lateMinutes ?? 0) > 0 || order.delay?.priority === "critical" || lateByEta);
}

function critical(order: ClassifiableOrder, now = Date.now()) {
  return Boolean(order.delay?.priority === "critical" || Number(order.delay?.lateMinutes ?? 0) >= 10 || (delayed(order, now) && order.priority === "rush"));
}

function dueSoon(order: ClassifiableOrder, now: number) {
  const time = valueTime(order.scheduledFor ?? order.scheduledAt ?? order.eventDate);
  return Boolean(time && time > now && time - now <= 30 * 60_000);
}

function norm(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function valueTime(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().getTime();
  if (typeof value === "object" && "seconds" in value) return Number((value as { seconds?: number }).seconds ?? 0) * 1000;
  return 0;
}
