import "server-only";

import crypto from "crypto";
import { resolveTenantId } from "@/lib/tenant";
import { getConfiguredPublicAppUrl } from "@/lib/server/public-app-url";

const defaultTtlDays = 365;

export type TableQrPayload = {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  version: number;
  nonce: string;
  expiresAt?: string;
};

export function createTableQrToken(input: Omit<TableQrPayload, "nonce">) {
  const payload: TableQrPayload = {
    restaurantId: resolveTenantId(input.restaurantId),
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    version: input.version,
    nonce: crypto.randomBytes(18).toString("base64url"),
    expiresAt: input.expiresAt ?? new Date(Date.now() + defaultTtlDays * 24 * 60 * 60_000).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyTableQrToken(token: string) {
  const [body, signature] = token.split(".");
  const expected = sign(body ?? "");
  if (!body || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TableQrPayload;
  } catch {
    return null;
  }
}

export function tableQrUrl(token: string, origin?: string) {
  const base = origin || configuredOrigin();
  return `${base.replace(/\/$/, "")}/order/${token}`;
}

export function requestOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  if (!host) return configuredOrigin();
  const proto = (headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host.split(",")[0].trim()}`;
}

function sign(value: string) {
  return crypto.createHmac("sha256", tableQrSecret()).update(value).digest("base64url");
}

function tableQrSecret() {
  const secret = process.env.TABLE_QR_SECRET || process.env.NEXTAUTH_SECRET || process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "production") {
    throw new Error("TABLE_QR_SECRET is required for production QR signing.");
  }
  return "nammude-table-qr-dev";
}

function configuredOrigin() {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SERVER_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].find((value) => value && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)) || getConfiguredPublicAppUrl();
}
