import "server-only";

import nodemailer, { type TransportOptions } from "nodemailer";
import { CMS_COLLECTIONS } from "@/modules/shared/config/environment/cms.config";
import { adminDb } from "@/firebase/admin";
import { productionLogger } from "@/lib/server/production-logger";
import { APP_NAME } from "@/lib/constants";
import type { CmsSettings } from "@/lib/types";

type PublicOutageAlertConfig = {
  enabled: boolean;
  email: string;
};

type PublicOutageAlertState = {
  config?: PublicOutageAlertConfig;
  lastSentAt?: number;
};

const globalForAlerts = globalThis as typeof globalThis & {
  __sarvaPublicOutageAlertState?: PublicOutageAlertState;
};

const ALERT_THROTTLE_MS = 30 * 60 * 1000;

export function rememberPublicOutageAlertConfig(settings?: Partial<CmsSettings>) {
  const state = getAlertState();
  state.config = toAlertConfig(settings);
}

export async function notifyPublicDatabaseFailure(scope: string, error: unknown) {
  try {
    const state = getAlertState();
    const config = state.config ?? await loadAlertConfig();
    if (!config.enabled || !config.email) return;

    const now = Date.now();
    if (state.lastSentAt && now - state.lastSentAt < ALERT_THROTTLE_MS) return;

    const smtp = getSmtpConfig();
    if (!smtp) {
      productionLogger.warn("public-outage-alert.smtp_not_configured", { scope });
      return;
    }

    state.lastSentAt = now;
    const transporter = nodemailer.createTransport(smtp);
    const timestamp = new Date(now).toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${APP_NAME} customer application`;
    const reason = safeErrorReason(error);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: config.email,
      subject: `[${APP_NAME}] Customer database connection issue`,
      text: [
        "The customer application could not load public restaurant data.",
        "",
        `Application: ${appUrl}`,
        `Area: ${scope}`,
        `Detected at: ${timestamp}`,
        `Environment: ${process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "unknown"}`,
        `Server reason: ${reason}`,
        "",
        "This alert is throttled for 30 minutes to avoid repeated emails during the same outage.",
      ].join("\n"),
    });
  } catch (alertError) {
    productionLogger.error("public-outage-alert.send_failed", { scope, reason: safeErrorReason(alertError) });
  }
}

async function loadAlertConfig() {
  const state = getAlertState();
  try {
    const snapshot = await adminDb()
      .collection(CMS_COLLECTIONS.systemSettings)
      .doc(CMS_COLLECTIONS.cmsDocumentId)
      .get();
    const config = toAlertConfig(snapshot.exists ? snapshot.data() as Partial<CmsSettings> : undefined);
    state.config = config;
    return config;
  } catch {
    const config = toAlertConfig();
    state.config = config;
    return config;
  }
}

function toAlertConfig(settings?: Partial<CmsSettings>): PublicOutageAlertConfig {
  return {
    enabled: settings?.operations?.databaseAlertsEnabled ?? true,
    email: settings?.operations?.databaseAlertEmail?.trim() || process.env.DATABASE_ALERT_EMAIL?.trim() || process.env.SMTP_USER?.trim() || "",
  };
}

function getAlertState() {
  globalForAlerts.__sarvaPublicOutageAlertState ??= {};
  return globalForAlerts.__sarvaPublicOutageAlertState;
}

function getSmtpConfig(): TransportOptions | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS;
  const pass = host?.includes("gmail.com") ? rawPass?.replace(/\s+/g, "") : rawPass?.trim();

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass) return null;
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}

function safeErrorReason(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const reason = error instanceof Error ? error.name : typeof error;
  return [reason, code].filter(Boolean).join(":") || "unknown";
}
