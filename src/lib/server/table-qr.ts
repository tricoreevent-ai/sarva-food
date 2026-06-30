import "server-only";

import crypto from "crypto";
import { resolveTenantId } from "@/lib/tenant";

const secret = process.env.TABLE_QR_SECRET || process.env.NEXTAUTH_SECRET || process.env.FIREBASE_ADMIN_PROJECT_ID || "nammude-table-qr-dev";

export type TableQrPayload = {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  version: number;
  nonce: string;
};

export function createTableQrToken(input: Omit<TableQrPayload, "nonce">) {
  const payload: TableQrPayload = {
    restaurantId: resolveTenantId(input.restaurantId),
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    version: input.version,
    nonce: crypto.randomBytes(18).toString("base64url"),
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
  const base = origin || process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base.replace(/\/$/, "")}/order/${token}`;
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}
