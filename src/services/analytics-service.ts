export type AnalyticsEvent =
  | "instagram_link_opened"
  | "offer_applied"
  | "checkout_started"
  | "order_created"
  | "order_failed"
  | "payment_failed"
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
};

export async function trackAnalyticsEvent(
  event: AnalyticsEvent,
  payload: AnalyticsPayload,
) {
  if (typeof window === "undefined") return { event, payload, queued: false };

  const [{ getFirebaseAnalytics }, { logEvent }] = await Promise.all([
    import("@/firebase/client"),
    import("firebase/analytics"),
  ]);
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return { event, payload, queued: false };

  logEvent(analytics, event, payload);
  return { event, payload, queued: true };
}

export async function captureException(error: unknown, context?: Record<string, string>) {
  const message = error instanceof Error ? error.message : String(error);
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

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
