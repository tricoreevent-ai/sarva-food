import "server-only";

import { productionLogger, safeErrorName, safeErrorReason } from "@/lib/server/production-logger";

const allowed = new Set([
  "event",
  "requestId",
  "correlationId",
  "traceId",
  "transactionId",
  "restaurantId",
  "tenantId",
  "userId",
  "orderId",
  "kitchenOrderId",
  "table",
  "action",
  "status",
  "statusCode",
  "paymentStatus",
  "role",
  "method",
  "path",
  "durationMs",
  "outcome",
  "reason",
  "errorName",
]);

export function logOperationalEvent(event: string, data: Record<string, unknown> = {}) {
  productionLogger.audit(event, sanitize({ event, ...data }));
}

export function logOperationalFailure(event: string, error: unknown, data: Record<string, unknown> = {}) {
  productionLogger.error(event, sanitize({
    event,
    ...data,
    outcome: "failed",
    errorName: safeErrorName(error),
    reason: safeErrorReason(error),
  }));
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => allowed.has(key) && value !== undefined && value !== ""));
}
