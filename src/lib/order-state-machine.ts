import type { KitchenOrderStatus, OrderDoc, OrderStatus, PaymentStatus } from "@/types/firebase";

type OrderLike = {
  status?: OrderStatus;
  foodStatus?: KitchenOrderStatus;
  paymentStatus?: PaymentStatus;
  total?: number;
  paidAmount?: number;
  paymentLock?: { locked?: boolean } | Record<string, unknown>;
};

const orderFlow: OrderStatus[] = ["draft", "new", "accepted", "preparing", "ready", "picked-up", "served", "delivered", "completed"];
const kitchenFlow: KitchenOrderStatus[] = ["new", "accepted", "preparing", "ready", "served", "completed"];
const terminalOrders = new Set<OrderStatus>(["cancelled", "rejected"]);
const billClosedOrders = new Set<OrderStatus>(["delivered", "completed"]);
const activePaymentStatuses = new Set<PaymentStatus>(["authorized", "partial", "paid"]);

export function normalizeOperationalOrderState(order: OrderLike) {
  const status = order.status ?? "new";
  const foodStatus = order.foodStatus ?? orderStatusToFoodStatus(status);
  const paymentStatus = order.paymentStatus ?? "pending";
  const paidAmount = Number(order.paidAmount ?? (paymentStatus === "paid" ? order.total ?? 0 : 0));
  const paymentStarted = Boolean((order.paymentLock as { locked?: boolean } | undefined)?.locked);
  return { status, foodStatus, paymentStatus, paidAmount, paymentStarted };
}

export function assertLegalOrderTransition(order: OrderLike, next: OrderStatus) {
  const { status, paymentStatus, paymentStarted } = normalizeOperationalOrderState(order);
  if (status === next) return;
  if (terminalOrders.has(status)) throw new Error(`Invalid order status transition from ${status} to ${next}.`);
  if (billClosedOrders.has(status) && !billClosedOrders.has(next)) throw new Error(`Invalid order status transition from ${status} to ${next}.`);
  if (paymentStatus === "refunded" && next !== "cancelled") throw new Error("Refunded orders cannot move back to active service.");
  if (paymentStatus === "paid" && isEarlierOrderState(status, next)) throw new Error(`Invalid order status transition from paid ${status} to ${next}.`);
  if (next === "cancelled" || next === "rejected") {
    if (activePaymentStatuses.has(paymentStatus) || paymentStarted) throw new Error("Paid or payment-started orders cannot be cancelled without refund.");
    return;
  }
  if (next === "completed" && paymentStatus !== "paid") throw new Error("Full payment is required before completing the order.");
  if (!isNextOrderState(status, next)) throw new Error(`Invalid order status transition from ${status} to ${next}.`);
}

export function assertLegalKitchenTransition(current: KitchenOrderStatus, next: KitchenOrderStatus) {
  if (current === next) return;
  if (current === "cancelled") throw new Error(`Invalid kitchen status transition from ${current} to ${next}.`);
  if (next === "cancelled") {
    if (current === "completed") throw new Error(`Invalid kitchen status transition from ${current} to ${next}.`);
    return;
  }
  const currentIndex = kitchenFlow.indexOf(current);
  const nextIndex = kitchenFlow.indexOf(next);
  if (currentIndex < 0 || nextIndex < 0) throw new Error(`Invalid kitchen status transition from ${current} to ${next}.`);
  if (nextIndex !== currentIndex + 1) throw new Error(`Invalid kitchen status transition from ${current} to ${next}.`);
}

export function assertCanStartPayment(order: OrderLike) {
  const { status, paymentStatus, paymentStarted } = normalizeOperationalOrderState(order);
  if (terminalOrders.has(status)) throw new Error("Cancelled orders cannot be paid.");
  if (paymentStatus === "paid") throw new Error("Payment has already been collected.");
  if (paymentStatus === "refunded") throw new Error("Refunded orders cannot be paid again.");
  if (paymentStarted) throw new Error("Order currently being modified.");
}

export function assertCanRecordPayment(order: OrderLike) {
  const { status, paymentStatus } = normalizeOperationalOrderState(order);
  if (terminalOrders.has(status)) throw new Error("Cancelled orders cannot be paid.");
  if (paymentStatus === "paid") throw new Error("Payment has already been collected.");
  if (paymentStatus === "refunded") throw new Error("Refunded orders cannot be paid again.");
}

export function assertCanRefund(order: OrderLike) {
  const { paymentStatus, paidAmount } = normalizeOperationalOrderState(order);
  if (paymentStatus === "refunded" || paidAmount <= 0) throw new Error("A valid refund amount is required.");
}

export function assertCanCorrectBill(order: Pick<OrderDoc, "status">) {
  if (!billClosedOrders.has(order.status)) throw new Error("Only completed bills can be corrected.");
}

export function statusEventForTransition(status: OrderStatus) {
  if (status === "accepted") return "kitchen_accepted";
  if (status === "ready") return "kitchen_ready";
  if (status === "completed" || status === "delivered") return "completion";
  return "order_status";
}

export function orderStatusToFoodStatus(status: OrderStatus): KitchenOrderStatus {
  if (status === "draft") return "new";
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "picked-up") return "ready";
  if (status === "served" || status === "delivered") return "served";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}

function isNextOrderState(current: OrderStatus, next: OrderStatus) {
  const currentIndex = orderFlow.indexOf(current);
  const nextIndex = orderFlow.indexOf(next);
  if (currentIndex < 0 || nextIndex < 0) return false;
  if (current === "ready" && next === "served") return true;
  if (current === "served" && (next === "completed" || next === "delivered")) return true;
  return nextIndex === currentIndex + 1;
}

function isEarlierOrderState(current: OrderStatus, next: OrderStatus) {
  const currentIndex = orderFlow.indexOf(current);
  const nextIndex = orderFlow.indexOf(next);
  return currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex;
}
