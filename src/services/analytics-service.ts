export type AnalyticsEvent =
  | "instagram_link_opened"
  | "offer_applied"
  | "checkout_started"
  | "order_created"
  | "order_failed"
  | "api_request"
  | "client_error"
  | "payment_failed"
  | "push_notification"
  | "route_performance"
  | "web_vital"
  | "whatsapp_cta_clicked";

export type AnalyticsPayload = {
  restaurantId?: string;
  restaurantSlug?: string;
  itemId?: string;
  orderId?: string;
  offerCode?: string;
  source?: "web" | "instagram" | "whatsapp" | "pwa";
  route?: string;
  durationMs?: number;
  metricName?: string;
  metricValue?: number;
  metricRating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  error?: string;
  method?: string;
  path?: string;
  status?: number;
  ok?: boolean;
};

export async function trackAnalyticsEvent(
  event: AnalyticsEvent,
  payload: AnalyticsPayload,
) {
  if (typeof window === "undefined") return { event, payload, queued: false };
  sendMonitoringSignal(event, payload);

  const [{ getFirebaseAnalytics }, { logEvent }] = await Promise.all([
    import("@/firebase/client"),
    import("firebase/analytics"),
  ]);
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return { event, payload, queued: false };

  logEvent(analytics, event, payload);
  return { event, payload, queued: true };
}

export async function captureException(error: unknown, context?: Record<string, string | number | boolean | undefined>) {
  const message = error instanceof Error ? error.message : String(error);
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  sendMonitoringSignal("client_error", { ...context, error: message.slice(0, 180) });

  if (!dsn || typeof window === "undefined") {
    if (process.env.NODE_ENV !== "production") console.error(message, context);
    return;
  }

  await sendSentryEnvelope(dsn, {
    message,
    level: "error",
    platform: "javascript",
    timestamp: new Date().toISOString(),
    extra: context,
  }).catch(() => undefined);
}

async function sendSentryEnvelope(dsn: string, event: Record<string, unknown>) {
  const parsed = new URL(dsn);
  const projectId = parsed.pathname.replace("/", "");
  const publicKey = parsed.username;
  const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`;
  const eventId = crypto.randomUUID().replaceAll("-", "");
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({ ...event, event_id: eventId }),
  ].join("\n");

  await fetch(endpoint, {
    method: "POST",
    body: envelope,
    keepalive: true,
  });
}

function sendMonitoringSignal(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const path = typeof payload.path === "string" ? payload.path : window.location.pathname;
  if (String(path).startsWith("/api/monitoring/client")) return;
  const body = JSON.stringify({
    event,
    path: window.location.pathname,
    payload: sanitizeMonitoringPayload(payload),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/monitoring/client", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // Fall back to fetch below.
  }
  void fetch("/api/monitoring/client", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}

function sanitizeMonitoringPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" ? value.replace(/\s+/g, " ").slice(0, 240) : value,
    ]),
  );
}
