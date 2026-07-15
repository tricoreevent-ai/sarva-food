import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MonitoringSeverity = "info" | "warning" | "error" | "critical";
export type MonitoringStatus = "pass" | "fail" | "warn" | "manual";

export type MonitoringLog = {
  id: string;
  timestamp: string;
  severity: MonitoringSeverity;
  level: string;
  event: string;
  module: string;
  provider?: string;
  userId?: string;
  orderId?: string;
  restaurantId?: string;
  api?: string;
  statusCode?: number;
  durationMs?: number;
  message?: string;
  details?: Record<string, unknown>;
};

export type MonitoringError = {
  id: string;
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
  severity: MonitoringSeverity;
  category: string;
  module: string;
  provider?: string;
  event: string;
  name?: string;
  message: string;
  path?: string;
  api?: string;
  userId?: string;
  orderId?: string;
  restaurantId?: string;
  statusCode?: number;
  durationMs?: number;
};

export type MonitoringPerformance = {
  id: string;
  timestamp: string;
  event: string;
  route?: string;
  path?: string;
  method?: string;
  metricName?: string;
  metricValue?: number;
  durationMs?: number;
  status?: number;
  ok?: boolean;
  rating?: string;
};

export type MonitoringContext = {
  applicationStatus: string;
  applicationVersion: string;
  commitSha: string;
  deploymentEnvironment: string;
  nodeVersion: string;
  responseTimeMs: number;
  firestoreStatus: string;
  storageStatus: string;
  smtpStatus: string;
  cloudinaryStatus: string;
  googleOAuthConfigured: boolean;
  mapboxConfigured: boolean;
  razorpayStatus: string;
  razorpayWebhookConfigured: boolean;
  pushConfigured: boolean;
  whatsappConfigured: boolean;
  smsConfigured: boolean;
  memoryUsage?: {
    rssMb?: number;
    heapTotalMb?: number;
    heapUsedMb?: number;
  };
  cpuEstimation?: {
    loadAverage?: number[];
    availableParallelism?: number;
  };
  openOrders?: number | null;
  kitchenLoad?: number | null;
  notificationQueue?: number | null;
  pendingQueue?: number | null;
  realtimeStatus?: string;
  backgroundJobsStatus?: string;
};

type Store = {
  seq: number;
  errors: MonitoringError[];
  logs: MonitoringLog[];
  performance: MonitoringPerformance[];
};

const limit = 100;
const globalKey = "__nammudeProductionMonitoring";
const sensitive = /(password|secret|token|credential|authorization|cookie|private|otp|signature|api[-_]?key|card|cvv|keySecret|webhookSecret)/i;

type MonitorGlobal = typeof globalThis & {
  __nammudeProductionMonitoring?: Store;
};

export function recordMonitoringLog(level: string, event: string, data: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const entry: MonitoringLog = {
    id: nextId("log"),
    timestamp: now,
    severity: severityForLevel(level),
    level,
    event,
    module: stringValue(data.module) || moduleFromEvent(event),
    provider: stringValue(data.provider) || providerFromEvent(event),
    userId: stringValue(data.userId),
    orderId: stringValue(data.orderId),
    restaurantId: stringValue(data.restaurantId) || stringValue(data.tenantId),
    api: stringValue(data.path),
    statusCode: numberValue(data.statusCode),
    durationMs: numberValue(data.durationMs),
    message: stringValue(data.reason) || stringValue(data.message),
    details: sanitizeRecord(data),
  };
  push(store().logs, entry);
  if (entry.severity === "error" || entry.severity === "critical") {
    recordMonitoringError({
      event,
      severity: entry.severity,
      module: entry.module,
      provider: entry.provider,
      name: stringValue(data.errorName),
      message: entry.message || event,
      path: entry.api,
      api: entry.api,
      userId: entry.userId,
      orderId: entry.orderId,
      restaurantId: entry.restaurantId,
      statusCode: entry.statusCode,
      durationMs: entry.durationMs,
    });
  }
}

