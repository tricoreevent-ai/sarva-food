import type { DemoOrder, TableOrder } from "@/lib/types";

export type TimelineEntry = Record<string, unknown>;
type SplitBillRecord = { id?: string; customerName?: string; amount?: number; method?: string; basis?: string; itemId?: string; quantity?: number; percent?: number; receipt?: boolean; note?: string; at?: unknown };
type BillCorrectionRecord = { version?: number; label?: string; at?: unknown; reason?: string; before?: Record<string, unknown>; after?: Record<string, unknown>; diff?: Record<string, unknown>; user?: string; role?: string; terminal?: string };
type PaymentLockRecord = { locked?: boolean; startedAt?: unknown; by?: string; role?: string; method?: string; amount?: number; reason?: string; unlockedAt?: unknown };

export type OperationalOrder = TableOrder & {
  canonicalOrderId?: string;
  canonicalStatus?: DemoOrder["status"];
  hasKitchenTicket?: boolean;
  paymentTimeline?: TimelineEntry[];
  auditTimeline?: TimelineEntry[];
  statusHistory?: TimelineEntry[];
  splitBills?: SplitBillRecord[];
  corrections?: BillCorrectionRecord[];
  paymentLock?: PaymentLockRecord;
  paidAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  tipWaiterId?: string;
  tipWaiterName?: string;
  mergedOrderIds?: string[];
  mergedIntoOrderId?: string;
};

export function buildOperationalOrders(orders: DemoOrder[], kitchenOrders: TableOrder[]): OperationalOrder[] {
  const ordersByKitchen = new Map(orders.filter((order) => order.kitchenOrderId).map((order) => [order.kitchenOrderId, order]));
  const linkedKitchenIds = new Set(kitchenOrders.map((order) => order.id));
  const merged = kitchenOrders.map((order) => {
    const canonical = ordersByKitchen.get(order.id);
    return {
      ...order,
      orderNumber: canonical?.orderNumber ?? order.orderNumber,
      displayOrderNumber: canonical?.displayOrderNumber ?? order.displayOrderNumber,
      invoiceNumber: canonical?.invoiceNumber ?? order.invoiceNumber,
      billNumber: canonical?.billNumber ?? order.billNumber,
      canonicalOrderId: canonical?.id,
      canonicalStatus: canonical?.status,
      hasKitchenTicket: true,
      status: serviceStatusForKitchenOrder(order.status, canonical?.status, (canonical as ExtendedDemoOrder | undefined)?.mergedIntoOrderId),
      paymentStatus: paymentStateForOrder(canonical) ?? order.paymentStatus,
      total: canonical?.totals.total ?? order.total,
      customerName: canonical?.customer.name || order.customerName,
      customerPhone: canonical?.customer.phone || order.customerPhone,
      paymentTimeline: (canonical as ExtendedDemoOrder | undefined)?.paymentTimeline,
      auditTimeline: (canonical as ExtendedDemoOrder | undefined)?.auditTimeline,
      statusHistory: (canonical as ExtendedDemoOrder | undefined)?.statusHistory ?? order.statusHistory,
      splitBills: (canonical as ExtendedDemoOrder | undefined)?.splitBills,
      corrections: (canonical as ExtendedDemoOrder | undefined)?.corrections,
      paymentLock: (canonical as ExtendedDemoOrder | undefined)?.paymentLock,
      paidAmount: (canonical as ExtendedDemoOrder | undefined)?.paidAmount,
      tipAmount: (canonical as ExtendedDemoOrder | undefined)?.tipAmount,
      tipMethod: (canonical as ExtendedDemoOrder | undefined)?.tipMethod,
      tipWaiterId: (canonical as ExtendedDemoOrder | undefined)?.tipWaiterId,
      tipWaiterName: (canonical as ExtendedDemoOrder | undefined)?.tipWaiterName,
      mergedOrderIds: (canonical as ExtendedDemoOrder | undefined)?.mergedOrderIds,
      mergedIntoOrderId: (canonical as ExtendedDemoOrder | undefined)?.mergedIntoOrderId,
    } satisfies OperationalOrder;
  });
  const orderOnly = orders
    .filter((order) => isActiveDemoOrder(order))
    .filter((order) => !order.kitchenOrderId || !linkedKitchenIds.has(order.kitchenOrderId))
    .map(orderToOperationalOrder);
  return [...merged, ...orderOnly].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function orderToOperationalOrder(order: DemoOrder): OperationalOrder {
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
    source: order.channel === "QR" ? "QR" : order.channel === "Web" ? "Website" : order.channel === "Catering" ? "Catering" : order.channel,
    orderType,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    deliveryAddress: order.customer.address,
    waiterName: extended.waiterName,
    scheduledFor: order.scheduledFor,
    lines: order.lines,
    status: tableStatusForOrder(order.status),
    priority: "normal",
    paymentStatus: paymentStateForOrder(order),
    createdAt: order.createdAt,
    etaMinutes: order.prepEstimateMinutes ?? 12,
    total: order.totals.total,
    paymentTimeline: (order as ExtendedDemoOrder).paymentTimeline,
    auditTimeline: (order as ExtendedDemoOrder).auditTimeline,
    statusHistory: (order as ExtendedDemoOrder).statusHistory,
    splitBills: (order as ExtendedDemoOrder).splitBills,
    corrections: (order as ExtendedDemoOrder).corrections,
    paymentLock: (order as ExtendedDemoOrder).paymentLock,
    paidAmount: (order as ExtendedDemoOrder).paidAmount,
    tipAmount: (order as ExtendedDemoOrder).tipAmount,
    tipMethod: (order as ExtendedDemoOrder).tipMethod,
    tipWaiterId: (order as ExtendedDemoOrder).tipWaiterId,
    tipWaiterName: (order as ExtendedDemoOrder).tipWaiterName,
    mergedOrderIds: (order as ExtendedDemoOrder).mergedOrderIds,
    mergedIntoOrderId: (order as ExtendedDemoOrder).mergedIntoOrderId,
  };
}

export type ExtendedDemoOrder = DemoOrder & OperationalOrder;

export function isOperationalTerminalStatus(status: string) {
  return ["delivered", "completed", "cancelled", "rejected", "billed"].includes(status);
}

export function isActiveDemoOrder(order: DemoOrder) {
  return !isOperationalTerminalStatus(order.status);
}

export function tableStatusForOrder(status: DemoOrder["status"]): TableOrder["status"] {
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "picked-up") return "picked-up";
  if (status === "ready") return "ready";
  if (status === "served") return "served";
  if (status === "completed" || status === "delivered") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}

export function serviceStatusForKitchenOrder(kitchenStatus: TableOrder["status"], orderStatus?: DemoOrder["status"], mergedIntoOrderId?: string): TableOrder["status"] {
  if (mergedIntoOrderId && !["completed", "cancelled", "billed"].includes(kitchenStatus)) return kitchenStatus;
  if (orderStatus === "picked-up") return "picked-up";
  if (orderStatus === "served") return "served";
  if (orderStatus === "completed" || orderStatus === "delivered") return "completed";
  if (orderStatus === "cancelled" || orderStatus === "rejected") return "cancelled";
  return kitchenStatus;
}

function paymentStateForOrder(order?: DemoOrder): TableOrder["paymentStatus"] | undefined {
  if (!order?.paymentStatus) return undefined;
  if (["paid", "partial", "refunded", "pending", "authorized", "failed"].includes(order.paymentStatus)) return order.paymentStatus;
  return undefined;
}
