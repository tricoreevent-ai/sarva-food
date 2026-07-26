import type { DemoOrder, TableOrder } from "@/lib/types";

export type LiveOperationalOrder = TableOrder & {
  canonicalOrderId?: string;
  canonicalStatus?: DemoOrder["status"];
  hasKitchenTicket?: boolean;
  paymentTimeline?: unknown[];
  auditTimeline?: unknown[];
  splitBills?: unknown[];
  corrections?: unknown[];
  paymentLock?: unknown;
  paidAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  tipWaiterId?: string;
  tipWaiterName?: string;
  mergedOrderIds?: string[];
  mergedIntoOrderId?: string;
};

type ExtendedDemoOrder = DemoOrder & {
  paymentTimeline?: unknown[];
  auditTimeline?: unknown[];
  statusHistory?: TableOrder["statusHistory"];
  splitBills?: unknown[];
  corrections?: unknown[];
  paymentLock?: unknown;
  paidAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  tipWaiterId?: string;
  tipWaiterName?: string;
  mergedOrderIds?: string[];
  mergedIntoOrderId?: string;
  tableNumber?: string;
  waiterName?: string;
};

export function mergeLiveOperationalOrders(orders: DemoOrder[], kitchenOrders: TableOrder[]) {
  const ordersByKitchen = new Map(orders.filter((order) => order.kitchenOrderId).map((order) => [order.kitchenOrderId, order]));
  const linkedKitchenIds = new Set(kitchenOrders.map((order) => order.id));
  const merged = kitchenOrders.map((order) => mergeKitchenOrder(order, ordersByKitchen.get(order.id)));
  const orderOnly = orders
    .filter(isActiveDemoOrder)
    .filter((order) => !order.kitchenOrderId || !linkedKitchenIds.has(order.kitchenOrderId))
    .map(orderToLiveOperationalOrder);
  return [...merged, ...orderOnly].sort(newestFirst);
}

export function isLiveTerminalStatus(status: string) {
  return ["delivered", "completed", "cancelled", "rejected", "billed"].includes(status);
}

export function isActiveDemoOrder(order: DemoOrder) {
  return !isLiveTerminalStatus(order.status);
}

export function tableStatusForOrder(status: DemoOrder["status"]): TableOrder["status"] {
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "served") return "served";
  if (status === "completed" || status === "delivered") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}

export function serviceStatusForKitchenOrder(kitchenStatus: TableOrder["status"], orderStatus?: DemoOrder["status"], mergedIntoOrderId?: string): TableOrder["status"] {
  if (mergedIntoOrderId && !["completed", "cancelled", "billed"].includes(kitchenStatus)) return kitchenStatus;
  if (orderStatus === "served") return "served";
  if (orderStatus === "completed" || orderStatus === "delivered") return "completed";
  if (orderStatus === "cancelled" || orderStatus === "rejected") return "cancelled";
  return kitchenStatus;
}

function mergeKitchenOrder(order: TableOrder, canonical?: DemoOrder): LiveOperationalOrder {
  const extended = canonical as ExtendedDemoOrder | undefined;
  return {
    ...order,
    orderNumber: canonical?.orderNumber ?? order.orderNumber,
    displayOrderNumber: canonical?.displayOrderNumber ?? order.displayOrderNumber,
    invoiceNumber: canonical?.invoiceNumber ?? order.invoiceNumber,
    billNumber: canonical?.billNumber ?? order.billNumber,
    canonicalOrderId: canonical?.id,
    canonicalStatus: canonical?.status,
    hasKitchenTicket: true,
    status: serviceStatusForKitchenOrder(order.status, canonical?.status, extended?.mergedIntoOrderId),
    paymentStatus: paymentStateForOrder(canonical) ?? order.paymentStatus,
    total: canonical?.totals.total ?? order.total,
    customerName: canonical?.customer.name || order.customerName,
    customerPhone: canonical?.customer.phone || order.customerPhone,
    paymentTimeline: extended?.paymentTimeline,
    auditTimeline: extended?.auditTimeline,
    statusHistory: extended?.statusHistory ?? order.statusHistory,
    splitBills: extended?.splitBills,
    corrections: extended?.corrections,
    paymentLock: extended?.paymentLock,
    paidAmount: extended?.paidAmount,
    tipAmount: extended?.tipAmount,
    tipMethod: extended?.tipMethod,
    tipWaiterId: extended?.tipWaiterId,
    tipWaiterName: extended?.tipWaiterName,
    mergedOrderIds: extended?.mergedOrderIds,
    mergedIntoOrderId: extended?.mergedIntoOrderId,
  };
}

function orderToLiveOperationalOrder(order: DemoOrder): LiveOperationalOrder {
  const extended = order as ExtendedDemoOrder;
  const orderType = order.fulfillmentType === "delivery" ? "delivery" : order.fulfillmentType === "dine-in" ? "dine-in" : "parcel";
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    displayOrderNumber: order.displayOrderNumber,
    invoiceNumber: order.invoiceNumber,
    billNumber: order.billNumber,
    canonicalOrderId: order.id,
    canonicalStatus: order.status,
    hasKitchenTicket: false,
    tableNumber: extended.tableNumber || (order.fulfillmentType === "dine-in" ? "Dine-in" : order.fulfillmentType === "delivery" ? "Online" : "Parcel"),
    source: order.channel === "QR" ? "QR" : order.fulfillmentType === "delivery" ? "Delivery" : order.fulfillmentType === "parcel" ? "Parcel" : "POS",
    orderType,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    deliveryAddress: order.customer.address,
    scheduledFor: order.scheduledFor,
    lines: order.lines,
    status: tableStatusForOrder(order.status),
    priority: "normal",
    paymentStatus: paymentStateForOrder(order),
    createdAt: order.createdAt,
    etaMinutes: order.prepEstimateMinutes ?? 12,
    total: order.totals.total,
    waiterName: extended.waiterName,
    paymentTimeline: extended.paymentTimeline,
    auditTimeline: extended.auditTimeline,
    statusHistory: extended.statusHistory,
    splitBills: extended.splitBills,
    corrections: extended.corrections,
    paymentLock: extended.paymentLock,
    paidAmount: extended.paidAmount,
    tipAmount: extended.tipAmount,
    tipMethod: extended.tipMethod,
    tipWaiterId: extended.tipWaiterId,
    tipWaiterName: extended.tipWaiterName,
    mergedOrderIds: extended.mergedOrderIds,
    mergedIntoOrderId: extended.mergedIntoOrderId,
  };
}

function paymentStateForOrder(order?: DemoOrder): TableOrder["paymentStatus"] | undefined {
  if (!order?.paymentStatus) return undefined;
  if (["paid", "partial", "refunded", "pending", "authorized", "failed"].includes(order.paymentStatus)) return order.paymentStatus;
  return undefined;
}

function newestFirst(first: TableOrder, second: TableOrder) {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt);
}
