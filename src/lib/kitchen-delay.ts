import type { OrderStatus, TableOrder, TableOrderStatus } from "@/lib/types";
import { defaultOrderDelayThresholdMinutes, normalizeOrderDelayThreshold } from "@/lib/order-delay-settings";

type DelayStatus = TableOrderStatus | OrderStatus | string;
type StatusEntry = { status?: DelayStatus; foodStatus?: DelayStatus; at?: unknown };

export type DelayPriority = "normal" | "medium" | "high" | "critical";

export type DelayState = {
  delayed: boolean;
  lateMinutes: number;
  elapsedMinutes: number;
  stageMinutes: number;
  etaMinutes: number;
  priority: DelayPriority;
  elapsedLabel: string;
};

type DelayInput = {
  status: DelayStatus;
  createdAt?: string;
  etaMinutes?: number;
  prepEstimateMinutes?: number;
  priority?: "normal" | "rush" | string;
  statusHistory?: StatusEntry[];
};
type DelayOptions = {
  orderDelayThresholdMinutes?: number;
};

const terminalStatuses = new Set(["completed", "cancelled", "billed", "delivered", "rejected", "served"]);

export function getKitchenDelay(order: DelayInput, now = Date.now(), options: DelayOptions = {}): DelayState {
  const etaMinutes = Math.max(1, Math.round(Number(order.etaMinutes ?? order.prepEstimateMinutes ?? 12)));
  const thresholdMinutes = normalizeOrderDelayThreshold(options.orderDelayThresholdMinutes ?? defaultOrderDelayThresholdMinutes);
  const createdMs = dateMs(order.createdAt);
  const elapsedMinutes = minutesBetween(createdMs, now);
  const status = String(order.status ?? "");
  const stageStartedMs = status === "ready" ? statusMs(order.statusHistory, "ready") ?? createdMs : status === "preparing" ? statusMs(order.statusHistory, "preparing") ?? createdMs : status === "accepted" ? statusMs(order.statusHistory, "accepted") ?? createdMs : createdMs;
  const stageMinutes = minutesBetween(stageStartedMs, now);
  const measuredMinutes = status === "ready" ? stageMinutes : elapsedMinutes;
  const limitMinutes = status === "ready" ? thresholdMinutes : etaMinutes;
  const lateMinutes = terminalStatuses.has(status) ? 0 : Math.max(0, measuredMinutes - limitMinutes);
  const delayed = lateMinutes > 0;
  const ratio = measuredMinutes / etaMinutes;
  const priority = priorityFor({ delayed, ratio, rush: order.priority === "rush" });
  return {
    delayed,
    lateMinutes,
    elapsedMinutes,
    stageMinutes,
    etaMinutes,
    priority,
    elapsedLabel: elapsedLabel(status, status === "ready" || status === "preparing" ? stageMinutes : elapsedMinutes),
  };
}

export function delaySortRank(order: TableOrder, now = Date.now(), options: DelayOptions = {}) {
  const delay = getKitchenDelay(order, now, options);
  return { criticality: priorityRank(delay.priority), lateMinutes: delay.lateMinutes, etaMinutes: delay.etaMinutes };
}

export function priorityRank(priority: DelayPriority) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function priorityFor({ delayed, ratio, rush }: { delayed: boolean; ratio: number; rush: boolean }): DelayPriority {
  if (ratio >= 2) return "critical";
  if (ratio >= 1.5 || rush) return "high";
  if (delayed) return "medium";
  return "normal";
}

function elapsedLabel(status: string, minutes: number) {
  if (status === "preparing") return `Preparing ${minutes} min`;
  if (status === "ready") return `Ready for ${minutes} min`;
  if (status === "accepted") return `Accepted ${minutes} min`;
  return `Placed ${minutes} min ago`;
}

function statusMs(history: StatusEntry[] | undefined, status: string) {
  return [...(history ?? [])]
    .reverse()
    .map((entry) => (entry.status === status || entry.foodStatus === status ? dateMs(entry.at) : 0))
    .find(Boolean);
}

function dateMs(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function minutesBetween(from: number, to: number) {
  return from ? Math.max(0, Math.floor((to - from) / 60000)) : 0;
}
