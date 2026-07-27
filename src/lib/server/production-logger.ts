import "server-only";

import { recordMonitoringLog } from "@/lib/server/production-monitoring";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SECURITY" | "AUDIT" | "PERFORMANCE" | "PAYMENT" | "QR" | "KITCHEN" | "POS" | "OWNER" | "ADMIN";

const priority: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  PERFORMANCE: 25,
  AUDIT: 30,
  PAYMENT: 30,
  QR: 30,
  KITCHEN: 30,
  POS: 30,
  OWNER: 30,
  ADMIN: 30,
  WARN: 40,
  SECURITY: 45,
  ERROR: 50,
};

const sensitiveKey = /(password|passwd|secret|token|jwt|cookie|authorization|api[-_]?key|otp|card|cvv|pan|private|credential|keySecret|webhookSecret|paymentId|providerPaymentId|razorpay_payment_id|razorpay_signature)/i;
const sensitiveValue = /(Bearer\s+[a-z0-9._-]+|eyJ[a-z0-9._-]+|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

export const productionLogger = {
  debug: (event: string, data?: Record<string, unknown>) => logProduction("DEBUG", event, data),
  info: (event: string, data?: Record<string, unknown>) => logProduction("INFO", event, data),
  warn: (event: string, data?: Record<string, unknown>) => logProduction("WARN", event, data),
  error: (event: string, data?: Record<string, unknown>) => logProduction("ERROR", event, data),
  security: (event: string, data?: Record<string, unknown>) => logProduction("SECURITY", event, data),
  audit: (event: string, data?: Record<string, unknown>) => logProduction("AUDIT", event, data),
  performance: (event: string, data?: Record<string, unknown>) => logProduction("PERFORMANCE", event, data),
  payment: (event: string, data?: Record<string, unknown>) => logProduction("PAYMENT", event, data),
  qr: (event: string, data?: Record<string, unknown>) => logProduction("QR", event, data),
  kitchen: (event: string, data?: Record<string, unknown>) => logProduction("KITCHEN", event, data),
  pos: (event: string, data?: Record<string, unknown>) => logProduction("POS", event, data),
  owner: (event: string, data?: Record<string, unknown>) => logProduction("OWNER", event, data),
  admin: (event: string, data?: Record<string, unknown>) => logProduction("ADMIN", event, data),
};

export function safeErrorName(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

export function safeErrorReason(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message || sensitiveValue.test(message) || /(firebase|firestore|stack|credential|private|secret|token)/i.test(message)) return undefined;
  return message.replace(/\s+/g, " ").slice(0, 160);
}

export function maskLogData(data: Record<string, unknown>) {
  return sanitize(data) as Record<string, unknown>;
}

function logProduction(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  if (!shouldLog(level)) return;
  const payload = sanitize({ level, event, ...data, timestamp: new Date().toISOString() });
  recordMonitoringLog(level, event, data);
  if (level === "ERROR" || level === "SECURITY" || level === "PAYMENT") return console.error("[food-gedi]", payload);
  if (level === "WARN") return console.warn("[food-gedi]", payload);
  console.info("[food-gedi]", payload);
}

function shouldLog(level: LogLevel) {
  const configured = String(process.env.NAMMUDE_LOG_LEVEL || process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "INFO" : "DEBUG")).toUpperCase() as LogLevel;
  return priority[level] >= (priority[configured] ?? priority.INFO);
}

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
  if (sensitiveKey.test(key)) return "[masked]";
  if (value instanceof Error) return { name: value.name };
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return sensitiveValue.test(value) ? "[masked]" : value.slice(0, 500);
  if (depth > 5) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitize(item, key, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, depth + 1)])
      .filter(([, entryValue]) => entryValue !== undefined),
  );
}