export function recordMonitoringError(input: Partial<MonitoringError> & { event: string; message?: string }) {
  const now = new Date().toISOString();
  const area = input.module || moduleFromEvent(input.event);
  const message = safeText(input.message || input.name || input.event, 220);
  const fingerprint = [area, input.provider || providerFromEvent(input.event), input.name, input.event, input.path, message].filter(Boolean).join("|");
  const current = store();
  const existingIndex = current.errors.findIndex((entry) => entry.fingerprint === fingerprint);
  if (existingIndex >= 0) {
    const existing = current.errors[existingIndex];
    const next = {
      ...existing,
      count: existing.count + 1,
      lastSeen: now,
      severity: strongerSeverity(existing.severity, input.severity || existing.severity),
      statusCode: input.statusCode ?? existing.statusCode,
      durationMs: input.durationMs ?? existing.durationMs,
    };
    current.errors.splice(existingIndex, 1);
    current.errors.unshift(next);
    return next;
  }

  const entry: MonitoringError = {
    id: nextId("err"),
    fingerprint,
    firstSeen: now,
    lastSeen: now,
    count: 1,
    severity: input.severity || inferErrorSeverity(input.event, message),
    category: errorCategory(input.event, message),
    module: area,
    provider: input.provider || providerFromEvent(input.event),
    event: input.event,
    name: input.name,
    message,
    path: input.path,
    api: input.api,
    userId: input.userId,
    orderId: input.orderId,
    restaurantId: input.restaurantId,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
  };
  push(current.errors, entry);
  return entry;
}

export function recordMonitoringPerformance(input: Omit<MonitoringPerformance, "id" | "timestamp">) {
  const entry: MonitoringPerformance = {
    id: nextId("perf"),
    timestamp: new Date().toISOString(),
    ...input,
    route: input.route ? safeText(input.route, 180) : undefined,
    path: input.path ? safeText(input.path, 180) : undefined,
  };
  push(store().performance, entry);
  return entry;
}

export function recordClientMonitoringSignal(input: {
  event?: string;
  path?: string;
  payload?: Record<string, unknown>;
}) {
  const event = safeText(input.event || "client_signal", 80);
  const payload = sanitizeRecord(input.payload || {});
  const path = safeText(stringValue(payload.path) || input.path || "", 180);
  if (event === "api_request" || event === "route_performance" || event === "web_vital") {
    recordMonitoringPerformance({
      event,
      route: safeText(stringValue(payload.route) || path, 180),
      path: stringValue(payload.path),
      method: stringValue(payload.method),
      metricName: stringValue(payload.metricName),
      metricValue: numberValue(payload.metricValue),
      durationMs: numberValue(payload.durationMs),
      status: numberValue(payload.status),
      ok: booleanValue(payload.ok),
      rating: stringValue(payload.metricRating),
    });
  }

  if (/error|failed|exception|rejection/i.test(event) || payload.ok === false) {
    recordMonitoringError({
      event,
      module: moduleFromPath(path),
      provider: providerFromEvent(`${event} ${path}`),
      message: stringValue(payload.error) || stringValue(payload.reason) || event,
      path,
      api: stringValue(payload.path),
      statusCode: numberValue(payload.status),
      durationMs: numberValue(payload.durationMs),
      severity: event.includes("payment") ? "critical" : "error",
    });
  }
}

export function getProductionMonitoringSnapshot(context: MonitoringContext, options: { restaurantId?: string } = {}) {
  const current = store();
  const errors = filterByRestaurant(current.errors, options.restaurantId);
  const logs = filterByRestaurant(current.logs, options.restaurantId);
  const performance = current.performance.slice(0, limit);
  const slowApi = performance.filter((entry) => entry.event === "api_request" && (entry.ok === false || (entry.durationMs ?? 0) > 2500));
  const slowRenders = performance.filter((entry) => entry.event === "route_performance" && (entry.durationMs ?? 0) > 1200);
  const webVitals = performance.filter((entry) => entry.event === "web_vital").slice(0, 20);
  const alerts = buildAlerts(context, errors, slowApi);

  return {
    generatedAt: new Date().toISOString(),
    context,
    summary: {
      errors: errors.length,
      criticalErrors: errors.filter((entry) => entry.severity === "critical").length,
      logs: logs.length,
      slowApi: slowApi.length,
      slowRenders: slowRenders.length,
      alerts: alerts.length,
    },
    alerts,
    errors,
    logs: logs.slice(0, limit),
    performance: {
      recent: performance,
      slowApi,
      slowRenders,
      webVitals,
      fps: lastMetric(performance, "FPS"),
      memory: context.memoryUsage,
      cpu: context.cpuEstimation,
      hydrationTime: lastMetric(performance, "hydration"),
      pageLoad: lastMetric(performance, "page_load"),
      realtimeLatency: lastMetric(performance, "realtime_latency"),
      sseStatus: context.realtimeStatus || "route-owned",
      largestBundles: readBundleEvidence(),
    },
    selfTest: buildSelfTest(context),
  };
}

