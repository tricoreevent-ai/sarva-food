export type OrderClassificationId = "all" | "dine-in" | "parcel" | "delivery" | "online" | "qr" | "scheduled" | "catering" | "cancelled";

export type ClassifiableOrder = {
  source?: unknown;
  channel?: unknown;
  orderType?: unknown;
  fulfillmentType?: unknown;
  type?: unknown;
  status?: unknown;
  tableNumber?: unknown;
  scheduledFor?: unknown;
  scheduledAt?: unknown;
  eventDate?: unknown;
  delay?: { delayed?: boolean; lateMinutes?: number; priority?: string };
  etaMinutes?: unknown;
  createdAt?: unknown;
  priority?: unknown;
};

export type OrderClassificationOption = {
  id: OrderClassificationId;
  label: string;
  count: number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  insight?: string;
};

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

function classificationInsight(id: OrderClassificationId, orders: ClassifiableOrder[], now: number): Pick<OrderClassificationOption, "tone" | "insight"> {
  if (id === "cancelled" && orders.length >= 3) return { tone: "danger", insight: "Review cancellations" };
  if (id === "delivery" && orders.some((order) => delayed(order))) return { tone: "warning", insight: "SLA risk" };
  if (id === "scheduled" && orders.some((order) => dueSoon(order, now))) return { tone: "warning", insight: "Due soon" };
  if (id === "catering" && orders.length > 0) return { tone: "info", insight: "Plan kitchen" };
  if (id === "qr" && orders.length > 0) return { tone: "success", insight: "Table live" };
  if (id === "online" && orders.length >= 4) return { tone: "info", insight: "Batch review" };
  return {};
}

function delayed(order: ClassifiableOrder) {
  return Boolean(order.delay?.delayed || Number(order.delay?.lateMinutes ?? 0) > 0 || order.delay?.priority === "critical" || order.priority === "rush");
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
