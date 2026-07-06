import "server-only";

const allowed = new Set([
  "event",
  "requestId",
  "restaurantId",
  "tenantId",
  "orderId",
  "kitchenOrderId",
  "action",
  "status",
  "paymentStatus",
  "role",
  "durationMs",
  "outcome",
  "reason",
  "errorName",
]);

export function logOperationalEvent(event: string, data: Record<string, unknown> = {}) {
  console.info("[operational]", sanitize({ event, ...data }));
}

export function logOperationalFailure(event: string, error: unknown, data: Record<string, unknown> = {}) {
  console.error("[operational]", sanitize({
    event,
    ...data,
    outcome: "failed",
    errorName: error instanceof Error ? error.name : typeof error,
    reason: error instanceof Error ? safeReason(error.message) : undefined,
  }));
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => allowed.has(key) && value !== undefined && value !== ""));
}

function safeReason(value: string) {
  if (/(secret|token|private|credential|password|stack|firebase|firestore)/i.test(value)) return undefined;
  return value.slice(0, 120);
}