function buildAlerts(context: MonitoringContext, errors: MonitoringError[], slowApi: MonitoringPerformance[]) {
  const alerts: Array<{ id: string; severity: MonitoringSeverity; title: string; detail: string }> = [];
  const add = (id: string, severity: MonitoringSeverity, title: string, detail: string) => alerts.push({ id, severity, title, detail });
  if (context.deploymentEnvironment !== "production") add("env", "critical", "Deployment environment is not production", `Current value: ${context.deploymentEnvironment}`);
  if (context.firestoreStatus !== "connected") add("firestore", "critical", "Firestore disconnected", `Current status: ${context.firestoreStatus}`);
  if (!["configured", "connected"].includes(context.storageStatus)) add("storage", "error", "Storage unavailable", `Current status: ${context.storageStatus}`);
  if (context.smtpStatus !== "configured") add("smtp", "error", "SMTP failed or missing", `Current status: ${context.smtpStatus}`);
  if (context.cloudinaryStatus !== "configured") add("cloudinary", "error", "Cloudinary failed or missing", `Current status: ${context.cloudinaryStatus}`);
  if (context.razorpayStatus !== "configured" && !context.razorpayWebhookConfigured) add("razorpay", "warning", "Payment webhook not globally configured", "Razorpay is owner-scoped or missing global webhook settings.");
  if (!context.pushConfigured) add("push", "warning", "Push VAPID key missing", "Browser push cannot be certified until VAPID is configured.");
  const heapUsed = context.memoryUsage?.heapUsedMb ?? 0;
  const heapTotal = context.memoryUsage?.heapTotalMb ?? 0;
  if (heapTotal > 0 && heapUsed / heapTotal > 0.85) add("memory", "warning", "Memory high", `${heapUsed} MB of ${heapTotal} MB heap used.`);
  const load = context.cpuEstimation?.loadAverage?.[0] ?? 0;
  const cores = context.cpuEstimation?.availableParallelism ?? 1;
  if (load / cores > 0.85) add("cpu", "warning", "CPU high", `1-minute load ${load} across ${cores} workers.`);
  if ((context.pendingQueue ?? 0) > 50 || (context.notificationQueue ?? 0) > 100 || (context.kitchenLoad ?? 0) > 50) add("queue", "warning", "Queue backlog", "One or more operational queues exceed warning thresholds.");
  if (slowApi.length) add("api-latency", "warning", "Large API latency", `${slowApi.length} recent API request(s) failed or exceeded 2500 ms.`);
  if (errors.some((entry) => entry.severity === "critical")) add("critical-errors", "critical", "Critical errors recorded", "Open the error monitor for grouped details.");
  if (/disconnect|unavailable|failed/i.test(context.realtimeStatus || "")) add("realtime", "critical", "Realtime disconnected", `Current status: ${context.realtimeStatus}`);
  return alerts;
}

function buildSelfTest(context: MonitoringContext) {
  return [
    test("Firestore", context.firestoreStatus === "connected", context.firestoreStatus),
    test("SMTP", context.smtpStatus === "configured", context.smtpStatus),
    test("Cloudinary", context.cloudinaryStatus === "configured", context.cloudinaryStatus),
    test("Storage", ["configured", "connected"].includes(context.storageStatus), context.storageStatus),
    test("Google OAuth", context.googleOAuthConfigured, context.googleOAuthConfigured ? "configured" : "missing"),
    test("Mapbox", context.mapboxConfigured, context.mapboxConfigured ? "configured" : "missing"),
    test("Payment", context.razorpayStatus === "configured" || context.razorpayStatus === "owner_scoped_or_missing", context.razorpayStatus),
    test("Push", context.pushConfigured, context.pushConfigured ? "configured" : "missing VAPID"),
    test("Realtime", context.firestoreStatus === "connected", context.realtimeStatus || context.firestoreStatus),
    test("API", context.applicationStatus === "ok", `${context.applicationStatus}; ${context.responseTimeMs} ms`),
    test("Environment Variables", context.deploymentEnvironment === "production", context.deploymentEnvironment),
  ];
}

function test(name: string, ok: boolean, detail: string) {
  return { name, status: (ok ? "pass" : "fail") as MonitoringStatus, detail };
}

function readBundleEvidence() {
  try {
    const raw = readFileSync(join(process.cwd(), "reports", "release-candidate", "PRODUCTION_PERFORMANCE_VERIFICATION_REPORT.json"), "utf8");
    const report = JSON.parse(raw) as { checks?: Array<{ name?: string; status?: string; detail?: string }>; sections?: Array<{ title?: string; body?: string }> };
    return {
      checks: (report.checks || []).filter((check) => String(check.name || "").startsWith("bundle:")),
      sections: (report.sections || []).filter((section) => /Bundle|Tracked Routes/i.test(String(section.title || ""))),
    };
  } catch {
    return { checks: [], sections: [] };
  }
}

function filterByRestaurant<T extends { restaurantId?: string }>(entries: T[], restaurantId?: string) {
  if (!restaurantId) return entries.slice(0, limit);
  return entries.filter((entry) => !entry.restaurantId || entry.restaurantId === restaurantId).slice(0, limit);
}

function lastMetric(entries: MonitoringPerformance[], metricName: string) {
  return entries.find((entry) => entry.metricName === metricName || entry.event === metricName) ?? null;
}

function push<T>(entries: T[], entry: T) {
  entries.unshift(entry);
  if (entries.length > limit) entries.length = limit;
}

function store() {
  const scope = globalThis as MonitorGlobal;
  scope[globalKey] ??= { seq: 0, errors: [], logs: [], performance: [] };
  return scope[globalKey];
}

function nextId(prefix: string) {
  const current = store();
  current.seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${current.seq.toString(36)}`;
}

function severityForLevel(level: string): MonitoringSeverity {
  if (level === "SECURITY" || level === "PAYMENT") return "critical";
  if (level === "ERROR") return "error";
  if (level === "WARN") return "warning";
  return "info";
}

function inferErrorSeverity(event: string, message: string): MonitoringSeverity {
  if (/payment|security|auth|webhook|signature/i.test(`${event} ${message}`)) return "critical";
  return "error";
}

function strongerSeverity(left: MonitoringSeverity, right: MonitoringSeverity) {
  const order: Record<MonitoringSeverity, number> = { info: 1, warning: 2, error: 3, critical: 4 };
  return order[right] > order[left] ? right : left;
}

function moduleFromEvent(event: string) {
  const first = event.split(/[.:]/)[0] || "system";
  if (/razorpay|payment/i.test(event)) return "payments";
  if (/firestore|firebase/i.test(event)) return "database";
  if (/smtp|email|otp/i.test(event)) return "auth";
  return first;
}

function moduleFromPath(path: string) {
  if (path.startsWith("/owner")) return "owner";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/api/payments")) return "payments";
  if (path.startsWith("/api/auth")) return "auth";
  if (path.startsWith("/api/owner/kitchen")) return "kitchen";
  if (path.startsWith("/api/owner/pos")) return "pos";
  if (path.startsWith("/api")) return "api";
  return "client";
}

function providerFromEvent(event: string) {
  if (/razorpay|payment/i.test(event)) return "Razorpay";
  if (/cloudinary/i.test(event)) return "Cloudinary";
  if (/smtp|email|otp/i.test(event)) return "SMTP";
  if (/firebase|firestore/i.test(event)) return "Firebase";
  if (/mapbox/i.test(event)) return "Mapbox";
  if (/whatsapp/i.test(event)) return "WhatsApp";
  if (/\bsms\b/i.test(event)) return "SMS";
  if (/push|fcm/i.test(event)) return "Push";
  return undefined;
}

function errorCategory(event: string, message: string) {
  const text = `${event} ${message}`;
  if (/promise|rejection/i.test(text)) return "Unhandled Promise Rejection";
  if (/react|boundary|hydration/i.test(text)) return "React Error Boundary";
  if (/api|\/api\//i.test(text)) return "API failure";
  if (/firestore|firebase/i.test(text)) return "Firestore failure";
  if (/network|fetch|timeout/i.test(text)) return "Network failure";
  if (/auth|otp|session/i.test(text)) return "Authentication failure";
  if (/payment|razorpay/i.test(text)) return "Payment failure";
  if (/printer|print/i.test(text)) return "Printer failure";
  if (/\bqr\b|table-order/i.test(text)) return "QR failure";
  if (/cloudinary|smtp|mapbox|whatsapp|sms|push|provider/i.test(text)) return "Provider failure";
  return "Runtime exception";
}

function sanitizeRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, sensitive.test(key) ? "[masked]" : sanitizeValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return sensitive.test(value) ? "[masked]" : safeText(value, 240);
  if (Array.isArray(value)) return value.slice(0, 10).map(sanitizeValue);
  if (typeof value === "object") return "[object]";
  return undefined;
}

function safeText(value: string, max: number) {
  return value.replace(/\s+/g, " ").slice(0, max);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? safeText(value, 220) : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
